'use server';

import db from '@/lib/db';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const calculateXpThreshold = (level: number) => Math.round(100 * Math.pow(level, 1.5));

const journalSchema = z.object({
  content: z.string().min(1, 'Journal content cannot be empty'),
  moodScore: z.number().min(1).max(5),
});

export async function saveJournalEntry(formData: z.infer<typeof journalSchema>) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  const userId = session.user.id;
  const result = journalSchema.safeParse(formData);
  if (!result.success) return { error: result.error.issues[0].message };

  const { content, moodScore } = result.data;
  
  // Normalize date to today at midnight (YYYY-MM-DD 00:00:00)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    // 1. Check if entry already exists for today
    const existing = await db.journalEntry.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    if (existing) {
      // Update today's entry
      await db.journalEntry.update({
        where: { id: existing.id },
        data: {
          content,
          moodScore,
        },
      });
      
      revalidatePath('/journal');
      revalidatePath('/dashboard');
      return { success: true, updated: true };
    } else {
      // Create new entry for today
      await db.journalEntry.create({
        data: {
          userId,
          content,
          moodScore,
          date: today,
        },
      });

      // Award +30 XP for today's reflection log
      const profile = await db.profile.findUnique({ where: { userId } });
      if (profile) {
        const newXp = profile.xp + 30;
        let newLevel = profile.level;

        let threshold = calculateXpThreshold(newLevel);
        while (newXp >= threshold) {
          newLevel += 1;
          threshold = calculateXpThreshold(newLevel);
        }

        await db.profile.update({
          where: { userId },
          data: {
            xp: newXp,
            level: newLevel,
            title: newLevel >= 10 ? 'Elite Scholar' : newLevel >= 5 ? 'Growth Architect' : profile.title,
          },
        });

        // Log XP
        await db.xPHistory.create({
          data: {
            userId,
            amount: 30,
            source: 'JOURNAL_REFLECTION',
          },
        });
      }

      revalidatePath('/journal');
      revalidatePath('/dashboard');
      return { success: true, created: true };
    }
  } catch (err) {
    console.error('❌ Failed to save journal entry:', err);
    return { error: 'Database transaction failed.' };
  }
}
