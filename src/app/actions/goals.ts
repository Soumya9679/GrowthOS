'use server';

import db from '@/lib/db';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const calculateXpThreshold = (level: number) => Math.round(100 * Math.pow(level, 1.5));

const goalSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  type: z.enum(['LONG_TERM', 'MONTHLY', 'WEEKLY']),
  parentId: z.string().optional().nullable(),
  progress: z.number().min(0).max(100).default(0),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ABANDONED']).default('ACTIVE'),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
});

export async function createGoal(formData: z.infer<typeof goalSchema>) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  const userId = session.user.id;
  const result = goalSchema.safeParse(formData);
  if (!result.success) return { error: result.error.issues[0].message };

  const { title, description, type, parentId, progress, status, startDate, endDate } = result.data;

  try {
    const goal = await db.goal.create({
      data: {
        userId,
        title,
        description: description || null,
        type,
        parentId: parentId || null,
        progress,
        status,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    if (parentId) {
      await recalculateParentProgress(parentId);
    }

    revalidatePath('/goals');
    revalidatePath('/dashboard');
    return { success: true, goal };
  } catch (err) {
    console.error('❌ Failed to create goal:', err);
    return { error: 'Database transaction failed.' };
  }
}

export async function updateGoal(goalId: string, formData: z.infer<typeof goalSchema>) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  const userId = session.user.id;
  const result = goalSchema.safeParse(formData);
  if (!result.success) return { error: result.error.issues[0].message };

  const { title, description, type, parentId, progress, status, startDate, endDate } = result.data;

  try {
    const existing = await db.goal.findFirst({
      where: { id: goalId, userId },
    });

    if (!existing) return { error: 'Goal not found.' };

    const updated = await db.goal.update({
      where: { id: goalId },
      data: {
        title,
        description: description || null,
        type,
        parentId: parentId || null,
        progress: status === 'COMPLETED' ? 100 : progress,
        status,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    // Cascade progress changes upwards
    if (parentId) {
      await recalculateParentProgress(parentId);
    } else if (existing.parentId && existing.parentId !== parentId) {
      // Re-calculate the old parent as well if the parent changed
      await recalculateParentProgress(existing.parentId);
    }

    revalidatePath('/goals');
    revalidatePath('/dashboard');
    return { success: true, goal: updated };
  } catch (err) {
    console.error('❌ Failed to update goal:', err);
    return { error: 'Database transaction failed.' };
  }
}

export async function updateGoalProgress(goalId: string, progress: number) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  try {
    const goal = await db.goal.update({
      where: { id: goalId },
      data: {
        progress,
        status: progress === 100 ? 'COMPLETED' : 'ACTIVE',
      },
    });

    if (goal.parentId) {
      await recalculateParentProgress(goal.parentId);
    }

    revalidatePath('/goals');
    revalidatePath('/dashboard');
    return { success: true, goal };
  } catch (err) {
    console.error('❌ Failed to update goal progress:', err);
    return { error: 'Database transaction failed.' };
  }
}

export async function deleteGoal(goalId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  const userId = session.user.id;

  try {
    const existing = await db.goal.findFirst({
      where: { id: goalId, userId },
    });

    if (!existing) return { error: 'Goal not found.' };

    await db.goal.delete({
      where: { id: goalId },
    });

    if (existing.parentId) {
      await recalculateParentProgress(existing.parentId);
    }

    revalidatePath('/goals');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    console.error('❌ Failed to delete goal:', err);
    return { error: 'Database transaction failed.' };
  }
}

// Recursively calculates parent OKR progress based on child averages
async function recalculateParentProgress(parentId: string) {
  const parent = await db.goal.findUnique({
    where: { id: parentId },
    include: { subGoals: true },
  });
  if (!parent) return;

  const childCount = parent.subGoals.length;
  if (childCount === 0) return;

  const totalProgress = parent.subGoals.reduce((sum, child) => sum + child.progress, 0);
  const averageProgress = Math.round(totalProgress / childCount);

  const updatedParent = await db.goal.update({
    where: { id: parentId },
    data: {
      progress: averageProgress,
      status: averageProgress === 100 ? 'COMPLETED' : 'ACTIVE',
    },
  });

  if (updatedParent.parentId) {
    await recalculateParentProgress(updatedParent.parentId);
  }
}
