import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import PlannerDashboard from './planner-dashboard';

export default async function PlannerPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const userId = session.user.id;

  const startOfToday = new Date();
  startOfToday.setHours(0,0,0,0);
  
  const endOfToday = new Date();
  endOfToday.setHours(23,59,59,999);

  // Fetch all time blocks scheduled for today
  const blocks = await db.timeBlock.findMany({
    where: {
      userId,
      startTime: {
        gte: startOfToday,
        lte: endOfToday,
      },
    },
    orderBy: { startTime: 'asc' },
  });

  const serializedBlocks = blocks.map((b) => ({
    id: b.id,
    title: b.title,
    startTime: b.startTime.toISOString(),
    endTime: b.endTime.toISOString(),
    color: b.color,
    notes: b.notes || '',
  }));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Daily Time-Block Planner
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Schedule your day in hourly increments. Align task blocks side-by-side with your calendars.
        </p>
      </div>

      <PlannerDashboard initialBlocks={serializedBlocks} />
    </div>
  );
}
