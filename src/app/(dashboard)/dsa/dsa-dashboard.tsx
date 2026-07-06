'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Code, RefreshCcw, ShieldAlert, Award, Calendar, AwardIcon, TrendingUp, BarChart3, HelpCircle
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend 
} from 'recharts';
import { syncDSAProfile } from '@/app/actions/dsa';
import confetti from 'canvas-confetti';

interface DSAProfile {
  leetcodeUsername: string;
  codeforcesUsername: string;
  geeksforgeeksUsername: string;
  leetcodeSolved: number;
  leetcodeEasy: number;
  leetcodeMedium: number;
  leetcodeHard: number;
  codeforcesSolved: number;
  geeksforgeeksSolved: number;
  lastSyncedAt: string | null;
}

interface DSADashboardProps {
  initialProfile: DSAProfile | null;
}

export default function DSADashboard({ initialProfile }: DSADashboardProps) {
  const router = useRouter();

  // Form states
  const [lcUser, setLcUser] = useState(initialProfile?.leetcodeUsername || '');
  const [cfUser, setCfUser] = useState(initialProfile?.codeforcesUsername || '');
  const [gfgUser, setGfgUser] = useState(initialProfile?.geeksforgeeksUsername || '');

  const [isPending, startTransition] = useTransition();

  const handleSync = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      const res = await syncDSAProfile({
        leetcodeUsername: lcUser,
        codeforcesUsername: cfUser,
        geeksforgeeksUsername: gfgUser,
      });

      if (res?.success) {
        confetti({
          particleCount: 85,
          spread: 70,
          origin: { y: 0.6 },
        });

        alert(`Sync Complete!\nTotal solved questions matched: ${res.totalSolved}\nNew questions fetched since last sync: +${res.count}\nEarned: +${res.xp} XP!`);
        router.refresh();
      } else if (res?.error) {
        alert(res.error);
      }
    });
  };

  // 1. Calculate Aggregates
  const leetcodeTotal = initialProfile?.leetcodeSolved || 0;
  const leetcodeEasy = initialProfile?.leetcodeEasy || 0;
  const leetcodeMedium = initialProfile?.leetcodeMedium || 0;
  const leetcodeHard = initialProfile?.leetcodeHard || 0;
  const codeforcesTotal = initialProfile?.codeforcesSolved || 0;
  const geeksforgeeksTotal = initialProfile?.geeksforgeeksSolved || 0;

  const grandTotalSolved = leetcodeTotal + codeforcesTotal + geeksforgeeksTotal;

  // 2. Prepare Recharts Pie Dataset
  const platformData = [
    { name: 'LeetCode', value: leetcodeTotal, color: '#f59e0b' },
    { name: 'Codeforces', value: codeforcesTotal, color: '#3b82f6' },
    { name: 'GeeksforGeeks', value: geeksforgeeksTotal, color: '#10b981' },
  ].filter(p => p.value > 0);

  // Fallback defaults for empty profiles so the chart doesn't look blank on initial load
  const chartData = platformData.length > 0 ? platformData : [
    { name: 'LeetCode (Demo)', value: 140, color: '#f59e0b' },
    { name: 'Codeforces (Demo)', value: 72, color: '#3b82f6' },
    { name: 'GeeksforGeeks (Demo)', value: 48, color: '#10b981' },
  ];

  const totalChartValue = chartData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch text-left">
      {/* Left Column: Settings handles & sync controller (md:col-span-4) */}
      <div className="md:col-span-4 rounded-3xl glass-panel p-6 shadow-sm flex flex-col justify-between space-y-6">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4.5 w-4.5 text-primary" />
            Synchronize Handles
          </h3>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            Enter your usernames. When synced, we connect to the public APIs, download your total solved counts, and calculate your aggregates.
          </p>
        </div>

        <form onSubmit={handleSync} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
              LeetCode Handle
            </label>
            <input
              type="text"
              value={lcUser}
              onChange={(e) => setLcUser(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-foreground placeholder-white/20"
              placeholder="e.g. rohan_codes"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Codeforces Handle
            </label>
            <input
              type="text"
              value={cfUser}
              onChange={(e) => setCfUser(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-foreground placeholder-white/20"
              placeholder="e.g. rohan_cf"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
              GeeksforGeeks Handle
            </label>
            <input
              type="text"
              value={gfgUser}
              onChange={(e) => setGfgUser(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-foreground placeholder-white/20"
              placeholder="e.g. rohan_gfg"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/95 transition-all shadow-md shadow-primary/10 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCcw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
            {isPending ? 'Syncing Profiles...' : 'Sync profiles'}
          </button>
        </form>

        {initialProfile?.lastSyncedAt ? (
          <div className="text-[9px] text-muted-foreground/80 uppercase font-semibold text-center border-t border-white/5 pt-4">
            Last synced: {new Date(initialProfile.lastSyncedAt).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        ) : (
          <div className="text-[9px] text-muted-foreground/60 uppercase font-semibold text-center border-t border-white/5 pt-4">
            Not synced yet. Connect handles above.
          </div>
        )}
      </div>

      {/* Right Column: Platform stats progress summary dashboards (md:col-span-8) */}
      <div className="md:col-span-8 space-y-6 flex flex-col justify-between">
        {/* Statistics highlights panels */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 select-none">
          <div className="bg-card/50 border border-border p-4 rounded-3xl text-center relative overflow-hidden flex flex-col justify-center">
            <div className="text-3xl font-extrabold text-foreground">{grandTotalSolved}</div>
            <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-1.5 flex items-center justify-center gap-1">
              <Award className="h-3.5 w-3.5 text-primary shrink-0" />
              Total Solved
            </div>
          </div>
          <div className="bg-card/50 border border-border p-4 rounded-3xl text-center flex flex-col justify-center">
            <div className="text-xl font-extrabold text-amber-500">{leetcodeTotal}</div>
            <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-1">LeetCode</div>
          </div>
          <div className="bg-card/50 border border-border p-4 rounded-3xl text-center flex flex-col justify-center">
            <div className="text-xl font-extrabold text-blue-400">{codeforcesTotal}</div>
            <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Codeforces</div>
          </div>
          <div className="bg-card/50 border border-border p-4 rounded-3xl text-center flex flex-col justify-center">
            <div className="text-xl font-extrabold text-emerald-400">{geeksforgeeksTotal}</div>
            <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-1">GeeksforGeeks</div>
          </div>
        </div>

        {/* Breakdown details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-stretch">
          {/* Radial Proportion Pie Chart */}
          <div className="rounded-3xl glass-panel p-5 shadow-sm flex flex-col h-[280px]">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-1 shrink-0">
              <BarChart3 className="h-3.5 w-3.5 text-primary" />
              Platform Share proportion
            </h4>

            <div className="flex-1 min-h-0 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                    itemStyle={{ fontSize: '10px', color: '#f4f4f5' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', color: '#f4f4f5' }} />
                </PieChart>
              </ResponsiveContainer>

              {/* Central absolute count overlay */}
              <div className="absolute top-[38%] left-[50%] -translate-x-[50%] -translate-y-[50%] text-center">
                <div className="text-lg font-black text-foreground">{totalChartValue}</div>
                <div className="text-[8px] text-muted-foreground uppercase font-bold tracking-wider">solved</div>
              </div>
            </div>
          </div>

          {/* LeetCode Difficulty breakdowns Progress Bars */}
          <div className="rounded-3xl glass-panel p-5 shadow-sm flex flex-col justify-between h-[280px]">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 shrink-0">
              <Code className="h-3.5 w-3.5 text-primary" />
              LeetCode Difficulty Levels
            </h4>

            <div className="space-y-4 flex-1 flex flex-col justify-center">
              {/* Easy Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-emerald-400">Easy Solved</span>
                  <span className="text-muted-foreground font-semibold">{leetcodeEasy} solved</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${leetcodeTotal > 0 ? (leetcodeEasy / leetcodeTotal) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Medium Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-amber-500">Medium Solved</span>
                  <span className="text-muted-foreground font-semibold">{leetcodeMedium} solved</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all"
                    style={{ width: `${leetcodeTotal > 0 ? (leetcodeMedium / leetcodeTotal) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Hard Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-rose-500">Hard Solved</span>
                  <span className="text-muted-foreground font-semibold">{leetcodeHard} solved</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-rose-500 h-full rounded-full transition-all"
                    style={{ width: `${leetcodeTotal > 0 ? (leetcodeHard / leetcodeTotal) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
