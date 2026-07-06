'use server';

import db from '@/lib/db';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const calculateXpThreshold = (level: number) => Math.round(100 * Math.pow(level, 1.5));

const dsaProfileSchema = z.object({
  leetcodeUsername: z.string().optional().nullable(),
  codeforcesUsername: z.string().optional().nullable(),
  geeksforgeeksUsername: z.string().optional().nullable(),
});

async function fetchLeetCodeStats(username: string) {
  try {
    const response = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      body: JSON.stringify({
        query: `
          query userProblemsSolved($username: String!) {
            matchedUser(username: $username) {
              submitStats {
                acSubmissionNum {
                  difficulty
                  count
                }
              }
            }
          }
        `,
        variables: { username },
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    if (data.errors) return null;

    const acSubmissions = data?.data?.matchedUser?.submitStats?.acSubmissionNum || [];
    const stats = {
      solved: 0,
      easy: 0,
      medium: 0,
      hard: 0,
    };

    acSubmissions.forEach((item: any) => {
      if (item.difficulty === 'All') stats.solved = item.count;
      if (item.difficulty === 'Easy') stats.easy = item.count;
      if (item.difficulty === 'Medium') stats.medium = item.count;
      if (item.difficulty === 'Hard') stats.hard = item.count;
    });

    return stats;
  } catch (err) {
    console.error('Error fetching LeetCode stats:', err);
    return null;
  }
}

async function fetchCodeforcesStats(username: string) {
  try {
    const response = await fetch(`https://codeforces.com/api/user.status?handle=${username}`);
    if (!response.ok) return null;

    const data = await response.json();
    if (data.status !== 'OK') return null;

    const solvedProblems = new Set();
    data.result.forEach((sub: any) => {
      if (sub.verdict === 'OK') {
        solvedProblems.add(`${sub.problem.contestId}-${sub.problem.index}`);
      }
    });

    return { solved: solvedProblems.size };
  } catch (err) {
    console.error('Error fetching Codeforces stats:', err);
    return null;
  }
}

async function fetchGfgStats(username: string) {
  try {
    const response = await fetch(`https://auth.geeksforgeeks.org/user/${username}/profile`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!response.ok) return null;
    const html = await response.text();
    const match = html.match(/class="scoreCard_col_each_count"[^>]*>(\d+)/) || html.match(/Problems Solved[^\d]*(\d+)/i);
    return match ? { solved: parseInt(match[1]) } : null;
  } catch (err) {
    console.error('Error fetching GFG stats:', err);
    return null;
  }
}

export async function syncDSAProfile(formData: z.infer<typeof dsaProfileSchema>) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  const userId = session.user.id;
  const result = dsaProfileSchema.safeParse(formData);
  if (!result.success) return { error: result.error.issues[0].message };

  const { leetcodeUsername, codeforcesUsername, geeksforgeeksUsername } = result.data;

  if (!leetcodeUsername?.trim() && !codeforcesUsername?.trim() && !geeksforgeeksUsername?.trim()) {
    return { error: 'Please provide at least one developer handle (LeetCode, Codeforces, or GeeksforGeeks) to sync.' };
  }

  try {
    // 1. Fetch current profile state to calculate diff increments
    const currentProfile = await db.dSAProfile.findUnique({
      where: { userId },
    });

    // Default current aggregates
    let leetcodeSolved = currentProfile?.leetcodeSolved || 0;
    let leetcodeEasy = currentProfile?.leetcodeEasy || 0;
    let leetcodeMedium = currentProfile?.leetcodeMedium || 0;
    let leetcodeHard = currentProfile?.leetcodeHard || 0;
    let codeforcesSolved = currentProfile?.codeforcesSolved || 0;
    let geeksforgeeksSolved = currentProfile?.geeksforgeeksSolved || 0;

    const isDemo = 
      leetcodeUsername === 'rohan_codes' || 
      codeforcesUsername === 'rohan_cf' || 
      geeksforgeeksUsername === 'rohan_gfg';

    if (isDemo) {
      // Sandbox fallback: Increment mock values to simulate sync
      leetcodeSolved = (currentProfile?.leetcodeSolved || 140) + 3;
      leetcodeEasy = (currentProfile?.leetcodeEasy || 50) + 1;
      leetcodeMedium = (currentProfile?.leetcodeMedium || 65) + 1;
      leetcodeHard = (currentProfile?.leetcodeHard || 25) + 1;
      codeforcesSolved = (currentProfile?.codeforcesSolved || 72) + 2;
      geeksforgeeksSolved = (currentProfile?.geeksforgeeksSolved || 48) + 1;
    } else {
      // Production: query actual live stats
      if (leetcodeUsername?.trim()) {
        const lc = await fetchLeetCodeStats(leetcodeUsername.trim());
        if (lc) {
          leetcodeSolved = lc.solved;
          leetcodeEasy = lc.easy;
          leetcodeMedium = lc.medium;
          leetcodeHard = lc.hard;
        }
      }
      if (codeforcesUsername?.trim()) {
        const cf = await fetchCodeforcesStats(codeforcesUsername.trim());
        if (cf) {
          codeforcesSolved = cf.solved;
        }
      }
      if (geeksforgeeksUsername?.trim()) {
        const gfg = await fetchGfgStats(geeksforgeeksUsername.trim());
        if (gfg) {
          geeksforgeeksSolved = gfg.solved;
        }
      }
    }

    // 2. Save new aggregated counts to database
    const updatedProfile = await db.dSAProfile.upsert({
      where: { userId },
      update: {
        leetcodeUsername: leetcodeUsername || null,
        codeforcesUsername: codeforcesUsername || null,
        geeksforgeeksUsername: geeksforgeeksUsername || null,
        leetcodeSolved,
        leetcodeEasy,
        leetcodeMedium,
        leetcodeHard,
        codeforcesSolved,
        geeksforgeeksSolved,
        lastSyncedAt: new Date(),
      },
      create: {
        userId,
        leetcodeUsername: leetcodeUsername || null,
        codeforcesUsername: codeforcesUsername || null,
        geeksforgeeksUsername: geeksforgeeksUsername || null,
        leetcodeSolved,
        leetcodeEasy,
        leetcodeMedium,
        leetcodeHard,
        codeforcesSolved,
        geeksforgeeksSolved,
        lastSyncedAt: new Date(),
      },
    });

    // 3. Compute progress delta increase (if any) to award XP
    const oldTotal = 
      (currentProfile?.leetcodeSolved || 0) + 
      (currentProfile?.codeforcesSolved || 0) + 
      (currentProfile?.geeksforgeeksSolved || 0);

    const newTotal = leetcodeSolved + codeforcesSolved + geeksforgeeksSolved;
    const diffSolved = newTotal - oldTotal;

    let xpGained = 0;
    if (diffSolved > 0) {
      xpGained = diffSolved * 25; // +25 XP per newly solved question!

      const userProfile = await db.profile.findUnique({ where: { userId } });
      if (userProfile) {
        const newXp = userProfile.xp + xpGained;
        let newLevel = userProfile.level;

        let threshold = calculateXpThreshold(newLevel);
        while (newXp >= threshold) {
          newLevel += 1;
          threshold = calculateXpThreshold(newLevel);
        }

        await db.profile.update({
          where: { userId },
          data: {
            xp: newXp,
            level: newLevel,
            title: newLevel >= 10 ? 'Elite Scholar' : newLevel >= 5 ? 'Growth Architect' : userProfile.title,
          },
        });

        // Log XP transaction
        await db.xPHistory.create({
          data: {
            userId,
            amount: xpGained,
            source: 'DSA_SYNC_XP',
          },
        });
      }
    }

    revalidatePath('/dsa');
    revalidatePath('/dashboard');
    
    return { 
      success: true, 
      count: diffSolved > 0 ? diffSolved : 0, 
      xp: xpGained,
      totalSolved: newTotal
    };
  } catch (err) {
    console.error('❌ Failed to sync DSA profile stats:', err);
    return { error: 'Database transaction failed.' };
  }
}
