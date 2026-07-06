import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import RewardsDashboard from './rewards-dashboard';

export default async function RewardsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const userId = session.user.id;

  const profile = await db.profile.findUnique({
    where: { userId },
  });

  const preference = await db.userPreference.findUnique({
    where: { userId },
  });

  // Query all badges, including current user's unlock relations
  const badges = await db.badge.findMany({
    include: {
      users: {
        where: { userId },
      },
    },
    orderBy: { xpReward: 'asc' },
  });

  const serializedProfile = profile
    ? {
        xp: profile.xp,
        level: profile.level,
        streak: profile.streak,
        streakFreezes: profile.streakFreezes,
        title: profile.title,
      }
    : null;

  const serializedPreference = preference
    ? {
        theme: preference.theme,
      }
    : null;

  const serializedBadges = badges.map((b) => {
    const isUnlocked = b.users.length > 0;
    const unlockedAt = isUnlocked ? b.users[0].unlockedAt.toISOString() : null;

    return {
      id: b.id,
      title: b.title,
      description: b.description,
      iconUrl: b.iconUrl,
      xpReward: b.xpReward,
      isUnlocked,
      unlockedAt,
    };
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Gamification & Rewards Shop
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          View your unlocked accomplishments badges and spend XP to customize your workspace profile.
        </p>
      </div>

      <RewardsDashboard
        initialBadges={serializedBadges}
        profile={serializedProfile}
        preference={serializedPreference}
      />
    </div>
  );
}
