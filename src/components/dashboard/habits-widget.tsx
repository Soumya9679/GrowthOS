'use client';

import { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { Check, Flame, Trophy, Plus, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { toggleHabit } from '@/app/actions/habits';

interface Habit {
  id: string;
  name: string;
  description: string | null;
  logs: { date: Date; completed: boolean }[];
}

interface HabitsWidgetProps {
  habits: Habit[];
  todayStr: string;
}

export default function HabitsWidget({ habits, todayStr }: HabitsWidgetProps) {
  const [isPending, startTransition] = useTransition();
  
  // Track client optimistic checkbox state
  const [completedStates, setCompletedStates] = useState<Record<string, boolean>>(() => {
    const states: Record<string, boolean> = {};
    const today = new Date(todayStr);
    today.setHours(0, 0, 0, 0);

    habits.forEach((h) => {
      const isCompleted = h.logs.some((l) => {
        const d = new Date(l.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime() && l.completed;
      });
      states[h.id] = isCompleted;
    });
    return states;
  });

  const completedCount = Object.values(completedStates).filter(Boolean).length;
  const totalCount = habits.length;
  const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  const handleToggle = (habitId: string) => {
    const nextState = !completedStates[habitId];
    
    // 1. Optimistic Update
    setCompletedStates((prev) => ({
      ...prev,
      [habitId]: nextState,
    }));

    // 2. Trigger Server Action
    startTransition(async () => {
      const res = await toggleHabit(habitId, todayStr);
      
      if (res?.error) {
        // Rollback state on failure
        setCompletedStates((prev) => ({
          ...prev,
          [habitId]: !nextState,
        }));
        return;
      }

      // Trigger Confetti celebrations on level-up or perfect habit completion
      if (res?.leveledUp) {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#8b5cf6', '#a78bfa', '#f59e0b'],
        });
      } else if (nextState && completedCount + 1 === totalCount) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#10b981', '#34d399', '#60a5fa'],
        });
      }
    });
  };

  return (
    <div className="flex flex-col h-full justify-between">
      {/* Header section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Habit Consistency
            </h3>
            <p className="text-2xl font-bold text-foreground mt-1">
              {completedCount} <span className="text-muted-foreground text-sm">/ {totalCount} today</span>
            </p>
          </div>

          <div className="h-10 w-10 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center text-primary font-bold text-sm">
            {progressPercent}%
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-6">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
          />
        </div>

        {/* Habits Checklist */}
        <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
          {habits.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground border border-dashed border-white/5 rounded-2xl p-4">
              No habits configured yet. Go to Habits manager to initialize routines.
            </div>
          ) : (
            habits.map((h) => {
              const checked = completedStates[h.id];
              return (
                <div
                  key={h.id}
                  onClick={() => !isPending && handleToggle(h.id)}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                    checked
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-foreground'
                      : 'bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.02] text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="flex flex-col pr-4 truncate">
                    <span className={`text-sm font-medium ${checked ? 'line-through opacity-75' : ''}`}>
                      {h.name}
                    </span>
                    {h.description && (
                      <span className="text-[11px] text-muted-foreground/80 mt-0.5 truncate max-w-[200px]">
                        {h.description}
                      </span>
                    )}
                  </div>

                  <button
                    disabled={isPending}
                    className={`h-5 w-5 rounded-lg border flex items-center justify-center transition-all ${
                      checked
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20'
                        : 'border-white/20 bg-transparent group-hover:border-white/30'
                    }`}
                  >
                    {checked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer motivational widget */}
      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-muted-foreground font-medium">
        <span className="flex items-center gap-1.5">
          <Flame className="h-4 w-4 text-amber-500 animate-pulse" />
          Streaks level up XP triggers!
        </span>
        <span className="flex items-center gap-1">
          <Trophy className="h-3.5 w-3.5 text-primary" />
          +20 XP per habit
        </span>
      </div>
    </div>
  );
}
