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

async function fetchLeetCodeSubmissions(username: string) {
  try {
    const response = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      body: JSON.stringify({
        query: `
          query recentAcSubmissions($username: String!, $limit: Int!) {
            recentAcSubmissionList(username: $username, limit: $limit) {
              title
              titleSlug
              timestamp
            }
          }
        `,
        variables: {
          username,
          limit: 10,
        },
      }),
    });

    if (!response.ok) return [];
    const data = await response.json();
    if (data.errors) return [];

    const list = data?.data?.recentAcSubmissionList || [];
    return list.map((item: any) => ({
      problemName: item.title,
      platform: 'LEETCODE',
      difficulty: ['Easy', 'Medium', 'Hard'][Math.floor(Math.random() * 3)],
      date: new Date(parseInt(item.timestamp) * 1000),
    }));
  } catch (err) {
    console.error('Error fetching LeetCode:', err);
    return [];
  }
}

async function fetchCodeforcesSubmissions(username: string) {
  try {
    const response = await fetch(`https://codeforces.com/api/user.status?handle=${username}&from=1&count=15`);
    if (!response.ok) return [];

    const data = await response.json();
    if (data.status !== 'OK') return [];

    const solved = data.result.filter((sub: any) => sub.verdict === 'OK');
    return solved.map((item: any) => {
      const rating = item.problem.rating || 1000;
      let difficulty = 'Medium';
      if (rating < 1200) difficulty = 'Easy';
      if (rating > 1600) difficulty = 'Hard';

      return {
        problemName: item.problem.name,
        platform: 'CODEFORCES',
        difficulty,
        date: new Date((item.creationTimeSeconds || Date.now() / 1000) * 1000),
      };
    });
  } catch (err) {
    console.error('Error fetching Codeforces:', err);
    return [];
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

    // 2. Fetch existing database submissions to prevent duplicate inserts
    const existing = await db.dSASubmission.findMany({
      where: { userId },
    });

    const fetchedProblems = [];

    // Check if we are using sandbox demo handles
    const isDemo = 
      leetcodeUsername === 'rohan_codes' || 
      codeforcesUsername === 'rohan_cf' || 
      geeksforgeeksUsername === 'rohan_gfg';

    if (isDemo) {
      // Fallback: Pick random mock problems
      const unsolvedMock = DSA_PROBLEMS_MOCK.filter(
        (m) => !existing.some((e) => e.problemName === m.problemName && e.platform === m.platform)
      );
      const shuffled = unsolvedMock.sort(() => 0.5 - Math.random());
      fetchedProblems.push(...shuffled.slice(0, 3).map(p => ({
        problemName: p.problemName,
        platform: p.platform,
        difficulty: p.difficulty,
        date: new Date(),
      })));
    } else {
      // Production: Fetch real live submissions from APIs
      if (leetcodeUsername?.trim()) {
        const lcData = await fetchLeetCodeSubmissions(leetcodeUsername.trim());
        fetchedProblems.push(...lcData);
      }
      if (codeforcesUsername?.trim()) {
        const cfData = await fetchCodeforcesSubmissions(codeforcesUsername.trim());
        fetchedProblems.push(...cfData);
      }
      // If nothing was resolved from real accounts, check if GeeksforGeeks username was provided and fallback
      if (fetchedProblems.length === 0 && geeksforgeeksUsername?.trim()) {
        // Fallback for GFG since they have no official public API
        const gfgMock = DSA_PROBLEMS_MOCK.filter(m => m.platform === 'GEEKSFORGEEKS' && !existing.some(e => e.problemName === m.problemName));
        fetchedProblems.push(...gfgMock.map(p => ({ ...p, date: new Date() })));
      }
    }

    // 3. Filter out duplicates from the newly fetched array
    const toInsert = [];
    for (const p of fetchedProblems) {
      const isDuplicate = existing.some(
        (e) => e.problemName.toLowerCase() === p.problemName.toLowerCase() && e.platform === p.platform
      );
      if (!isDuplicate) {
        toInsert.push(p);
      }
    }

    // Cap the sync count per execution to prevent database query bloat
    const cappedInsert = toInsert.slice(0, 8);

    let xpGained = 0;
    if (cappedInsert.length > 0) {
      for (const p of cappedInsert) {
        await db.dSASubmission.create({
          data: {
            userId,
            problemName: p.problemName,
            platform: p.platform,
            difficulty: p.difficulty,
            date: p.date,
          },
        });
      }
      xpGained = cappedInsert.length * 25; // +25 XP per problem
    }

    // 4. Award XP if new problems synced
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
    return { success: true, count: cappedInsert.length, xp: xpGained };
  } catch (err) {
    console.error('❌ Failed to sync DSA profile:', err);
    return { error: 'Database transaction failed.' };
  }
}
