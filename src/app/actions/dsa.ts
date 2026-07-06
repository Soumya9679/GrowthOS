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

const DSA_PROBLEMS_MOCK = [
  { problemName: 'Regular Expression Matching', platform: 'LEETCODE', difficulty: 'Hard' },
  { problemName: 'Longest Palindromic Substring', platform: 'LEETCODE', difficulty: 'Medium' },
  { problemName: 'Binary Tree Zigzag Level Order Traversal', platform: 'LEETCODE', difficulty: 'Medium' },
  { problemName: 'Dijkstra Path Optimization', platform: 'CODEFORCES', difficulty: 'Hard' },
  { problemName: 'Maximum Subarray Sum', platform: 'GEEKSFORGEEKS', difficulty: 'Easy' },
  { problemName: 'Valid Parentheses', platform: 'LEETCODE', difficulty: 'Easy' },
  { problemName: 'Kruskal Minimum Spanning Tree', platform: 'CODEFORCES', difficulty: 'Medium' },
  { problemName: 'LRU Cache implementation', platform: 'LEETCODE', difficulty: 'Medium' },
];

export async function syncDSAProfile(formData: z.infer<typeof dsaProfileSchema>) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  const userId = session.user.id;
  const result = dsaProfileSchema.safeParse(formData);
  if (!result.success) return { error: result.error.issues[0].message };

  const { leetcodeUsername, codeforcesUsername, geeksforgeeksUsername } = result.data;

  try {
    // 1. Upsert handles profile
    await db.dSAProfile.upsert({
      where: { userId },
      update: {
        leetcodeUsername: leetcodeUsername || null,
        codeforcesUsername: codeforcesUsername || null,
        geeksforgeeksUsername: geeksforgeeksUsername || null,
        lastSyncedAt: new Date(),
      },
      create: {
        userId,
        leetcodeUsername: leetcodeUsername || null,
        codeforcesUsername: codeforcesUsername || null,
        geeksforgeeksUsername: geeksforgeeksUsername || null,
        lastSyncedAt: new Date(),
      },
    });

    // 2. Fetch existing submissions to prevent duplicate inserts
    const existing = await db.dSASubmission.findMany({
      where: { userId },
    });

    // Pick 3 random problems from our mock list that have not been solved yet
    const unsolvedMock = DSA_PROBLEMS_MOCK.filter(
      (m) => !existing.some((e) => e.problemName === m.problemName && e.platform === m.platform)
    );

    // Shuffle and pick up to 3
    const shuffled = unsolvedMock.sort(() => 0.5 - Math.random());
    const toInsert = shuffled.slice(0, 3);

    let xpGained = 0;
    const insertedLogs = [];

    if (toInsert.length > 0) {
      for (const p of toInsert) {
        const sub = await db.dSASubmission.create({
          data: {
            userId,
            problemName: p.problemName,
            platform: p.platform,
            difficulty: p.difficulty,
          },
        });
        insertedLogs.push(sub);
      }
      xpGained = toInsert.length * 25; // +25 XP per problem
    }

    // 3. Award XP if new problems synced
    if (xpGained > 0) {
      const profile = await db.profile.findUnique({ where: { userId } });
      if (profile) {
        const newXp = profile.xp + xpGained;
        let newLevel = profile.level;

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
            title: newLevel >= 10 ? 'Elite Scholar' : newLevel >= 5 ? 'Growth Architect' : profile.title,
          },
        });

        // Log XP entries
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
    return { success: true, count: toInsert.length, xp: xpGained };
  } catch (err) {
    console.error('❌ Failed to sync DSA profile:', err);
    return { error: 'Database transaction failed.' };
  }
}
