import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import JournalDashboard from './journal-dashboard';

export default async function JournalPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const userId = session.user.id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find today's entry
  const todayEntry = await db.journalEntry.findUnique({
    where: {
      userId_date: {
        userId,
        date: today,
      },
    },
  });

  // Find all past entries
  const pastEntries = await db.journalEntry.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
  });

  const serializedTodayEntry = todayEntry
    ? {
        id: todayEntry.id,
        content: todayEntry.content,
        moodScore: todayEntry.moodScore,
        date: todayEntry.date.toISOString(),
      }
    : null;

  const serializedPastEntries = pastEntries.map((e) => ({
    id: e.id,
    content: e.content,
    moodScore: e.moodScore,
    date: e.date.toISOString(),
  }));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Daily Journal & Reflection
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Write daily logs to track your mood changes and review your progress notes.
        </p>
      </div>

      <JournalDashboard
        todayEntry={serializedTodayEntry}
        initialEntries={serializedPastEntries}
      />
    </div>
  );
}
