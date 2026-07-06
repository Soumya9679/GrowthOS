'use server';

import db from '@/lib/db';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

interface WidgetLayoutInput {
  widgetId: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  isCollapsed: boolean;
}

export async function updateWidgetLayouts(layouts: WidgetLayoutInput[]) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const userId = session.user.id;

  try {
    // Perform db updates inside a transaction to ensure atomic execution
    await db.$transaction(
      layouts.map((l) =>
        db.widgetLayout.upsert({
          where: {
            userId_widgetId: {
              userId,
              widgetId: l.widgetId,
            },
          },
          update: {
            positionX: l.positionX,
            positionY: l.positionY,
            width: l.width,
            height: l.height,
            isCollapsed: l.isCollapsed,
          },
          create: {
            userId,
            widgetId: l.widgetId,
            positionX: l.positionX,
            positionY: l.positionY,
            width: l.width,
            height: l.height,
            isCollapsed: l.isCollapsed,
          },
        })
      )
    );

    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    console.error('❌ Failed to update widget layouts:', err);
    return { error: 'Database update failed.' };
  }
}
