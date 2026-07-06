'use client';

import { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { 
  Award, Lock, CheckCircle2, ShoppingBag, Palette, Sparkles, UserCheck, Flame
} from 'lucide-react';
import { purchaseTitle, purchaseTheme } from '@/app/actions/rewards';
import confetti from 'canvas-confetti';

interface Badge {
  id: string;
  title: string;
  description: string;
  iconUrl: string;
  xpReward: number;
  isUnlocked: boolean;
  unlockedAt: string | null;
}

interface Profile {
  xp: number;
  level: number;
  streak: number;
  streakFreezes: number;
  title: string;
}

interface Preference {
  theme: string;
}

interface RewardsDashboardProps {
  initialBadges: Badge[];
  profile: Profile | null;
  preference: Preference | null;
}

const SHOP_TITLES = [
  { name: 'Algorithmic Master', cost: 400, description: 'Display your command over data structures.' },
  { name: 'Deep Thinker', cost: 250, description: 'For scholars who spend hours focusing.' },
  { name: 'Consistency Overlord', cost: 350, description: 'Celebrate your streak achievements.' },
];

const SHOP_THEMES = [
  { id: 'neon-cyberpunk', name: 'Neon Cyberpunk', cost: 300, description: 'Vibrant neon violet and cyan borders.' },
  { id: 'emerald-forest', name: 'Emerald Forest', cost: 300, description: 'Organic deep emerald and jade borders.' },
  { id: 'midnight-aurora', name: 'Midnight Aurora', cost: 350, description: 'Draped purple and dynamic glowing lights.' },
];

export default function RewardsDashboard({ initialBadges, profile, preference }: RewardsDashboardProps) {
  const [badges] = useState<Badge[]>(initialBadges);
  const [isPending, startTransition] = useTransition();

  const handleBuyTitle = (titleName: string, cost: number) => {
    if (!profile || profile.xp < cost) return;
    if (!confirm(`Spend ${cost} XP to purchase the title "${titleName}"?`)) return;

    startTransition(async () => {
      const res = await purchaseTitle(titleName, cost);
      if (res?.success) {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#a78bfa', '#f472b6', '#3b82f6'],
        });
        window.location.reload();
      } else if (res?.error) {
        alert(res.error);
      }
    });
  };

  const handleBuyTheme = (themeId: string, themeName: string, cost: number) => {
    if (!profile || profile.xp < cost) return;
    if (preference?.theme === themeId) {
      alert('You already have this theme applied!');
      return;
    }
    if (!confirm(`Spend ${cost} XP to purchase and apply the "${themeName}" theme?`)) return;

    startTransition(async () => {
      const res = await purchaseTheme(themeId, cost);
      if (res?.success) {
        confetti({
          particleCount: 150,
          spread: 90,
          origin: { y: 0.6 },
          colors: ['#34d399', '#60a5fa', '#f59e0b'],
        });
        window.location.reload();
      } else if (res?.error) {
        alert(res.error);
      }
    });
  };

  // Helper mapping icon keys to react lucide nodes
  const renderBadgeIcon = (iconKey: string, unlocked: boolean) => {
    const colorClass = unlocked ? 'text-primary' : 'text-muted-foreground/40';
    
    if (iconKey.includes('sun')) return <Sparkles className={`h-6 w-6 ${colorClass}`} />;
    if (iconKey.includes('timer')) return <Award className={`h-6 w-6 ${colorClass}`} />;
    return <Award className={`h-6 w-6 ${colorClass}`} />;
  };

  return (
    <div className="space-y-8 text-left">
      {/* User profile stats indicator */}
      {profile && (
        <div className="rounded-3xl glass-panel p-6 flex items-center justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 h-24 w-24 bg-primary/5 rounded-full filter blur-2xl pointer-events-none" />
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-extrabold text-lg">
              {profile.level}
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Active Title</div>
              <h3 className="text-lg font-bold text-foreground mt-0.5">{profile.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Balance: <strong>{profile.xp} XP</strong> available</p>
            </div>
          </div>

          <div className="flex gap-4 text-xs font-semibold text-muted-foreground select-none">
            <span className="flex items-center gap-1">
              🔥 {profile.streak} Day streak
            </span>
            <span className="flex items-center gap-1">
              ❄️ {profile.streakFreezes} Freezes
            </span>
          </div>
        </div>
      )}

      {/* Accomplishment Badges Gallery */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary animate-pulse" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Unlocked Accomplishment Badges
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {badges.map((b) => (
            <div
              key={b.id}
              className={`rounded-3xl p-5 border relative overflow-hidden flex flex-col justify-between h-40 transition-all ${
                b.isUnlocked
                  ? 'bg-primary/5 border-primary/20 shadow-md shadow-primary/5'
                  : 'bg-white/[0.01] border-white/5 grayscale opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-11 w-11 rounded-2xl flex items-center justify-center border ${
                    b.isUnlocked ? 'bg-primary/10 border-primary/20' : 'bg-white/5 border-white/5'
                  }`}>
                    {renderBadgeIcon(b.iconUrl, b.isUnlocked)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{b.title}</h4>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">
                      +{b.xpReward} XP Reward
                    </p>
                  </div>
                </div>

                {b.isUnlocked ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                ) : (
                  <Lock className="h-4.5 w-4.5 text-muted-foreground/60 shrink-0" />
                )}
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {b.description}
              </p>

              {b.isUnlocked && b.unlockedAt && (
                <div className="text-[9px] text-primary/60 font-bold uppercase tracking-wider pt-2 border-t border-white/5">
                  Unlocked on {new Date(b.unlockedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Rewards Shop Grid split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
        {/* Custom Titles section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Profile Title Store
            </h3>
          </div>

          <div className="space-y-4">
            {SHOP_TITLES.map((t) => {
              const isOwned = profile?.title === t.name;
              const canAfford = profile ? profile.xp >= t.cost : false;

              return (
                <div
                  key={t.name}
                  className="rounded-3xl border border-white/5 bg-white/[0.01] p-4 flex items-center justify-between shadow-sm hover:border-white/10 transition-colors"
                >
                  <div className="pr-4 min-w-0">
                    <h4 className="text-sm font-bold text-foreground truncate">{t.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t.description}</p>
                  </div>

                  <button
                    disabled={isOwned || !canAfford || isPending}
                    onClick={() => handleBuyTitle(t.name, t.cost)}
                    className={`px-3.5 py-1.5 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
                      isOwned
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 cursor-default'
                        : canAfford
                        ? 'bg-primary text-primary-foreground hover:bg-primary/95 shadow-md shadow-primary/10'
                        : 'bg-white/5 text-muted-foreground border border-white/5 cursor-not-allowed opacity-50'
                    }`}
                  >
                    {isOwned ? 'Equipped' : `${t.cost} XP`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom Themes section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Workspace Themes Store
            </h3>
          </div>

          <div className="space-y-4">
            {SHOP_THEMES.map((t) => {
              const isOwned = preference?.theme === t.id;
              const canAfford = profile ? profile.xp >= t.cost : false;

              return (
                <div
                  key={t.id}
                  className="rounded-3xl border border-white/5 bg-white/[0.01] p-4 flex items-center justify-between shadow-sm hover:border-white/10 transition-colors"
                >
                  <div className="pr-4 min-w-0">
                    <h4 className="text-sm font-bold text-foreground truncate">{t.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t.description}</p>
                  </div>

                  <button
                    disabled={isOwned || !canAfford || isPending}
                    onClick={() => handleBuyTheme(t.id, t.name, t.cost)}
                    className={`px-3.5 py-1.5 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
                      isOwned
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 cursor-default'
                        : canAfford
                        ? 'bg-primary text-primary-foreground hover:bg-primary/95 shadow-md shadow-primary/10'
                        : 'bg-white/5 text-muted-foreground border border-white/5 cursor-not-allowed opacity-50'
                    }`}
                  >
                    {isOwned ? 'Applied' : `${t.cost} XP`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
