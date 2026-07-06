import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import FocusDashboard from './focus-dashboard';

export default async function FocusPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const userId = session.user.id;

  const startOfToday = new Date();
  startOfToday.setHours(0,0,0,0);

  // 1. Fetch Today's Sessions
  const todaySessions = await db.pomodoroSession.findMany({
    where: {
      userId,
      createdAt: {
        gte: startOfToday,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // 2. Fetch Sessions from Past 7 Days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0,0,0,0);

  const pastWeekSessions = await db.pomodoroSession.findMany({
    where: {
      userId,
      createdAt: {
        gte: sevenDaysAgo,
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const serializedToday = todaySessions.map((s) => ({
    id: s.id,
    duration: s.duration,
    category: s.category,
    createdAt: s.createdAt.toISOString(),
  }));

  const serializedWeekly = pastWeekSessions.map((s) => ({
    id: s.id,
    duration: s.duration,
    category: s.category,
    createdAt: s.createdAt.toISOString(),
  }));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Study Focus Room
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Enter deep concentration blocks. Synthesize offline ambient static and accumulate study experience points.
        </p>
      </div>

      <FocusDashboard 
        todaySessions={serializedToday} 
        pastWeekSessions={serializedWeekly} 
      />
    </div>
  );
}
