'use server';

import db from '@/lib/db';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const preferenceSchema = z.object({
  theme: z.string(),
  notificationsEnabled: z.boolean(),
  pomodoroWorkDuration: z.number().min(5).max(120),
  pomodoroBreakDuration: z.number().min(1).max(30),
  soundVolume: z.number().min(0).max(100),
  weatherCity: z.string().optional().nullable(),
});

const profileSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty'),
  bio: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
});

export async function savePreferences(formData: z.infer<typeof preferenceSchema>) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  const userId = session.user.id;
  const result = preferenceSchema.safeParse(formData);
  if (!result.success) return { error: result.error.issues[0].message };

  const { theme, notificationsEnabled, pomodoroWorkDuration, pomodoroBreakDuration, soundVolume, weatherCity } = result.data;

  try {
    await db.userPreference.upsert({
      where: { userId },
      update: {
        theme,
        notificationsEnabled,
        pomodoroWorkDuration,
        pomodoroBreakDuration,
        soundVolume,
        weatherCity: weatherCity || null,
      },
      create: {
        userId,
        theme,
        notificationsEnabled,
        pomodoroWorkDuration,
        pomodoroBreakDuration,
        soundVolume,
        weatherCity: weatherCity || null,
      },
    });

    revalidatePath('/settings');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    console.error('❌ Failed to update preferences:', err);
    return { error: 'Database transaction failed.' };
  }
}

export async function saveProfile(formData: z.infer<typeof profileSchema>) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  const userId = session.user.id;
  const result = profileSchema.safeParse(formData);
  if (!result.success) return { error: result.error.issues[0].message };

  const { name, bio, avatarUrl } = result.data;

  try {
    // Update user name
    await db.user.update({
      where: { id: userId },
      data: { name },
    });

    // Update profile
    await db.profile.update({
      where: { userId },
      data: {
        bio: bio || null,
        avatarUrl: avatarUrl || null,
      },
    });

    revalidatePath('/settings');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    console.error('❌ Failed to update profile:', err);
    return { error: 'Database transaction failed.' };
  }
}
