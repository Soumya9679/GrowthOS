import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import CoachDashboard from './coach-dashboard';

export default async function CoachPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const userId = session.user.id;

  // Find or create AI Conversation for this user
  let conversation = await db.aIConversation.findFirst({
    where: { userId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!conversation) {
    // Create new conversation
    conversation = await db.aIConversation.create({
      data: {
        userId,
        title: 'Growth Coaching Session',
      },
      include: {
        messages: true,
      },
    });

    // Create default welcome message from AI
    const welcomeMessage = await db.aIMessage.create({
      data: {
        conversationId: conversation.id,
        sender: 'AI',
        content: `### 🧠 Welcome to the growth coach room!\n\nHello! I am your **GrowthOS Personal Advisor**. I sync directly with your planner, habits streak logs, spaced repetition decks, and DSA submissions to guide your learning velocity.\n\nHere are some things we can do:\n*   **Optimize Study Schedules**: Ask me to write an hourly schedule block plan based on your tasks.\n*   **Streak Freeze Checks**: Learn how to rescue routines or accumulate multipliers.\n*   **Burnout Checks**: Ask for relaxation guidelines if your focus duration feels heavy.\n\n*What should we focus on optimizing today?*`,
      },
    });

    // Append to messages array
    conversation.messages = [welcomeMessage];
  }

  const serializedMessages = conversation.messages.map((m) => ({
    id: m.id,
    sender: m.sender as 'USER' | 'AI',
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          AI Growth Advisor
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Chat with your workspace coach. Analyze progress metrics, check study focus hours, and get personalized tips.
        </p>
      </div>

      <CoachDashboard initialMessages={serializedMessages} />
    </div>
  );
}
