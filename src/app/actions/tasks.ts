'use server';

import db from '@/lib/db';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const calculateXpThreshold = (level: number) => Math.round(100 * Math.pow(level, 1.5));

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  projectId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

// Award XP based on task priority
const getPriorityXp = (priority: string) => {
  switch (priority) {
    case 'URGENT': return 100;
    case 'HIGH': return 50;
    case 'MEDIUM': return 30;
    case 'LOW': return 15;
    default: return 20;
  }
};

export async function createTask(formData: z.infer<typeof taskSchema>) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };
  
  const userId = session.user.id;
  const result = taskSchema.safeParse(formData);
  if (!result.success) return { error: result.error.issues[0].message };

  const { title, description, status, priority, projectId, dueDate } = result.data;

  try {
    const task = await db.task.create({
      data: {
        userId,
        title,
        description,
        status,
        priority,
        projectId: projectId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    revalidatePath('/tasks');
    return { success: true, task };
  } catch (err) {
    console.error('❌ Failed to create task:', err);
    return { error: 'Database transaction failed.' };
  }
}

export async function updateTaskStatus(taskId: string, status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE') {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };
  
  const userId = session.user.id;

  try {
    const existingTask = await db.task.findFirst({
      where: { id: taskId, userId },
    });

    if (!existingTask) return { error: 'Task not found.' };
    if (existingTask.status === status) return { success: true };

    const wasDone = existingTask.status === 'DONE';
    const isNowDone = status === 'DONE';

    const updatedTask = await db.task.update({
      where: { id: taskId },
      data: { status },
    });

    // Gamification: Award XP on completion, deduct on unchecking
    if (isNowDone && !wasDone) {
      const xpGained = getPriorityXp(existingTask.priority);
      await awardXp(userId, xpGained, 'TASK_COMPLETION');
    } else if (wasDone && !isNowDone) {
      const xpLost = -getPriorityXp(existingTask.priority);
      await awardXp(userId, xpLost, 'TASK_COMPLETION');
    }

    revalidatePath('/tasks');
    revalidatePath('/dashboard');
    return { success: true, task: updatedTask };
  } catch (err) {
    console.error('❌ Failed to update task status:', err);
    return { error: 'Database transaction failed.' };
  }
}

export async function updateTask(taskId: string, formData: z.infer<typeof taskSchema>) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };
  
  const userId = session.user.id;
  const result = taskSchema.safeParse(formData);
  if (!result.success) return { error: result.error.issues[0].message };

  const { title, description, status, priority, projectId, dueDate } = result.data;

  try {
    const existingTask = await db.task.findFirst({
      where: { id: taskId, userId },
    });

    if (!existingTask) return { error: 'Task not found.' };

    const wasDone = existingTask.status === 'DONE';
    const isNowDone = status === 'DONE';

    const updatedTask = await db.task.update({
      where: { id: taskId },
      data: {
        title,
        description,
        status,
        priority,
        projectId: projectId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    // Handle XP recalculation if status toggled during edit
    if (isNowDone && !wasDone) {
      const xpGained = getPriorityXp(priority);
      await awardXp(userId, xpGained, 'TASK_COMPLETION');
    } else if (wasDone && !isNowDone) {
      const xpLost = -getPriorityXp(existingTask.priority);
      await awardXp(userId, xpLost, 'TASK_COMPLETION');
    }

    revalidatePath('/tasks');
    revalidatePath('/dashboard');
    return { success: true, task: updatedTask };
  } catch (err) {
    console.error('❌ Failed to update task:', err);
    return { error: 'Database transaction failed.' };
  }
}

export async function deleteTask(taskId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };
  
  const userId = session.user.id;

  try {
    const existingTask = await db.task.findFirst({
      where: { id: taskId, userId },
    });

    if (!existingTask) return { error: 'Task not found.' };

    // Deduct XP if deleting a completed task
    if (existingTask.status === 'DONE') {
      const xpLost = -getPriorityXp(existingTask.priority);
      await awardXp(userId, xpLost, 'TASK_COMPLETION');
    }

    await db.task.delete({
      where: { id: taskId },
    });

    revalidatePath('/tasks');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    console.error('❌ Failed to delete task:', err);
    return { error: 'Database transaction failed.' };
  }
}

export async function createSubtask(taskId: string, title: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  if (!title.trim()) return { error: 'Title is required' };

  try {
    const subtask = await db.subTask.create({
      data: {
        taskId,
        title,
        isCompleted: false,
      },
    });

    revalidatePath('/tasks');
    return { success: true, subtask };
  } catch (err) {
    console.error('❌ Failed to create subtask:', err);
    return { error: 'Database transaction failed.' };
  }
}

export async function toggleSubtask(subtaskId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  try {
    const existing = await db.subTask.findUnique({
      where: { id: subtaskId },
    });

    if (!existing) return { error: 'Subtask not found.' };

    const updated = await db.subTask.update({
      where: { id: subtaskId },
      data: {
        isCompleted: !existing.isCompleted,
      },
    });

    revalidatePath('/tasks');
    return { success: true, subtask: updated };
  } catch (err) {
    console.error('❌ Failed to toggle subtask:', err);
    return { error: 'Database transaction failed.' };
  }
}

export async function deleteSubtask(subtaskId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  try {
    await db.subTask.delete({
      where: { id: subtaskId },
    });

    revalidatePath('/tasks');
    return { success: true };
  } catch (err) {
    console.error('❌ Failed to delete subtask:', err);
    return { error: 'Database transaction failed.' };
  }
}

// Helper to award XP and handle profile level calculations
async function awardXp(userId: string, xpAmount: number, source: string) {
  const profile = await db.profile.findUnique({ where: { userId } });
  if (!profile) return;

  const newXp = Math.max(0, profile.xp + xpAmount);
  let newLevel = profile.level;

  if (xpAmount > 0) {
    let threshold = calculateXpThreshold(newLevel);
    while (newXp >= threshold) {
      newLevel += 1;
      threshold = calculateXpThreshold(newLevel);
    }
  } else {
    let prevThreshold = calculateXpThreshold(newLevel - 1);
    while (newLevel > 1 && newXp < prevThreshold) {
      newLevel -= 1;
      prevThreshold = calculateXpThreshold(newLevel - 1);
    }
  }

  await db.profile.update({
    where: { userId },
    data: {
      xp: newXp,
      level: newLevel,
      title: newLevel >= 10 ? 'Elite Scholar' : newLevel >= 5 ? 'Growth Architect' : 'Novice',
    },
  });

  if (xpAmount > 0) {
    await db.xPHistory.create({
      data: {
        userId,
        amount: xpAmount,
        source,
      },
    });
  } else {
    // Delete latest matching XP history log
    const row = await db.xPHistory.findFirst({
      where: { userId, source },
      orderBy: { createdAt: 'desc' },
    });
    if (row) {
      await db.xPHistory.delete({ where: { id: row.id } });
    }
  }
}
