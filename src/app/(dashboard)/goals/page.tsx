import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import GoalsDashboard from './goals-dashboard';

export default async function GoalsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const userId = session.user.id;

  // Query all goals for the user
  const goals = await db.goal.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  const serializedGoals = goals.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description || '',
    type: g.type as 'LONG_TERM' | 'MONTHLY' | 'WEEKLY',
    status: g.status as 'ACTIVE' | 'COMPLETED' | 'ABANDONED',
    progress: g.progress,
    parentId: g.parentId || '',
    startDate: g.startDate ? g.startDate.toISOString() : null,
    endDate: g.endDate ? g.endDate.toISOString() : null,
  }));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Objectives & Key Results (OKR)
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Establish long-term visions, and structure monthly milestones and weekly routines to achieve them.
        </p>
      </div>

      <GoalsDashboard initialGoals={serializedGoals} />
    </div>
  );
}
