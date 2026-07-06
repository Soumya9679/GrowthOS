'use server';

import db from '@/lib/db';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { calculateSM2 } from '@/lib/sm2';
import { z } from 'zod';

const calculateXpThreshold = (level: number) => Math.round(100 * Math.pow(level, 1.5));

const cardGradeSchema = z.object({
  cardId: z.string().min(1),
  grade: z.number().min(0).max(5),
});

export async function submitFlashcardGrade(formData: z.infer<typeof cardGradeSchema>) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  const userId = session.user.id;
  const result = cardGradeSchema.safeParse(formData);
  if (!result.success) return { error: result.error.issues[0].message };

  const { cardId, grade } = result.data;

  try {
    const card = await db.flashcard.findUnique({
      where: { id: cardId },
    });

    if (!card) return { error: 'Card not found.' };

    // Calculate new SM-2 values
    const { ease, repetitions, interval } = calculateSM2(
      card.ease,
      card.repetitions,
      card.interval,
      grade
    );

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);
    nextReviewDate.setHours(0, 0, 0, 0);

    // Update Flashcard in database
    await db.flashcard.update({
      where: { id: cardId },
      data: {
        ease,
        repetitions,
        interval,
        nextReview: nextReviewDate,
      },
    });

    // Award 10 XP for studying
    const profile = await db.profile.findUnique({ where: { userId } });
    if (profile) {
      const xpReward = 10;
      const newXp = profile.xp + xpReward;
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
          title: newLevel >= 10 ? 'Elite Scholar' : newLevel >= 5 ? 'Growth Architect' : 'Novice',
        },
      });

      // Write to XP History log
      await db.xPHistory.create({
        data: {
          userId,
          amount: xpReward,
          source: 'FLASHCARD_REVIEW',
        },
      });
    }

    revalidatePath('/study');
    revalidatePath('/dashboard');
    return { success: true, interval, repetitions };
  } catch (err) {
    console.error('❌ Failed to process flashcard review:', err);
    return { error: 'Database transaction failed.' };
  }
}

export async function createSubject(name: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  const userId = session.user.id;
  if (!name.trim()) return { error: 'Subject name is required' };

  try {
    const subject = await db.subject.create({
      data: {
        userId,
        name,
      },
    });

    revalidatePath('/study');
    return { success: true, subject };
  } catch (err) {
    console.error('❌ Failed to create subject:', err);
    return { error: 'Database transaction failed.' };
  }
}

export async function createTopic(subjectId: string, name: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  if (!name.trim()) return { error: 'Topic name is required' };

  try {
    const topic = await db.topic.create({
      data: {
        subjectId,
        name,
      },
    });

    revalidatePath('/study');
    return { success: true, topic };
  } catch (err) {
    console.error('❌ Failed to create topic:', err);
    return { error: 'Database transaction failed.' };
  }
}

export async function createFlashcard(topicId: string, front: string, back: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  if (!front.trim() || !back.trim()) return { error: 'Front and Back content are required' };

  try {
    const card = await db.flashcard.create({
      data: {
        topicId,
        front,
        back,
        ease: 2.5,
        repetitions: 0,
        interval: 0,
        nextReview: new Date(),
      },
    });

    revalidatePath('/study');
    return { success: true, card };
  } catch (err) {
    console.error('❌ Failed to create flashcard:', err);
    return { error: 'Database transaction failed.' };
  }
}
