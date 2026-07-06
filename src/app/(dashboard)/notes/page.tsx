import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import NotesDashboard from './notes-dashboard';

export default async function NotesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const userId = session.user.id;

  const notes = await db.book.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });

  const serializedNotes = notes.map((n) => ({
    id: n.id,
    title: n.title,
    author: n.author || '',
    totalPages: n.totalPages,
    currentPage: n.currentPage,
    status: n.status,
    notes: n.notes || '',
    updatedAt: n.updatedAt.toISOString(),
  }));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Notes & Code Workspace
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Organize your study guides, write summaries, and execute Javascript snippets in the browser console.
        </p>
      </div>

      <NotesDashboard initialNotes={serializedNotes} />
    </div>
  );
}
