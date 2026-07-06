'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Code, RefreshCcw, Search, ExternalLink, Calendar, Code2, AlertCircle, CheckCircle2
} from 'lucide-react';
import { syncDSAProfile } from '@/app/actions/dsa';
import confetti from 'canvas-confetti';

interface DSAProfile {
  leetcodeUsername: string;
  codeforcesUsername: string;
  geeksforgeeksUsername: string;
  lastSyncedAt: string | null;
}

interface DSASubmission {
  id: string;
  problemName: string;
  platform: string;
  difficulty: string;
  date: string;
  notes: string;
}

interface DSADashboardProps {
  initialProfile: DSAProfile | null;
  initialSubmissions: DSASubmission[];
}

export default function DSADashboard({ initialProfile, initialSubmissions }: DSADashboardProps) {
  const [profile, setProfile] = useState<DSAProfile | null>(initialProfile);
  const [submissions, setSubmissions] = useState<DSASubmission[]>(initialSubmissions);

  // Form states
  const [lcUser, setLcUser] = useState(profile?.leetcodeUsername || '');
  const [cfUser, setCfUser] = useState(profile?.codeforcesUsername || '');
  const [gfgUser, setGfgUser] = useState(profile?.geeksforgeeksUsername || '');

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

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
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
        });

        // Simulating the API Sync by refreshing client arrays
        window.location.reload();
      } else if (res?.error) {
        alert(res.error);
      }
    });
  };

  // Filtered submissions
  const filteredSubmissions = submissions.filter((s) =>
    s.problemName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Submissions metrics counts
  const totalCount = submissions.length;
  const easyCount = submissions.filter((s) => s.difficulty.toLowerCase() === 'easy').length;
  const mediumCount = submissions.filter((s) => s.difficulty.toLowerCase() === 'medium').length;
  const hardCount = submissions.filter((s) => s.difficulty.toLowerCase() === 'hard').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start text-left">
      {/* Left Panel: Profile Connections (md:col-span-4) */}
      <div className="md:col-span-4 rounded-3xl glass-panel p-6 shadow-sm space-y-6">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Synchronize Handles
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Input handles to sync submissions and gain XP rewards.
          </p>
        </div>

        <form onSubmit={handleSync} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              LeetCode Handle
            </label>
            <input
              type="text"
              value={lcUser}
              onChange={(e) => setLcUser(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-foreground"
              placeholder="e.g., lc_coder"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Codeforces Handle
            </label>
            <input
              type="text"
              value={cfUser}
              onChange={(e) => setCfUser(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-foreground"
              placeholder="e.g., cf_expert"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              GeeksforGeeks Handle
            </label>
            <input
              type="text"
              value={gfgUser}
              onChange={(e) => setGfgUser(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-foreground"
              placeholder="e.g., gfg_expert"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/95 transition-all shadow-md shadow-primary/10 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCcw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
            {isPending ? 'Syncing Profiles...' : 'Sync profiles'}
          </button>
        </form>

        {profile?.lastSyncedAt && (
          <div className="text-[10px] text-muted-foreground/80 uppercase font-semibold text-center border-t border-white/5 pt-4">
            Last synced: {new Date(profile.lastSyncedAt).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}
      </div>

      {/* Right Panel: Submissions list & Stats (md:col-span-8) */}
      <div className="md:col-span-8 space-y-6">
        {/* Statistics grids */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-card/50 border border-border p-4 rounded-3xl text-center">
            <div className="text-2xl font-extrabold text-foreground">{totalCount}</div>
            <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Total Solved</div>
          </div>
          <div className="bg-card/50 border border-border p-4 rounded-3xl text-center">
            <div className="text-2xl font-extrabold text-emerald-400">{easyCount}</div>
            <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Easy</div>
          </div>
          <div className="bg-card/50 border border-border p-4 rounded-3xl text-center">
            <div className="text-2xl font-extrabold text-amber-400">{mediumCount}</div>
            <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Medium</div>
          </div>
          <div className="bg-card/50 border border-border p-4 rounded-3xl text-center">
            <div className="text-2xl font-extrabold text-rose-400">{hardCount}</div>
            <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Hard</div>
          </div>
        </div>

        {/* Submissions list feeds */}
        <div className="rounded-3xl glass-panel p-6 shadow-sm space-y-4">
          {/* Header search bar */}
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
              Synced Submissions
            </h3>

            <div className="relative flex-1 max-w-[260px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl glass-input text-xs text-foreground placeholder-muted-foreground/60"
                placeholder="Search problem name..."
              />
            </div>
          </div>

          {/* Submissions list */}
          <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
            {filteredSubmissions.length === 0 ? (
              <div className="text-center py-16 text-xs text-muted-foreground border border-dashed border-white/5 rounded-3xl p-6">
                No submissions found. Make sure profiles are configured and synced.
              </div>
            ) : (
              filteredSubmissions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="min-w-0 pr-4">
                    <h4 className="text-xs font-bold text-foreground truncate flex items-center gap-2">
                      <Code className="h-3.5 w-3.5 text-primary shrink-0" />
                      {s.problemName}
                    </h4>
                    
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1.5 font-medium">
                      <span className="flex items-center gap-1 uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded text-primary">
                        {s.platform}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(s.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                    s.difficulty.toLowerCase() === 'easy'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : s.difficulty.toLowerCase() === 'medium'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    {s.difficulty}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
