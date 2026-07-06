import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import AnalyticsDashboard from './analytics-dashboard';

export default async function AnalyticsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const userId = session.user.id;
  const now = new Date();
  
  const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(now.getDate() - n);
    d.setHours(0,0,0,0);
    return d;
  };

  // 1. Fetch Analytics snapshots
  const snapshots = await db.analyticsSnapshot.findMany({
    where: { userId },
    orderBy: { date: 'asc' },
  });

  // 2. Fetch recent focus sessions
  const focusSessions = await db.pomodoroSession.findMany({
    where: {
      userId,
      createdAt: { gte: daysAgo(7) },
    },
  });

  // 3. Fetch task completion stats
  const completedTasksCount = await db.task.count({
    where: { userId, status: 'DONE' },
  });
  const pendingTasksCount = await db.task.count({
    where: { userId, NOT: { status: 'DONE' } },
  });

  // 4. Fetch habits count
  const habitsCount = await db.habit.count({ where: { userId } });
  const habitsLogCount = await db.habitLog.count({
    where: {
      habit: { userId },
      date: { gte: daysAgo(7) },
    },
  });

  // 5. Fetch DSA count
  const dsaProblemsCount = await db.dSASubmission.count({ where: { userId } });

  // 6. Compute weekly focus minutes by day
  const weeklyFocusData = Array.from({ length: 7 }).map((_, idx) => {
    const targetDate = daysAgo(6 - idx);
    const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'short' });
    
    const minutes = focusSessions
      .filter((s) => {
        const sessionDate = new Date(s.createdAt);
        return (
          sessionDate.getDate() === targetDate.getDate() &&
          sessionDate.getMonth() === targetDate.getMonth() &&
          sessionDate.getFullYear() === targetDate.getFullYear()
        );
      })
      .reduce((acc, curr) => acc + curr.duration, 0);

    return {
      day: dayName,
      minutes,
    };
  });

  // Serialize datasets
  const serializedSnapshots = snapshots.map((s) => ({
    date: s.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    focusScore: s.overallFocusScore,
    velocity: s.learningVelocity,
    burnout: s.burnoutRisk,
  }));

  // Fallback default snapshots if empty
  const finalSnapshots = serializedSnapshots.length > 0 ? serializedSnapshots : [
    { date: 'Jul 2', focusScore: 75, velocity: 1.2, burnout: 15 },
    { date: 'Jul 3', focusScore: 80, velocity: 1.4, burnout: 20 },
    { date: 'Jul 4', focusScore: 88, velocity: 1.6, burnout: 25 },
    { date: 'Jul 5', focusScore: 82, velocity: 1.5, burnout: 22 },
  ];

  const stats = {
    completedTasksCount,
    pendingTasksCount,
    habitsCount,
    weeklyHabitCheckIns: habitsLogCount,
    dsaProblemsCount,
    weeklyFocusData,
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Growth Analytics & Statistics
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Visualize your cognitive velocity, focus trends, task completion rates, and burnout indexes.
        </p>
      </div>

      <AnalyticsDashboard
        snapshots={finalSnapshots}
        stats={stats}
      />
    </div>
  );
}
