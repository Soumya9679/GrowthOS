import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import DSADashboard from './dsa-dashboard';

export default async function DSAPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const userId = session.user.id;

  const profile = await db.dSAProfile.findUnique({
    where: { userId },
  });

  const submissions = await db.dSASubmission.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
  });

  const serializedProfile = profile
    ? {
        leetcodeUsername: profile.leetcodeUsername || '',
        codeforcesUsername: profile.codeforcesUsername || '',
        geeksforgeeksUsername: profile.geeksforgeeksUsername || '',
        leetcodeSolved: profile.leetcodeSolved,
        leetcodeEasy: profile.leetcodeEasy,
        leetcodeMedium: profile.leetcodeMedium,
        leetcodeHard: profile.leetcodeHard,
        codeforcesSolved: profile.codeforcesSolved,
        geeksforgeeksSolved: profile.geeksforgeeksSolved,
        lastSyncedAt: profile.lastSyncedAt ? profile.lastSyncedAt.toISOString() : null,
      }
    : null;

  const serializedSubmissions = submissions.map((s) => ({
    id: s.id,
    problemName: s.problemName,
    platform: s.platform,
    difficulty: s.difficulty,
    date: s.date.toISOString(),
    notes: s.notes || '',
  }));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          DSA Profile & Submissions Tracker
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Connect your LeetCode, Codeforces, and GeeksforGeeks handles to sync solved coding problems.
        </p>
      </div>

      <DSADashboard
        initialProfile={serializedProfile}
      />
    </div>
  );
}
