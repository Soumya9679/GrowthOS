import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import GreetingWidget from './greeting-widget';
import StatsWidget from './stats-widget';
import AIBriefWidget from './ai-brief-widget';
import PomodoroWidget from '@/components/dashboard/pomodoro-widget';
import AgendaWidget from './agenda-widget';
import HabitsWidget from '@/components/dashboard/habits-widget';
import HeatmapWidget from './heatmap-widget';
import DashboardGridEditor from './grid-editor';

export default async function DashboardPage() {
  const session = await auth();

  // Redirect if not logged in
  if (!session?.user?.id) {
    redirect('/login');
  }

  const userId = session.user.id;

  // 1. Fetch User Profile
  const profile = await db.profile.findUnique({
    where: { userId },
  });

  const preference = await db.userPreference.findUnique({
    where: { userId },
  });

  // 2. Fetch Widget Layouts
  const dbLayouts = await db.widgetLayout.findMany({
    where: { userId },
  });

  // 3. Fetch Habits for Today
  const habits = await db.habit.findMany({
    where: { userId },
    include: {
      logs: {
        where: {
          date: {
            gte: new Date(new Date().setHours(0,0,0,0)),
          },
        },
      },
    },
  });

  // 4. Fetch Timeblocks for Today
  const startOfToday = new Date();
  startOfToday.setHours(0,0,0,0);
  const endOfToday = new Date();
  endOfToday.setHours(23,59,59,999);

  const timeBlocks = await db.timeBlock.findMany({
    where: {
      userId,
      startTime: {
        gte: startOfToday,
        lte: endOfToday,
      },
    },
  });

  // 5. Fetch Key Stats
  // Tasks completed vs total today
  const tasks = await db.task.findMany({
    where: { userId },
  });

  const tasksDoneCount = tasks.filter((t) => t.status === 'DONE').length;
  const tasksTotalCount = tasks.length;

  // Focus time today (Pomodoro minutes)
  const pomodoroSessions = await db.pomodoroSession.findMany({
    where: {
      userId,
      createdAt: {
        gte: startOfToday,
      },
    },
  });
  const focusMinutesToday = pomodoroSessions.reduce((acc, curr) => acc + curr.duration, 0);

  // XP Gained Today
  const xpLogsToday = await db.xPHistory.findMany({
    where: {
      userId,
      createdAt: {
        gte: startOfToday,
      },
    },
  });
  const xpGainedToday = xpLogsToday.reduce((acc, curr) => acc + curr.amount, 0);

  // Due flashcards count
  const dueCardsCount = await db.flashcard.count({
    where: {
      topic: {
        subject: {
          userId,
        },
      },
      nextReview: {
        lte: new Date(),
      },
    },
  });

  // 6. Generate Heatmap Activity Log details (last 365 days)
  const oneYearAgo = new Date();
  oneYearAgo.setDate(oneYearAgo.getDate() - 365);

  // Fetch habit logs in the past year
  const habitLogs = await db.habitLog.findMany({
    where: {
      habit: { userId },
      date: { gte: oneYearAgo },
    },
  });

  // Fetch tasks completed in the past year
  const completedTasksLogs = await db.task.findMany({
    where: {
      userId,
      status: 'DONE',
      updatedAt: { gte: oneYearAgo },
    },
  });

  // Fetch journal entries in the past year
  const journalLogs = await db.journalEntry.findMany({
    where: {
      userId,
      date: { gte: oneYearAgo },
    },
  });

  // Compile overall activity counts grouped by date
  const activityMap: Record<string, number> = {};

  const incrementMap = (date: Date) => {
    const key = date.toISOString().split('T')[0];
    activityMap[key] = (activityMap[key] || 0) + 1;
  };

  habitLogs.forEach((hl) => incrementMap(hl.date));
  completedTasksLogs.forEach((tl) => incrementMap(tl.updatedAt));
  journalLogs.forEach((jl) => incrementMap(jl.date));

  const heatmapActivityLogs = Object.entries(activityMap).map(([dateStr, count]) => ({
    date: new Date(dateStr),
    count,
  }));

  // Structure layout config objects
  const widgetLayouts = dbLayouts.map((l) => ({
    widgetId: l.widgetId,
    positionX: l.positionX,
    positionY: l.positionY,
    width: l.width,
    height: l.height,
    isCollapsed: l.isCollapsed,
  }));

  // Bind layout widgets to react components
  const widgetContentMap: Record<string, React.ReactNode> = {
    greeting: (
      <GreetingWidget
        userName={session.user.name || null}
        streak={profile?.streak || 0}
        city={preference?.weatherCity || 'San Francisco'}
      />
    ),
    stats: (
      <StatsWidget
        tasksDone={tasksDoneCount}
        tasksTotal={tasksTotalCount}
        focusMinutes={focusMinutesToday}
        xpGainedToday={xpGainedToday}
        level={profile?.level || 1}
      />
    ),
    streak: (
      <div className="flex flex-col h-full items-center justify-center p-4">
        <h4 className="text-xs uppercase text-muted-foreground font-bold tracking-wider mb-2">Streaks Log</h4>
        <div className="text-4xl font-extrabold text-amber-500 flex items-center gap-1.5">
          🔥 {profile?.streak || 0}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed text-center">
          Maintain your study routine to grow XP.
        </p>
      </div>
    ),
    'ai-coach': (
      <AIBriefWidget
        level={profile?.level || 1}
        unresolvedCardsCount={dueCardsCount}
        weakSubjects={['Computer Networks']}
      />
    ),
    pomodoro: <PomodoroWidget />,
    agenda: <AgendaWidget timeBlocks={timeBlocks} />,
    habits: <HabitsWidget habits={habits} todayStr={new Date().toISOString()} />,
    heatmap: <HeatmapWidget activityLogs={heatmapActivityLogs} />,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Dashboard Customizer Header component */}
      <DashboardGridEditor
        initialLayouts={widgetLayouts}
        widgetContent={widgetContentMap}
      />
    </div>
  );
}
