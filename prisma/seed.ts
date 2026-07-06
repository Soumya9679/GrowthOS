import { pbkdf2Sync } from 'crypto';
import prisma from '../src/lib/db';

function hashPassword(password: string): string {
  const salt = 'growthos_demo_salt';
  const hash = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Clean existing database records (clean up references first)
  await prisma.activityLog.deleteMany({});
  await prisma.reminder.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.xPHistory.deleteMany({});
  await prisma.userBadge.deleteMany({});
  await prisma.badge.deleteMany({});
  await prisma.journalEntry.deleteMany({});
  await prisma.book.deleteMany({});
  await prisma.flashcard.deleteMany({});
  await prisma.topic.deleteMany({});
  await prisma.studySession.deleteMany({});
  await prisma.subject.deleteMany({});
  await prisma.dSASubmission.deleteMany({});
  await prisma.dSAProfile.deleteMany({});
  await prisma.habitLog.deleteMany({});
  await prisma.habit.deleteMany({});
  await prisma.pomodoroSession.deleteMany({});
  await prisma.timeBlock.deleteMany({});
  await prisma.subTask.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.goal.deleteMany({});
  await prisma.widgetLayout.deleteMany({});
  await prisma.userPreference.deleteMany({});
  await prisma.profile.deleteMany({});
  await prisma.workspaceMember.deleteMany({});
  await prisma.workspace.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.analyticsSnapshot.deleteMany({});
  await prisma.dailySummary.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('🧹 Cleaned existing database tables.');

  // 2. Seed Badges Catalog
  const badgeEarlyBird = await prisma.badge.create({
    data: {
      title: 'Early Bird',
      description: 'Logged a study session before 6:00 AM.',
      iconUrl: 'lucide:sun',
      xpReward: 150,
    },
  });

  const badgeFocusMaster = await prisma.badge.create({
    data: {
      title: 'Focus Master',
      description: 'Completed 4 Pomodoro focus sessions in a single day.',
      iconUrl: 'lucide:timer',
      xpReward: 300,
    },
  });

  const badgeCodeWarrior = await prisma.badge.create({
    data: {
      title: 'Code Warrior',
      description: 'Solved 10 LeetCode / DSA coding problems.',
      iconUrl: 'lucide:code-xml',
      xpReward: 250,
    },
  });

  console.log('🏅 Seeded badges catalog.');

  // 3. Seed Demo User
  const demoEmail = 'demo@growthos.com';
  const hashedPassword = hashPassword('demopassword');

  const user = await prisma.user.create({
    data: {
      name: 'Rohan Sharma',
      email: demoEmail,
      passwordHash: hashedPassword,
      profile: {
        create: {
          xp: 1450,
          level: 4,
          streak: 12,
          longestStreak: 18,
          streakFreezes: 2,
          title: 'Code Artisan',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
          bio: 'Undergrad student majoring in Computer Science. Building GrowthOS to optimize my studies and coding habits.',
        },
      },
      preference: {
        create: {
          theme: 'dark-default',
          sidebarOpen: true,
          notificationsEnabled: true,
          pomodoroWorkDuration: 25,
          pomodoroBreakDuration: 5,
          soundVolume: 60,
          weatherCity: 'San Francisco',
        },
      },
    },
  });

  console.log(`👤 Seeded demo user: ${user.email}`);

  // 4. Seed Widget Layout Configurations
  const widgets = [
    { id: 'greeting', x: 0, y: 0, w: 12, h: 2 },
    { id: 'stats', x: 0, y: 2, w: 8, h: 2 },
    { id: 'streak', x: 8, y: 2, w: 4, h: 2 },
    { id: 'ai-coach', x: 0, y: 4, w: 8, h: 4 },
    { id: 'pomodoro', x: 8, y: 4, w: 4, h: 4 },
    { id: 'agenda', x: 0, y: 8, w: 7, h: 6 },
    { id: 'habits', x: 7, y: 8, w: 5, h: 6 },
    { id: 'heatmap', x: 0, y: 14, w: 12, h: 3 },
  ];

  await prisma.widgetLayout.createMany({
    data: widgets.map((w) => ({
      userId: user.id,
      widgetId: w.id,
      positionX: w.x,
      positionY: w.y,
      width: w.w,
      height: w.h,
    })),
  });

  console.log('🧩 Seeded dashboard widget layout.');

  // 5. Seed Goals
  await prisma.goal.createMany({
    data: [
      {
        userId: user.id,
        title: 'Master Data Structures & Algorithms',
        description: 'Complete 100 problems on LeetCode and solve dynamic programming topics.',
        type: 'LONG_TERM',
        endDate: new Date('2026-12-31'),
        progress: 45,
        status: 'ACTIVE',
      },
      {
        userId: user.id,
        title: 'Score 9.0+ GPA this Semester',
        description: 'Maintain study schedules and score A grades in Compiler Design and Networks.',
        type: 'MONTHLY',
        endDate: new Date('2026-08-31'),
        progress: 75,
        status: 'ACTIVE',
      },
      {
        userId: user.id,
        title: 'Finish "Atomic Habits" Book',
        description: 'Read remaining 100 pages and compile actionable habit loop notes.',
        type: 'WEEKLY',
        endDate: new Date('2026-07-12'),
        progress: 80,
        status: 'ACTIVE',
      },
    ],
  });

  console.log('🎯 Seeded user goals.');

  // 6. Seed Subjects & Study Logs
  const subCS = await prisma.subject.create({
    data: {
      userId: user.id,
      name: 'Computer Science (DSA)',
      color: '#3b82f6',
      targetHours: 10.0,
      topics: {
        create: [
          { name: 'Binary Trees' },
          { name: 'Dynamic Programming' },
          { name: 'Graphs' },
        ],
      },
    },
  });

  const subNetworks = await prisma.subject.create({
    data: {
      userId: user.id,
      name: 'Computer Networks',
      color: '#10b981',
      targetHours: 6.0,
      topics: {
        create: [
          { name: 'TCP/IP Layering' },
          { name: 'DNS Lookup protocol' },
        ],
      },
    },
  });

  const subCompiler = await prisma.subject.create({
    data: {
      userId: user.id,
      name: 'Compiler Design',
      color: '#8b5cf6',
      targetHours: 8.0,
      topics: {
        create: [
          { name: 'LALR Parsing tables' },
          { name: 'Lexical Analysis' },
        ],
      },
    },
  });

  // Seed study sessions (logs for analytics)
  const today = new Date();
  const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(today.getDate() - n);
    return d;
  };

  await prisma.studySession.createMany({
    data: [
      { subjectId: subCS.id, duration: 90, createdAt: daysAgo(5) },
      { subjectId: subCS.id, duration: 120, createdAt: daysAgo(3) },
      { subjectId: subCS.id, duration: 60, createdAt: daysAgo(1) },
      { subjectId: subNetworks.id, duration: 45, createdAt: daysAgo(4) },
      { subjectId: subNetworks.id, duration: 90, createdAt: daysAgo(2) },
      { subjectId: subCompiler.id, duration: 60, createdAt: daysAgo(3) },
      { subjectId: subCompiler.id, duration: 120, createdAt: daysAgo(1) },
    ],
  });

  console.log('📚 Seeded study subjects, topics, and history logs.');

  // 7. Seed Flashcards (Spaced Repetition)
  const topicDP = await prisma.topic.findFirst({ where: { name: 'Dynamic Programming' } });
  if (topicDP) {
    await prisma.flashcard.createMany({
      data: [
        {
          topicId: topicDP.id,
          front: 'What is the core difference between memoization (Top-down) and tabulation (Bottom-up)?',
          back: 'Memoization is recursive and stores results as recursion returns, calculating states on-demand. Tabulation is iterative, filling a table from base cases up to the target state, avoiding call-stack overhead.',
          interval: 6,
          ease: 2.6,
          repetitions: 2,
          nextReview: daysAgo(1), // Due yesterday, needs review
        },
        {
          topicId: topicDP.id,
          front: 'What is the state transition formula for the 0/1 Knapsack problem?',
          back: 'dp[i][w] = max(dp[i-1][w], dp[i-1][w - wt[i-1]] + val[i-1]) if wt[i-1] <= w, else dp[i-1][w]',
          interval: 14,
          ease: 2.7,
          repetitions: 3,
          nextReview: new Date('2026-07-20'), // Sometime in the future
        },
      ],
    });
  }

  console.log('⚡ Seeded flashcards.');

  // 8. Seed DSA Submissions
  await prisma.dSAProfile.create({
    data: {
      userId: user.id,
      leetcodeUsername: 'rohan_codes',
      codeforcesUsername: 'rohan_cf',
      geeksforgeeksUsername: 'rohan_gfg',
    },
  });

  await prisma.dSASubmission.createMany({
    data: [
      {
        userId: user.id,
        problemName: 'Longest Common Subsequence',
        platform: 'LEETCODE',
        difficulty: 'Medium',
        notes: 'Solved using 2D DP array. Space optimized to 1D array subsequently.',
      },
      {
        userId: user.id,
        problemName: 'Merge k Sorted Lists',
        platform: 'LEETCODE',
        difficulty: 'Hard',
        notes: 'Implemented using Min-Heap priority queue.',
      },
      {
        userId: user.id,
        problemName: 'Water Fill System',
        platform: 'CODEFORCES',
        difficulty: 'Medium',
        notes: 'Graph BFS search problem.',
      },
    ],
  });

  console.log('💻 Seeded DSA profile and problem submissions.');

  // 9. Seed Projects & Tasks (Kanban)
  const projPortfolio = await prisma.project.create({
    data: {
      userId: user.id,
      name: 'Personal GrowthOS Portfolio',
      description: 'Web application demonstrating learning tracks, streaks, and focus graphs.',
    },
  });

  // Tasks
  const task1 = await prisma.task.create({
    data: {
      userId: user.id,
      title: 'Configure NextAuth Credential Handlers',
      description: 'Implement secure login endpoints and password checks.',
      status: 'DONE',
      priority: 'HIGH',
      projectId: projPortfolio.id,
      dueDate: daysAgo(1),
      subtasks: {
        create: [
          { title: 'Create login server action', isCompleted: true },
          { title: 'Validate Zod parser errors', isCompleted: true },
        ],
      },
    },
  });

  const task2 = await prisma.task.create({
    data: {
      userId: user.id,
      title: 'Create Dashboard Layout Draggable Grid',
      description: 'Build client grids allowing custom widget coordinates.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      projectId: projPortfolio.id,
      dueDate: today,
      subtasks: {
        create: [
          { title: 'Build React-Grid-Layout client container', isCompleted: false },
          { title: 'Persist state updates in DB server actions', isCompleted: false },
        ],
      },
    },
  });

  const task3 = await prisma.task.create({
    data: {
      userId: user.id,
      title: 'Design Heatmap SVGs for Habits logs',
      description: 'Implement GitHub grid showing habit completeness scores.',
      status: 'TODO',
      priority: 'MEDIUM',
      projectId: projPortfolio.id,
      dueDate: daysAgo(-3),
    },
  });

  console.log('📋 Seeded Kanban task items.');

  // 10. Seed Habits & logs
  const habitCode = await prisma.habit.create({
    data: {
      userId: user.id,
      name: 'Write Code',
      description: 'Solve Leetcode problems or code project tasks.',
      frequency: 'DAILY',
    },
  });

  const habitRead = await prisma.habit.create({
    data: {
      userId: user.id,
      name: 'Read Books',
      description: 'Read tech books or non-fiction personal dev sheets.',
      frequency: 'DAILY',
    },
  });

  const habitGym = await prisma.habit.create({
    data: {
      userId: user.id,
      name: 'Gym Workout',
      description: 'Heavy strength training routines.',
      frequency: 'DAILY',
    },
  });

  // Log habit logs for the last 5 days
  for (let i = 0; i < 5; i++) {
    const logDate = daysAgo(i);
    logDate.setHours(0, 0, 0, 0);

    await prisma.habitLog.create({
      data: { habitId: habitCode.id, date: logDate, completed: true },
    });

    if (i !== 2) { // Missed reading one day
      await prisma.habitLog.create({
        data: { habitId: habitRead.id, date: logDate, completed: true },
      });
    }

    if (i % 2 === 0) { // Workout every alternate day
      await prisma.habitLog.create({
        data: { habitId: habitGym.id, date: logDate, completed: true },
      });
    }
  }

  console.log('🔥 Seeded habits and habit logs logs.');

  // 11. Seed TimeBlocks (Planner)
  const setHour = (hour: number) => {
    const d = new Date();
    d.setHours(hour, 0, 0, 0);
    return d;
  };

  await prisma.timeBlock.createMany({
    data: [
      {
        userId: user.id,
        title: 'Morning Routine & Coffee',
        startTime: setHour(7),
        endTime: setHour(8),
        color: '#f59e0b',
      },
      {
        userId: user.id,
        title: 'DSA: Practice Dynamic Programming',
        startTime: setHour(9),
        endTime: setHour(11),
        color: '#3b82f6',
        notes: 'Solve 2 Medium DP problems on LeetCode.',
      },
      {
        userId: user.id,
        title: 'Portfolio Coding: Layout components',
        startTime: setHour(14),
        endTime: setHour(17),
        color: '#6366f1',
        notes: 'Focus on glassmorphism components and Framer animations.',
      },
    ],
  });

  console.log('📅 Seeded timeblock planners.');

  // 12. Seed Focus Sessions (Pomodoro)
  await prisma.pomodoroSession.createMany({
    data: [
      { userId: user.id, duration: 25, category: 'Coding', createdAt: daysAgo(2) },
      { userId: user.id, duration: 25, category: 'Coding', createdAt: daysAgo(2) },
      { userId: user.id, duration: 25, category: 'Reading', createdAt: daysAgo(1) },
      { userId: user.id, duration: 25, category: 'Coding', createdAt: today },
    ],
  });

  console.log('⏱️ Seeded focus session history logs.');

  // 13. Seed Books
  await prisma.book.createMany({
    data: [
      {
        userId: user.id,
        title: 'Atomic Habits',
        author: 'James Clear',
        totalPages: 320,
        currentPage: 220,
        status: 'READING',
        notes: 'The cue, craving, response, reward habit loops breakdown is excellent.',
      },
      {
        userId: user.id,
        title: 'Designing Data-Intensive Applications',
        author: 'Martin Kleppmann',
        totalPages: 610,
        currentPage: 150,
        status: 'READING',
        notes: 'Excellent summaries on partitions and replication logs.',
      },
      {
        userId: user.id,
        title: 'Clean Code',
        author: 'Robert C. Martin',
        totalPages: 460,
        currentPage: 460,
        status: 'COMPLETED',
        notes: 'Classic instructions, though some Java concepts are a bit outdated.',
      },
    ],
  });

  console.log('📖 Seeded reading lists.');

  // 14. Seed Journal & Mood Log
  const journalDate = new Date();
  journalDate.setHours(0, 0, 0, 0);

  await prisma.journalEntry.create({
    data: {
      userId: user.id,
      content: `### Today's Reflection
Today was highly productive. I completed 2 major Pomodoro blocks and resolved the layout bugs in the draggable grid.

#### Learnings
- **Dynamic Programming**: Solved LCS problem. The space optimization technique (rolling arrays) makes perfect sense now.
- **Productivity**: Need to reduce afternoon coffee to avoid sleep interruptions.

#### Targets for Tomorrow
1. Complete task routes auth testing.
2. Review Compiler Design parser files.`,
      moodScore: 4,
      date: journalDate,
    },
  });

  console.log('📝 Seeded journal entry.');

  // 15. Link unlocked badge to user
  await prisma.userBadge.create({
    data: {
      userId: user.id,
      badgeId: badgeFocusMaster.id,
      unlockedAt: daysAgo(2),
    },
  });

  console.log('🎖️ Linked unlocked badges to user.');

  // 16. Seed XP History Logs
  await prisma.xPHistory.createMany({
    data: [
      { userId: user.id, amount: 200, source: 'ONBOARDING', createdAt: daysAgo(10) },
      { userId: user.id, amount: 50, source: 'POMODORO', createdAt: daysAgo(2) },
      { userId: user.id, amount: 300, source: 'BADGE_UNLOCKED', createdAt: daysAgo(2) },
      { userId: user.id, amount: 20, source: 'HABIT_COMPLETION', createdAt: daysAgo(1) },
      { userId: user.id, amount: 100, source: 'TASK_COMPLETION', createdAt: daysAgo(1) },
    ],
  });

  // 17. Seed daily summary
  await prisma.dailySummary.create({
    data: {
      userId: user.id,
      date: daysAgo(1),
      content: 'Yesterday, you maintained high consistency. You completed your primary coding tasks, spent 2 hours studying Computer Science, and checked off all daily habits. Mood was optimistic, showing high energy levels in the morning.',
      score: 92,
    },
  });

  // 18. Seed AnalyticsSnapshot (for charts)
  await prisma.analyticsSnapshot.createMany({
    data: [
      { userId: user.id, date: daysAgo(4), tasksCompleted: 1, focusMinutes: 50, habitsCompleted: 2, spacedCardsChecked: 2, overallFocusScore: 78.5, burnoutRisk: 20.0, learningVelocity: 1.2 },
      { userId: user.id, date: daysAgo(3), tasksCompleted: 0, focusMinutes: 75, habitsCompleted: 1, spacedCardsChecked: 0, overallFocusScore: 82.0, burnoutRisk: 25.0, learningVelocity: 1.4 },
      { userId: user.id, date: daysAgo(2), tasksCompleted: 2, focusMinutes: 100, habitsCompleted: 3, spacedCardsChecked: 4, overallFocusScore: 90.0, burnoutRisk: 30.0, learningVelocity: 1.8 },
      { userId: user.id, date: daysAgo(1), tasksCompleted: 1, focusMinutes: 50, habitsCompleted: 2, spacedCardsChecked: 1, overallFocusScore: 80.0, burnoutRisk: 32.0, learningVelocity: 1.6 },
    ],
  });

  console.log('📈 Seeded analytics snapshots logs.');
  console.log('🎉 Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
