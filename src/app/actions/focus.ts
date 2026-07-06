'use server';

import db from '@/lib/db';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const calculateXpThreshold = (level: number) => Math.round(100 * Math.pow(level, 1.5));

const focusSessionSchema = z.object({
  duration: z.number().min(1, 'Duration must be at least 1 minute'),
  category: z.string().min(1, 'Category is required'),
});

export async function logFocusSession(formData: z.infer<typeof focusSessionSchema>) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };
  
  const userId = session.user.id;
  const result = focusSessionSchema.safeParse(formData);
  if (!result.success) return { error: result.error.issues[0].message };

  const { duration, category } = result.data;

  try {
    // 1. Create focus session
    const focusSession = await db.pomodoroSession.create({
      data: {
        userId,
        duration,
        category,
      },
    });

    // 2. Award XP (50 XP for completed Pomodoro cycle)
    const profile = await db.profile.findUnique({ where: { userId } });
    if (!profile) return { error: 'Profile not found.' };

    const xpReward = 50;
    const newXp = profile.xp + xpReward;
    let newLevel = profile.level;
    let leveledUp = false;

    let threshold = calculateXpThreshold(newLevel);
    while (newXp >= threshold) {
      newLevel += 1;
      leveledUp = true;
      threshold = calculateXpThreshold(newLevel);
    }

    await db.profile.update({
      where: { userId },
      data: {
        xp: newXp,
        level: newLevel,
        title: newLevel >= 10 ? 'Elite Scholar' : newLevel >= 5 ? 'Growth Architect' : 'Novice',
      },
    });

    // 3. Write to XP History log
    await db.xPHistory.create({
      data: {
        userId,
        amount: xpReward,
        source: 'POMODORO_SESSION',
      },
    });

    revalidatePath('/focus');
    revalidatePath('/dashboard');
    return { success: true, focusSession, leveledUp, xp: newXp, level: newLevel };
  } catch (err) {
    console.error('❌ Failed to log focus session:', err);
    return { error: 'Database transaction failed.' };
  }
}
