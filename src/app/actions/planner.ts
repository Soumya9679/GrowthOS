'use server';

import db from '@/lib/db';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const timeBlockSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  color: z.string().default('#6366f1'),
  notes: z.string().optional().nullable(),
});

export async function createTimeBlock(formData: z.infer<typeof timeBlockSchema>) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };
  
  const userId = session.user.id;
  const result = timeBlockSchema.safeParse(formData);
  if (!result.success) return { error: result.error.issues[0].message };

  const { title, startTime, endTime, color, notes } = result.data;

  try {
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return { error: 'Start time must be strictly before end time.' };
    }

    const block = await db.timeBlock.create({
      data: {
        userId,
        title,
        startTime: start,
        endTime: end,
        color,
        notes: notes || null,
      },
    });

    revalidatePath('/planner');
    revalidatePath('/dashboard');
    return { success: true, block };
  } catch (err) {
    console.error('❌ Failed to create time block:', err);
    return { error: 'Database transaction failed.' };
  }
}

export async function updateTimeBlock(blockId: string, formData: z.infer<typeof timeBlockSchema>) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };
  
  const userId = session.user.id;
  const result = timeBlockSchema.safeParse(formData);
  if (!result.success) return { error: result.error.issues[0].message };

  const { title, startTime, endTime, color, notes } = result.data;

  try {
    const existing = await db.timeBlock.findFirst({
      where: { id: blockId, userId },
    });

    if (!existing) return { error: 'Time block not found.' };

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return { error: 'Start time must be strictly before end time.' };
    }

    const updated = await db.timeBlock.update({
      where: { id: blockId },
      data: {
        title,
        startTime: start,
        endTime: end,
        color,
        notes: notes || null,
      },
    });

    revalidatePath('/planner');
    revalidatePath('/dashboard');
    return { success: true, block: updated };
  } catch (err) {
    console.error('❌ Failed to update time block:', err);
    return { error: 'Database transaction failed.' };
  }
}

export async function deleteTimeBlock(blockId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };
  
  const userId = session.user.id;

  try {
    const existing = await db.timeBlock.findFirst({
      where: { id: blockId, userId },
    });

    if (!existing) return { error: 'Time block not found.' };

    await db.timeBlock.delete({
      where: { id: blockId },
    });

    revalidatePath('/planner');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    console.error('❌ Failed to delete time block:', err);
    return { error: 'Database transaction failed.' };
  }
}
