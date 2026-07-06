import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import StudyDashboard from './study-dashboard';

export default async function StudyPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const userId = session.user.id;
  const now = new Date();

  // Query subjects, nested topics, and nested cards
  const subjects = await db.subject.findMany({
    where: { userId },
    include: {
      topics: {
        include: {
          flashcards: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  // Query all cards that are currently due for review
  const dueCards = await db.flashcard.findMany({
    where: {
      topic: {
        subject: {
          userId,
        },
      },
      nextReview: {
        lte: now,
      },
    },
    include: {
      topic: {
        include: {
          subject: true,
        },
      },
    },
    orderBy: { nextReview: 'asc' },
  });

  const serializedSubjects = subjects.map((s) => ({
    id: s.id,
    name: s.name,
    topics: s.topics.map((t) => ({
      id: t.id,
      name: t.name,
      cardsCount: t.flashcards.length,
      dueCount: t.flashcards.filter((c) => c.nextReview <= now).length,
    })),
  }));

  const serializedDueCards = dueCards.map((c) => ({
    id: c.id,
    front: c.front,
    back: c.back,
    ease: c.ease,
    repetitions: c.repetitions,
    interval: c.interval,
    topicName: c.topic.name,
    subjectName: c.topic.subject.name,
  }));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Spaced Repetition Study Deck
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Revise subject decks. Self-assess your retention and schedule memory intervals with SuperMemo-2.
        </p>
      </div>

      <StudyDashboard 
        initialSubjects={serializedSubjects} 
        dueCards={serializedDueCards} 
      />
    </div>
  );
}
