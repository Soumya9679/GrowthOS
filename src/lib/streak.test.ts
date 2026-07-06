import { calculateStreak } from './streak';
import { describe, it, expect } from 'vitest';

describe('Gamification Streak Calculator', () => {
  it('should increment streak if completion is logged consecutive to yesterday', () => {
    const lastActive = new Date();
    lastActive.setDate(lastActive.getDate() - 1);
    
    const { streak, streakFreezesUsed } = calculateStreak({
      currentStreak: 5,
      lastActiveDate: lastActive,
      logDate: new Date(),
    });
    
    expect(streak).toBe(6);
    expect(streakFreezesUsed).toBe(0);
  });

  it('should maintain streak if logged today', () => {
    const today = new Date();
    
    const { streak, streakFreezesUsed } = calculateStreak({
      currentStreak: 5,
      lastActiveDate: today,
      logDate: today,
    });
    
    expect(streak).toBe(5);
    expect(streakFreezesUsed).toBe(0);
  });

  it('should reset streak to 1 if user missed yesterday and has no streak freezes', () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    
    const { streak, streakFreezesUsed } = calculateStreak({
      currentStreak: 5,
      lastActiveDate: twoDaysAgo,
      logDate: new Date(),
      streakFreezes: 0,
    });
    
    expect(streak).toBe(1);
    expect(streakFreezesUsed).toBe(0);
  });

  it('should rescue streak if user missed yesterday but has active streak freezes', () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2); // Missed 1 day (yesterday)
    
    const { streak, streakFreezesUsed } = calculateStreak({
      currentStreak: 5,
      lastActiveDate: twoDaysAgo,
      logDate: new Date(),
      streakFreezes: 2,
    });
    
    expect(streak).toBe(5); // Streak retained
    expect(streakFreezesUsed).toBe(1); // 1 freeze consumed
  });
});
