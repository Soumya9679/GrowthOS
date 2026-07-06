'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Flame, RotateCcw, Trash2, Edit2, 
  Calendar, Check, ChevronLeft, ChevronRight, X, Sparkles, AlertCircle
} from 'lucide-react';
import { 
  createHabit, updateHabit, deleteHabit, toggleHabit, redeemStreakFreeze 
} from '@/app/actions/habits';
import confetti from 'canvas-confetti';

interface HabitLog {
  id: string;
  date: string;
  completed: boolean;
}

interface Habit {
  id: string;
  name: string;
  description: string;
  frequency: string;
  logs: HabitLog[];
}

interface Profile {
  xp: number;
  level: number;
  streak: number;
  streakFreezes: number;
}

interface HabitsDashboardProps {
  initialHabits: Habit[];
  profile: Profile | null;
}

export default function HabitsDashboard({ initialHabits, profile }: HabitsDashboardProps) {
  const [habits, setHabits] = useState<Habit[]>(initialHabits);
  const [selectedHabitId, setSelectedHabitId] = useState<string>(
    initialHabits.length > 0 ? initialHabits[0].id : ''
  );
  
  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState('DAILY');

  // Calendar navigation state
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()); // 0-indexed

  const [isPending, startTransition] = useTransition();

  const activeHabit = habits.find((h) => h.id === selectedHabitId) || habits[0] || null;

  const handleToggleToday = (habitId: string) => {
    const todayStr = new Date().toISOString();
    
    // Optimistic toggle
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h;
        
        const today = new Date(todayStr);
        today.setHours(0,0,0,0);
        
        const existingIdx = h.logs.findIndex((l) => {
          const d = new Date(l.date);
          d.setHours(0,0,0,0);
          return d.getTime() === today.getTime();
        });

        const newLogs = [...h.logs];
        if (existingIdx >= 0) {
          // Remove log
          newLogs.splice(existingIdx, 1);
        } else {
          // Add log
          newLogs.push({
            id: 'temp-id',
            date: today.toISOString(),
            completed: true,
          });
        }
        return { ...h, logs: newLogs };
      })
    );

    startTransition(async () => {
      const res = await toggleHabit(habitId, todayStr);
      if (res?.error) {
        // Rollback on error
        setHabits(initialHabits);
        return;
      }
      
      if (res?.leveledUp) {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      }
    });
  };

  const handleCreateHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    startTransition(async () => {
      const res = await createHabit(name, description, frequency);
      if (!res.error && res.habit) {
        const added: Habit = {
          id: res.habit.id,
          name: res.habit.name,
          description: res.habit.description || '',
          frequency: res.habit.frequency,
          logs: [],
        };
        setHabits((prev) => [added, ...prev]);
        setSelectedHabitId(added.id);
        setIsAddOpen(false);
        setName('');
        setDescription('');
      }
    });
  };

  const handleEditHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHabit) return;

    startTransition(async () => {
      const res = await updateHabit(editingHabit.id, name, description, frequency);
      if (!res.error && res.habit) {
        setHabits((prev) =>
          prev.map((h) =>
            h.id === editingHabit.id
              ? { ...h, name: res.habit.name, description: res.habit.description || '', frequency: res.habit.frequency }
              : h
          )
        );
        setIsEditOpen(false);
        setEditingHabit(null);
        setName('');
        setDescription('');
      }
    });
  };

  const handleDeleteHabit = (habitId: string) => {
    if (!confirm('Are you sure you want to delete this habit? All log history will be permanently wiped.')) return;

    setHabits((prev) => prev.filter((h) => h.id !== habitId));
    if (selectedHabitId === habitId) {
      setSelectedHabitId(habits.find((h) => h.id !== habitId)?.id || '');
    }

    startTransition(async () => {
      await deleteHabit(habitId);
    });
  };

  const handleRedeemFreeze = () => {
    if (!profile) return;
    if (profile.xp < 200) {
      alert('You need at least 200 XP to redeem a Streak Freeze.');
      return;
    }

    if (!confirm('Redeem 1 Streak Freeze for 200 XP? This will subtract 200 XP from your profile.')) return;

    startTransition(async () => {
      const res = await redeemStreakFreeze();
      if (res?.success) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#3b82f6', '#60a5fa', '#93c5fd'],
        });
        window.location.reload(); // Refresh session states
      }
    });
  };

  // Calendar logic helpers
  const getDaysInMonth = (year: number, month: number) => {
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  const monthDays = getDaysInMonth(currentYear, currentMonth);
  const startDayOfWeek = monthDays[0].getDay(); // 0: Sunday, 6: Saturday

  const getLogStatus = (date: Date) => {
    if (!activeHabit) return 'none';
    const dateKey = date.toISOString().split('T')[0];
    
    const isCompleted = activeHabit.logs.some((l) => {
      const logKey = new Date(l.date).toISOString().split('T')[0];
      return logKey === dateKey && l.completed;
    });

    if (isCompleted) return 'completed';

    // If date is today, and not checked, return 'none'
    // If date is in the past, and not checked, return 'missed'
    const today = new Date();
    today.setHours(0,0,0,0);
    const cellDate = new Date(date);
    cellDate.setHours(0,0,0,0);

    if (cellDate.getTime() === today.getTime()) return 'none';
    if (cellDate < today) return 'missed';
    return 'future';
  };

  // Monthly stats calculations
  const getMonthlyStats = () => {
    if (!activeHabit) return { rate: 0, checkedCount: 0 };
    
    let checkedCount = 0;
    let totalEligibleDays = 0;
    const today = new Date();
    today.setHours(0,0,0,0);

    monthDays.forEach((d) => {
      const cellDate = new Date(d);
      cellDate.setHours(0,0,0,0);

      // Only count days in the past or today
      if (cellDate <= today) {
        totalEligibleDays += 1;
        const dateKey = cellDate.toISOString().split('T')[0];
        const isDone = activeHabit.logs.some((l) => {
          const logKey = new Date(l.date).toISOString().split('T')[0];
          return logKey === dateKey && l.completed;
        });
        if (isDone) checkedCount += 1;
      }
    });

    const rate = totalEligibleDays === 0 ? 0 : Math.round((checkedCount / totalEligibleDays) * 100);
    return { rate, checkedCount };
  };

  const { rate: monthlyRate, checkedCount: monthlyChecked } = getMonthlyStats();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner stats */}
      {profile && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-3xl glass-panel p-6 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
                <Flame className="h-6 w-6 fill-current animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Active Streak</h4>
                <div className="text-2xl font-bold text-foreground mt-0.5">{profile.streak} Days</div>
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground bg-white/5 px-2 py-1 rounded-full uppercase tracking-wider font-semibold">
              Level {profile.level} Multipliers
            </div>
          </div>

          <div className="rounded-3xl glass-panel p-6 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                <span className="text-lg font-bold">❄️</span>
              </div>
              <div>
                <h4 className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Streak Freezes</h4>
                <div className="text-2xl font-bold text-foreground mt-0.5">{profile.streakFreezes} Available</div>
              </div>
            </div>
            <button
              onClick={handleRedeemFreeze}
              disabled={profile.xp < 200 || isPending}
              className="px-3.5 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-semibold text-xs transition-all shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Buy with 200 XP
            </button>
          </div>

          <div className="rounded-3xl glass-panel p-6 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Experience</h4>
                <div className="text-2xl font-bold text-foreground mt-0.5">{profile.xp} XP</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground font-medium">
              Next level: {Math.round(100 * Math.pow(profile.level, 1.5))} XP
            </div>
          </div>
        </div>
      )}

      {/* Main panel layout split */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Panel: Habits List (md:col-span-5) */}
        <div className="md:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Routine Checklist
            </h3>
            <button
              onClick={() => setIsAddOpen(true)}
              className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:bg-primary/95 shadow-md shadow-primary/10 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              New Habit
            </button>
          </div>

          <div className="space-y-3">
            {habits.length === 0 ? (
              <div className="text-center py-12 text-xs text-muted-foreground border border-dashed border-white/5 rounded-3xl p-6">
                No habits configured. Initialize your routine to start.
              </div>
            ) : (
              habits.map((h) => {
                const isSelected = selectedHabitId === h.id;
                
                // Check if completed today
                const today = new Date();
                today.setHours(0,0,0,0);
                const isCompletedToday = h.logs.some((l) => {
                  const d = new Date(l.date);
                  d.setHours(0,0,0,0);
                  return d.getTime() === today.getTime() && l.completed;
                });

                return (
                  <div
                    key={h.id}
                    onClick={() => setSelectedHabitId(h.id)}
                    className={`rounded-3xl p-4 border transition-all cursor-pointer relative select-none flex items-center justify-between ${
                      isSelected
                        ? 'bg-primary/5 border-primary/25 shadow-md shadow-primary/5'
                        : 'bg-card/60 border-border hover:border-white/10 hover:bg-card'
                    }`}
                  >
                    <div className="min-w-0 pr-4">
                      <h4 className="text-sm font-bold text-foreground truncate">
                        {h.name}
                      </h4>
                      {h.description && (
                        <p className="text-xs text-muted-foreground mt-1 truncate max-w-[240px]">
                          {h.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Edit/Delete Actions */}
                      {isSelected && (
                        <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingHabit(h);
                              setName(h.name);
                              setDescription(h.description);
                              setFrequency(h.frequency);
                              setIsEditOpen(true);
                            }}
                            className="p-1 rounded hover:bg-white/5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteHabit(h.id);
                            }}
                            className="p-1 rounded hover:bg-white/5 text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Today Completion Circle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleToday(h.id);
                        }}
                        className={`h-7 w-7 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                          isCompletedToday
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20'
                            : 'border-white/20 bg-transparent hover:border-white/30'
                        }`}
                      >
                        {isCompletedToday && <Check className="h-4.5 w-4.5 stroke-[3]" />}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Calendar Grid & Analysis (md:col-span-7) */}
        <div className="md:col-span-7 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Consistency Analysis
          </h3>

          {activeHabit ? (
            <div className="rounded-3xl glass-panel p-6 shadow-sm space-y-6">
              {/* Header Info */}
              <div className="flex items-start justify-between border-b border-white/5 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    {activeHabit.name}
                  </h2>
                  {activeHabit.description && (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {activeHabit.description}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {activeHabit.frequency} target
                  </div>
                </div>
              </div>

              {/* Monthly Calendar Grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-sm font-semibold text-foreground">
                    {monthNames[currentMonth]} {currentYear}
                  </h4>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handlePrevMonth}
                      className="p-1 rounded hover:bg-white/5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    >
                      <ChevronLeft className="h-4.5 w-4.5" />
                    </button>
                    <button
                      onClick={handleNextMonth}
                      className="p-1 rounded hover:bg-white/5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    >
                      <ChevronRight className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>

                {/* Grid */}
                <div>
                  {/* Days labels */}
                  <div className="grid grid-cols-7 text-center text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider mb-2 select-none">
                    <span>Sun</span>
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {/* Padding cells */}
                    {Array.from({ length: startDayOfWeek }).map((_, i) => (
                      <div key={`pad-${i}`} className="aspect-square bg-transparent" />
                    ))}

                    {/* Actual Calendar Days cells */}
                    {monthDays.map((d) => {
                      const status = getLogStatus(d);
                      const dayNumber = d.getDate();
                      
                      let cellClass = 'bg-white/[0.01] border-white/5 text-muted-foreground';
                      if (status === 'completed') {
                        cellClass = 'bg-emerald-500 border-emerald-500 text-white font-bold shadow-md shadow-emerald-500/10';
                      } else if (status === 'missed') {
                        cellClass = 'bg-rose-500/10 border-rose-500/20 text-rose-400 font-medium';
                      }

                      return (
                        <div
                          key={d.toISOString()}
                          className={`aspect-square rounded-2xl border flex items-center justify-center text-xs relative select-none transition-all ${cellClass}`}
                        >
                          {dayNumber}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Statistics details */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5 text-center">
                <div className="bg-white/[0.01] border border-white/5 p-3 rounded-2xl">
                  <div className="text-xl font-bold text-foreground">{monthlyRate}%</div>
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Monthly Rate</div>
                </div>
                <div className="bg-white/[0.01] border border-white/5 p-3 rounded-2xl">
                  <div className="text-xl font-bold text-foreground">{monthlyChecked}</div>
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Check-ins</div>
                </div>
                <div className="bg-white/[0.01] border border-white/5 p-3 rounded-2xl font-medium">
                  <div className="text-xl font-bold text-foreground flex items-center justify-center gap-1 text-amber-500">
                    🔥 {activeHabit.logs.length > 0 ? 'Active' : '0'}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Record Streak</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl glass-panel p-12 text-center text-sm text-muted-foreground border border-dashed border-white/5 shadow-sm">
              Please create and select a habit to view detailed logs calendars.
            </div>
          )}
        </div>
      </div>

      {/* ADD HABIT MODAL */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-[460px] rounded-3xl glass-panel p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setIsAddOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <h3 className="text-lg font-bold text-foreground mb-4">
                Configure New Habit
              </h3>

              <form onSubmit={handleCreateHabit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Habit Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-foreground"
                    placeholder="Write code, Gym workout..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-foreground resize-none"
                    placeholder="E.g., Solve 2 Medium DP problems on Leetcode..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Repeat Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input text-sm text-foreground bg-card cursor-pointer"
                  >
                    <option value="DAILY">Every Single Day</option>
                    <option value="WEEKLY">3 Times a Week</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/95 transition-all shadow-md shadow-primary/10 cursor-pointer disabled:opacity-50"
                >
                  {isPending ? 'Syncing...' : 'Establish Habit'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT HABIT MODAL */}
      <AnimatePresence>
        {isEditOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-[460px] rounded-3xl glass-panel p-6 shadow-2xl relative"
            >
              <button
                onClick={() => {
                  setIsEditOpen(false);
                  setEditingHabit(null);
                  setName('');
                  setDescription('');
                }}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <h3 className="text-lg font-bold text-foreground mb-4">
                Modify Habit Settings
              </h3>

              <form onSubmit={handleEditHabit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Habit Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-foreground resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Repeat Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input text-sm text-foreground bg-card cursor-pointer"
                  >
                    <option value="DAILY">Every Single Day</option>
                    <option value="WEEKLY">3 Times a Week</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/95 transition-all shadow-md shadow-primary/10 cursor-pointer disabled:opacity-50"
                >
                  {isPending ? 'Syncing...' : 'Save Settings'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
