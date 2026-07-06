'use server';

import db from '@/lib/db';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

// Calculate XP thresholds: XP_threshold = 100 * level^1.5
const calculateXpThreshold = (level: number) => Math.round(100 * Math.pow(level, 1.5));

export async function toggleHabit(habitId: string, dateStr: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const userId = session.user.id;
  const logDate = new Date(dateStr);
  logDate.setHours(0, 0, 0, 0);

  try {
    // 1. Verify habit belongs to user
    const habit = await db.habit.findUnique({
      where: { id: habitId, userId },
    });

    if (!habit) {
      return { error: 'Habit not found.' };
    }

    // 2. Check if already completed
    const existingLog = await db.habitLog.findUnique({
      where: {
        habitId_date: {
          habitId,
          date: logDate,
        },
      },
    });

    let xpGained = 0;
    let isCompleted = false;

    if (existingLog) {
      // Uncheck habit
      await db.habitLog.delete({
        where: { id: existingLog.id },
      });
      xpGained = -20;
      isCompleted = false;
    } else {
      // Check habit
      await db.habitLog.create({
        data: {
          habitId,
          date: logDate,
          completed: true,
        },
      });
      xpGained = 20;
      isCompleted = true;
    }

    // 3. Update XP and Levels inside user profile
    const profile = await db.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return { error: 'Profile not found.' };
    }

    let newXp = Math.max(0, profile.xp + xpGained);
    let newLevel = profile.level;
    let leveledUp = false;

    // Check level up (ascending check)
    if (xpGained > 0) {
      let threshold = calculateXpThreshold(newLevel);
      while (newXp >= threshold) {
        newLevel += 1;
        leveledUp = true;
        threshold = calculateXpThreshold(newLevel);
      }
    } else {
      // Check level down (descending check - optional but keeps sync)
      let prevThreshold = calculateXpThreshold(newLevel - 1);
      while (newLevel > 1 && newXp < prevThreshold) {
        newLevel -= 1;
        prevThreshold = calculateXpThreshold(newLevel - 1);
      }
    }

    // Update Profile
    await db.profile.update({
      where: { userId },
      data: {
        xp: newXp,
        level: newLevel,
        title: newLevel >= 10 ? 'Elite Scholar' : newLevel >= 5 ? 'Growth Architect' : 'Novice',
      },
    });

    // Write to XP History log if checked
    if (xpGained > 0) {
      await db.xPHistory.create({
        data: {
          userId,
          amount: xpGained,
          source: 'HABIT_COMPLETION',
        },
      });
    } else {
      // Clean up the history log
      const historyRow = await db.xPHistory.findFirst({
        where: { userId, source: 'HABIT_COMPLETION' },
        orderBy: { createdAt: 'desc' },
      });
      if (historyRow) {
        await db.xPHistory.delete({ where: { id: historyRow.id } });
      }
    }

    // 4. Update Streaks based on daily habit completions
    // Fetch all user habits
    const habits = await db.habit.findMany({ where: { userId } });
    
    // Fetch all logs for today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayLogs = await db.habitLog.findMany({
      where: {
        habit: { userId },
        date: startOfToday,
      },
    });

    // If they checked off all habits, update streak
    if (habits.length > 0 && todayLogs.length === habits.length) {
      // Verify if they've active logs yesterday to increment, or just set today
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const yesterdayLogs = await db.habitLog.findMany({
        where: {
          habit: { userId },
          date: yesterday,
        },
      });

      // If they had logged all habits yesterday too, increment streak
      let currentStreak = profile.streak;
      if (yesterdayLogs.length === habits.length) {
        currentStreak = profile.streak === 0 ? 1 : profile.streak;
        // If they did it yesterday, and checked today's last habit now, increment
        if (profile.lastActive.getTime() < startOfToday.getTime()) {
          currentStreak += 1;
        }
      } else {
        currentStreak = 1; // Started new streak
      }

      await db.profile.update({
        where: { userId },
        data: {
          streak: currentStreak,
          longestStreak: Math.max(profile.longestStreak, currentStreak),
          lastActive: new Date(),
        },
      });
    }

    revalidatePath('/dashboard');
    return { success: true, isCompleted, xp: newXp, level: newLevel, leveledUp };
  } catch (err: any) {
    console.error('❌ Failed to toggle habit:', err);
    return { error: 'Transaction failed.' };
  }
}

export async function createHabit(name: string, description?: string | null, frequency = 'DAILY') {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const userId = session.user.id;

  try {
    const habit = await db.habit.create({
      data: {
        userId,
        name,
        description: description || null,
        frequency,
      },
    });

    revalidatePath('/habits');
    revalidatePath('/dashboard');
    return { success: true, habit };
  } catch (err) {
    console.error('❌ Failed to create habit:', err);
    return { error: 'Database transaction failed.' };
  }
}

export async function updateHabit(habitId: string, name: string, description?: string | null, frequency = 'DAILY') {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const userId = session.user.id;

  try {
    const existing = await db.habit.findFirst({
      where: { id: habitId, userId },
    });

    if (!existing) {
      return { error: 'Habit not found.' };
    }

    const updated = await db.habit.update({
      where: { id: habitId },
      data: {
        name,
        description: description || null,
        frequency,
      },
    });

    revalidatePath('/habits');
    revalidatePath('/dashboard');
    return { success: true, habit: updated };
  } catch (err) {
    console.error('❌ Failed to update habit:', err);
    return { error: 'Database transaction failed.' };
  }
}

export async function deleteHabit(habitId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const userId = session.user.id;

  try {
    const existing = await db.habit.findFirst({
      where: { id: habitId, userId },
    });

    if (!existing) {
      return { error: 'Habit not found.' };
    }

    await db.habit.delete({
      where: { id: habitId },
    });

    revalidatePath('/habits');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    console.error('❌ Failed to delete habit:', err);
    return { error: 'Database transaction failed.' };
  }
}

export async function redeemStreakFreeze() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const userId = session.user.id;

  try {
    const profile = await db.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return { error: 'Profile not found.' };
    }

    if (profile.xp < 200) {
      return { error: 'Insufficient XP. You need at least 200 XP to redeem a Streak Freeze.' };
    }

    const updatedXp = profile.xp - 200;
    
    // Recalculate level down if XP boundary crossed
    let newLevel = profile.level;
    let prevThreshold = calculateXpThreshold(newLevel - 1);
    while (newLevel > 1 && updatedXp < prevThreshold) {
      newLevel -= 1;
      prevThreshold = calculateXpThreshold(newLevel - 1);
    }

    await db.profile.update({
      where: { userId },
      data: {
        xp: updatedXp,
        level: newLevel,
        streakFreezes: profile.streakFreezes + 1,
        title: newLevel >= 10 ? 'Elite Scholar' : newLevel >= 5 ? 'Growth Architect' : 'Novice',
      },
    });

    // Log the transaction in XP history
    await db.xPHistory.create({
      data: {
        userId,
        amount: -200,
        source: 'STREAK_FREEZE_REDEEM',
      },
    });

    revalidatePath('/habits');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    console.error('❌ Failed to redeem streak freeze:', err);
    return { error: 'Database transaction failed.' };
  }
}
