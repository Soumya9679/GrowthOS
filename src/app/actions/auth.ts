'use server';

import db from '@/lib/db';
import { pbkdf2Sync } from 'crypto';
import { z } from 'zod';

function hashPassword(password: string): string {
  const salt = 'growthos_demo_salt';
  const hash = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function registerUser(formData: z.infer<typeof registerSchema>) {
  // Validate input schemas
  const result = registerSchema.safeParse(formData);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { name, email, password } = result.data;

  try {
    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { error: 'This email is already registered.' };
    }

    const hashedPassword = hashPassword(password);

    // Create user along with profile and preference records
    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        profile: {
          create: {
            xp: 100,
            level: 1,
            streak: 0,
            title: 'Novice',
          },
        },
        preference: {
          create: {
            theme: 'dark-default',
            sidebarOpen: true,
          },
        },
      },
    });

    // Seed default widget layout for this user so they have a working dashboard instantly!
    const defaultWidgets = [
      { id: 'greeting', x: 0, y: 0, w: 12, h: 2 },
      { id: 'stats', x: 0, y: 2, w: 8, h: 2 },
      { id: 'streak', x: 8, y: 2, w: 4, h: 2 },
      { id: 'ai-coach', x: 0, y: 4, w: 8, h: 4 },
      { id: 'pomodoro', x: 8, y: 4, w: 4, h: 4 },
      { id: 'agenda', x: 0, y: 8, w: 7, h: 6 },
      { id: 'habits', x: 7, y: 8, w: 5, h: 6 },
      { id: 'heatmap', x: 0, y: 14, w: 12, h: 3 },
    ];

    await db.widgetLayout.createMany({
      data: defaultWidgets.map((w) => ({
        userId: user.id,
        widgetId: w.id,
        positionX: w.x,
        positionY: w.y,
        width: w.w,
        height: w.h,
      })),
    });

    return { success: true };
  } catch (err: any) {
    console.error('❌ Registration error:', err);
    return { error: 'Something went wrong during account creation.' };
  }
}
