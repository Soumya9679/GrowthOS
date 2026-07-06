'use server';

import db from '@/lib/db';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

const calculateXpThreshold = (level: number) => Math.round(100 * Math.pow(level, 1.5));

export async function purchaseTitle(titleName: string, priceXp: number) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  const userId = session.user.id;

  try {
    const profile = await db.profile.findUnique({ where: { userId } });
    if (!profile) return { error: 'Profile not found.' };

    if (profile.xp < priceXp) {
      return { error: `Insufficient XP. You need ${priceXp} XP to purchase this title.` };
    }

    const updatedXp = profile.xp - priceXp;

    // Recalculate level down if XP boundary crossed
    let newLevel = profile.level;
    let prevThreshold = calculateXpThreshold(newLevel - 1);
    while (newLevel > 1 && updatedXp < prevThreshold) {
      newLevel -= 1;
      prevThreshold = calculateXpThreshold(newLevel - 1);
    }

    await db.profile.update({
      where: { userId },
      data: {
        xp: updatedXp,
        level: newLevel,
        title: titleName,
      },
    });

    // Log the transaction in XP history
    await db.xPHistory.create({
      data: {
        userId,
        amount: -priceXp,
        source: 'SHOP_TITLE_PURCHASE',
      },
    });

    revalidatePath('/rewards');
    revalidatePath('/dashboard');
    return { success: true, title: titleName };
  } catch (err) {
    console.error('❌ Failed to purchase title:', err);
    return { error: 'Database transaction failed.' };
  }
}

export async function purchaseTheme(themeName: string, priceXp: number) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  const userId = session.user.id;

  try {
    const profile = await db.profile.findUnique({ where: { userId } });
    if (!profile) return { error: 'Profile not found.' };

    if (profile.xp < priceXp) {
      return { error: `Insufficient XP. You need ${priceXp} XP to unlock this theme.` };
    }

    const updatedXp = profile.xp - priceXp;

    // Recalculate level down if XP boundary crossed
    let newLevel = profile.level;
    let prevThreshold = calculateXpThreshold(newLevel - 1);
    while (newLevel > 1 && updatedXp < prevThreshold) {
      newLevel -= 1;
      prevThreshold = calculateXpThreshold(newLevel - 1);
    }

    // Update profile XP
    await db.profile.update({
      where: { userId },
      data: {
        xp: updatedXp,
        level: newLevel,
        title: newLevel >= 10 ? 'Elite Scholar' : newLevel >= 5 ? 'Growth Architect' : profile.title,
      },
    });

    // Update user preferences theme
    await db.userPreference.update({
      where: { userId },
      data: {
        theme: themeName,
      },
    });

    // Log the transaction in XP history
    await db.xPHistory.create({
      data: {
        userId,
        amount: -priceXp,
        source: 'SHOP_THEME_PURCHASE',
      },
    });

    revalidatePath('/rewards');
    revalidatePath('/dashboard');
    return { success: true, theme: themeName };
  } catch (err) {
    console.error('❌ Failed to unlock theme:', err);
    return { error: 'Database transaction failed.' };
  }
}
