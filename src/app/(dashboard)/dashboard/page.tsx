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

  const startOfToday = new Date();
  startOfToday.setHours(0,0,0,0);
  const endOfToday = new Date();
  endOfToday.setHours(23,59,59,999);

  const oneYearAgo = new Date();
  oneYearAgo.setDate(oneYearAgo.getDate() - 365);

  // Parallelize all database reads
  const [
    profile,
    preference,
    dbLayouts,
    habits,
    timeBlocks,
    tasksDoneCount,
    tasksTotalCount,
    pomodoroSessions,
    xpLogsToday,
    dueCardsCount,
    habitLogs,
    completedTasksLogs,
    journalLogs,
  ] = await Promise.all([
    db.profile.findUnique({
      where: { userId },
    }),
    db.userPreference.findUnique({
      where: { userId },
    }),
    db.widgetLayout.findMany({
      where: { userId },
    }),
    db.habit.findMany({
      where: { userId },
      include: {
        logs: {
          where: {
            date: {
              gte: startOfToday,
            },
          },
        },
      },
    }),
    db.timeBlock.findMany({
      where: {
        userId,
        startTime: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    }),
    db.task.count({
      where: { userId, status: 'DONE' },
    }),
    db.task.count({
      where: { userId },
    }),
    db.pomodoroSession.findMany({
      where: {
        userId,
        createdAt: {
          gte: startOfToday,
        },
      },
    }),
    db.xPHistory.findMany({
      where: {
        userId,
        createdAt: {
          gte: startOfToday,
        },
      },
    }),
    db.flashcard.count({
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
    }),
    db.habitLog.findMany({
      where: {
        habit: { userId },
        date: { gte: oneYearAgo },
      },
    }),
    db.task.findMany({
      where: {
        userId,
        status: 'DONE',
        updatedAt: { gte: oneYearAgo },
      },
    }),
    db.journalEntry.findMany({
      where: {
        userId,
        date: { gte: oneYearAgo },
      },
    }),
  ]);

  const focusMinutesToday = pomodoroSessions.reduce((acc, curr) => acc + curr.duration, 0);
  const xpGainedToday = xpLogsToday.reduce((acc, curr) => acc + curr.amount, 0);

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
