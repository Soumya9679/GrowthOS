import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import HabitsDashboard from './habits-dashboard';

export default async function HabitsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const userId = session.user.id;

  // Query habits with historical check-in logs
  const habits = await db.habit.findMany({
    where: { userId },
    include: {
      logs: {
        orderBy: { date: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const profile = await db.profile.findUnique({
    where: { userId },
  });

  // Prepare serializable shapes for props
  const serializedHabits = habits.map((h) => ({
    id: h.id,
    name: h.name,
    description: h.description || '',
    frequency: h.frequency,
    logs: h.logs.map((l) => ({
      id: l.id,
      date: l.date.toISOString(),
      completed: l.completed,
    })),
  }));

  const serializedProfile = profile
    ? {
        xp: profile.xp,
        level: profile.level,
        streak: profile.streak,
        streakFreezes: profile.streakFreezes,
      }
    : null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Habits & Consistency Manager
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Form habits, track daily progress, redeem streak freezes, and build level multipliers.
        </p>
      </div>

      <HabitsDashboard 
        initialHabits={serializedHabits} 
        profile={serializedProfile} 
      />
    </div>
  );
}
