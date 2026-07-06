'use server';

import db from '@/lib/db';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const noteSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty'),
  author: z.string().optional().nullable(),
});

export async function createNoteDocument(formData: z.infer<typeof noteSchema>) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  const userId = session.user.id;
  const result = noteSchema.safeParse(formData);
  if (!result.success) return { error: result.error.issues[0].message };

  const { title, author } = result.data;

  try {
    const newNote = await db.book.create({
      data: {
        userId,
        title,
        author: author || 'Unknown author',
        totalPages: 200,
        currentPage: 0,
        status: 'READING',
        notes: '### Reflection notes\nStart writing notes here...',
      },
    });

    revalidatePath('/notes');
    return { success: true, noteId: newNote.id };
  } catch (err) {
    console.error('❌ Failed to create note:', err);
    return { error: 'Database transaction failed.' };
  }
}

export async function saveNoteContent(id: string, notesText: string, currentPage: number) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  try {
    const existing = await db.book.findUnique({ where: { id } });
    if (!existing) return { error: 'Note document not found.' };

    await db.book.update({
      where: { id },
      data: {
        notes: notesText,
        currentPage: Math.min(existing.totalPages, Math.max(0, currentPage)),
        status: currentPage >= existing.totalPages ? 'COMPLETED' : 'READING',
      },
    });

    revalidatePath('/notes');
    return { success: true };
  } catch (err) {
    console.error('❌ Failed to update note:', err);
    return { error: 'Database transaction failed.' };
  }
}
