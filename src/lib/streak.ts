interface StreakInput {
  currentStreak: number;
  lastActiveDate: Date | null;
  logDate: Date;
  streakFreezes?: number;
}

/**
 * Calculates user streak updates based on active dates, today's logins,
 * and available streak freezes.
 * 
 * @returns Object indicating new streak and freezes consumed.
 */
export function calculateStreak({
  currentStreak,
  lastActiveDate,
  logDate,
  streakFreezes = 0,
}: StreakInput) {
  const today = new Date(logDate);
  today.setHours(0, 0, 0, 0);

  if (!lastActiveDate) {
    return { streak: 1, streakFreezesUsed: 0 };
  }

  const lastActive = new Date(lastActiveDate);
  lastActive.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - lastActive.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Logged today already: maintain streak
    return { streak: currentStreak, streakFreezesUsed: 0 };
  }

  if (diffDays === 1) {
    // Logged consecutive day: increment streak
    return { streak: currentStreak + 1, streakFreezesUsed: 0 };
  }

  // Logged after a break (diffDays > 1)
  const daysMissed = diffDays - 1;
  if (streakFreezes >= daysMissed) {
    // Streak saved! Deduct freezes and retain streak
    return { streak: currentStreak, streakFreezesUsed: daysMissed };
  }

  // Too many days missed or no freezes available: streak reset to 1
  return { streak: 1, streakFreezesUsed: 0 };
}
