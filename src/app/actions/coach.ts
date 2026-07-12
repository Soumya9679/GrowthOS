'use server';

import db from '@/lib/db';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const messageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty'),
});

export async function sendCoachMessage(formData: z.infer<typeof messageSchema>) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  const userId = session.user.id;
  const result = messageSchema.safeParse(formData);
  if (!result.success) return { error: result.error.issues[0].message };

  const { content } = result.data;

  try {
    // 1. Find or create AIConversation for this user
    let conversation = await db.aIConversation.findFirst({
      where: { userId },
    });

    if (!conversation) {
      conversation = await db.aIConversation.create({
        data: {
          userId,
          title: 'Growth Coaching Session',
        },
      });
    }

    const conversationId = conversation.id;

    // 2. Log User message in database
    await db.aIMessage.create({
      data: {
        conversationId,
        sender: 'USER',
        content,
      },
    });

    // 3. Fetch User contexts to customize response
    const profile = await db.profile.findUnique({ where: { userId } });
    const habits = await db.habit.findMany({
      where: { userId },
      include: {
        logs: {
          where: { date: { gte: new Date(new Date().setHours(0,0,0,0)) } },
        },
      },
    });

    const activeGoals = await db.goal.findMany({
      where: { userId, status: 'ACTIVE' },
      orderBy: { progress: 'asc' }, // find the one lagging
    });

    const dsaProblems = await db.dSASubmission.findMany({
      where: { userId },
    });

    const focusSessions = await db.pomodoroSession.findMany({
      where: { userId, createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) } },
    });

    // Compute stats summary tags for injection
    const habitsDone = habits.filter((h) => h.logs.length > 0).length;
    const habitsTotal = habits.length;
    const focusMinutes = focusSessions.reduce((acc, curr) => acc + curr.duration, 0);
    const solvedDsaCount = dsaProblems.length;

    // 4. Generate highly customized, contextual AI Coach reply using Python RAG Server
    let aiReply = '';
    const user_stats = {
      title: profile?.title || 'Novice',
      level: profile?.level || 1,
      xp: profile?.xp || 0,
      streak: profile?.streak || 0,
      streakFreezes: profile?.streakFreezes || 0,
      focusMinutes,
      habitsDone,
      habitsTotal,
      solvedDsaCount,
      laggingGoal: activeGoals[0]?.title || 'your academic milestones',
    };

    const ragServiceUrl = process.env.PYTHON_RAG_SERVICE_URL || 'http://127.0.0.1:8000';

    try {
      const response = await fetch(`${ragServiceUrl}/api/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: content,
          user_stats,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        aiReply = data.response;
        
        // Append citations at the bottom of the response
        if (data.citations && data.citations.length > 0) {
          const citationLinks = data.citations
            .map((c: any) => `*${c.section}* (via ${c.source})`)
            .filter((value: string, index: number, self: string[]) => self.indexOf(value) === index); // unique
          
          aiReply += `\n\n---\n*💡 Coach Insights: Linked via semantic search retrieval over ${citationLinks.join(', ')}*`;
        }
      } else {
        throw new Error('FastAPI server returned error status');
      }
    } catch (apiErr) {
      console.warn('⚠️ Python RAG Service offline. Executing local fallback rules...');
      const text = content.toLowerCase();

      if (text.includes('study') || text.includes('schedule') || text.includes('planner') || text.includes('time')) {
        aiReply = `### 📅 Study Schedule & Planning Advice\n\nI see you have logged **${focusMinutes} minutes of focus study today**. To maximize your learning capacity:\n\n*   **Optimize Cognitive Load**: Space your focus sessions in 25-minute blocks with 5-minute intervals. Avoid studying past 10 PM to protect sleep.\n*   **Prioritize Complex Tasks**: Schedule your algorithmic revisions and compiler design reviews during your peak energy hours in the afternoon.\n\n*Would you like me to help write out a optimized study schedule plan for tomorrow?*`;
      } else if (text.includes('habit') || text.includes('streak') || text.includes('consistency')) {
        const streakCount = profile?.streak || 0;
        const freezesCount = profile?.streakFreezes || 0;
        aiReply = `### 🔥 Habits & Consistency Support\n\nYou are currently holding an active **${streakCount}-day streak** with **${freezesCount} Streak Freezes** available in your inventory. Today, you have checked off **${habitsDone}/${habitsTotal} habits**.\n\n*   **Protect the Streak**: If you feel overloaded, remember you can redeem freezes or check off your highest-impact habit first.\n*   **Habit Stacking**: Try coupling your flashcard reviews right after your morning coffee to lock in the routine.\n\n*Keep moving forward. Small daily adjustments yield massive results.*`;
      } else if (text.includes('dsa') || text.includes('code') || text.includes('leetcode')) {
        aiReply = `### 💻 Algorithmic & DSA Coaching\n\nYou have solved **${solvedDsaCount} competitive coding problems** across LeetCode, Codeforces, and GeeksforGeeks.\n\n*   **Depth over Breadth**: When tackling problems, focus on fully understanding the time and space complexity trade-offs (e.g. rolling arrays in Dynamic Programming) rather than just pushing for high numbers.\n*   **Weak Subject Alert**: Ensure you review data structures like Heap Priority Queues and Graph traversal regularly.\n\n*What specific coding problem patterns are you struggling with today?*`;
      } else if (text.includes('burnout') || text.includes('tired') || text.includes('stress') || text.includes('exhausted')) {
        aiReply = `### 🛡️ Burnout Prevention Advisor\n\nI detect high cognitive fatigue levels. You have completed **${focusMinutes} focus minutes** today.\n\n*   **Take a Mandatory Break**: Shut down the terminal, step away from the monitor, and take a 15-minute screen-free walk.\n*   **Sleep hygiene**: Protect your circadian rhythm. Avoid debug loops past late hours.\n\n*Your mental velocity is your highest asset. Rest is a crucial component of execution.*`;
      } else {
        const lagGoal = activeGoals[0]?.title || 'your academic milestones';
        aiReply = `### 🧠 Personal Growth Coach Greeting\n\nHello! I am your GrowthOS personal growth coach. I analyze your objectives, habits, and focus schedules to keep you in peak cognitive execution.\n\nLooking at your active targets, your goal **"${lagGoal}"** has the lowest progress index right now. Consider scheduling a **45-minute deep focus block** today to move the needle on this objective.\n\n*What would you like to optimize today? You can ask me about study schedules, habit streak rescues, algorithmic DSA guidance, or burnout checks.*`;
      }
    }

    // 5. Save AI message response in database
    await db.aIMessage.create({
      data: {
        conversationId,
        sender: 'AI',
        content: aiReply,
      },
    });

    revalidatePath('/coach');
    revalidatePath('/assistant');
    return { success: true };
  } catch (err) {
    console.error('❌ Failed to send coach message:', err);
    return { error: 'Database transaction failed.' };
  }
}
