'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Target, Trash2, Edit2, X, ChevronRight, ChevronDown, Check, Activity, Percent
} from 'lucide-react';
import { createGoal, updateGoal, updateGoalProgress, deleteGoal } from '@/app/actions/goals';

interface Goal {
  id: string;
  title: string;
  description: string;
  type: 'LONG_TERM' | 'MONTHLY' | 'WEEKLY';
  status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
  progress: number;
  parentId: string;
  startDate: string | null;
  endDate: string | null;
}

interface GoalsDashboardProps {
  initialGoals: Goal[];
}

export default function GoalsDashboard({ initialGoals }: GoalsDashboardProps) {
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  
  // Tab selector: 'ALL' | 'LONG_TERM' | 'MONTHLY' | 'WEEKLY'
  const [activeTab, setActiveTab] = useState<'ALL' | 'LONG_TERM' | 'MONTHLY' | 'WEEKLY'>('ALL');
  
  // Expanded parent goals tracking list (shows child items)
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<Goal['type']>('WEEKLY');
  const [parentId, setParentId] = useState('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<Goal['status']>('ACTIVE');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [isPending, startTransition] = useTransition();

  const filteredGoals = goals.filter((g) => {
    if (activeTab === 'ALL') return true;
    return g.type === activeTab;
  });

  // Filters for parent goal drop downs
  const longTermGoals = goals.filter((g) => g.type === 'LONG_TERM');
  const monthlyGoals = goals.filter((g) => g.type === 'MONTHLY');

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const inputData = {
      title,
      description,
      type,
      parentId,
      progress,
      status,
      startDate: startDate || null,
      endDate: endDate || null,
    };

    startTransition(async () => {
      const res = await createGoal(inputData);
      if (!res.error && res.goal) {
        // Fetch fresh goals listing from server to ensure cascading progress sync is loaded
        window.location.reload();
      } else if (res.error) {
        alert(res.error);
      }
    });
  };

  const handleEditGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal) return;

    const inputData = {
      title,
      description,
      type,
      parentId,
      progress,
      status,
      startDate: startDate || null,
      endDate: endDate || null,
    };

    startTransition(async () => {
      const res = await updateGoal(editingGoal.id, inputData);
      if (!res.error) {
        window.location.reload();
      } else if (res.error) {
        alert(res.error);
      }
    });
  };

  const handleSliderProgressChange = (goalId: string, value: number) => {
    // 1. Optimistic update
    setGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, progress: value, status: value === 100 ? 'COMPLETED' : 'ACTIVE' } : g))
    );

    // 2. Trigger action in background
    startTransition(async () => {
      await updateGoalProgress(goalId, value);
    });
  };

  const handleDeleteGoal = (goalId: string) => {
    if (!confirm('Are you sure you want to delete this objective? All child sub-goal parent links will be cleared.')) return;

    setGoals((prev) => prev.filter((g) => g.id !== goalId));

    startTransition(async () => {
      await deleteGoal(goalId);
    });
  };

  const getChildGoals = (id: string) => {
    return goals.filter((g) => g.parentId === id);
  };

  return (
    <div className="space-y-6">
      {/* Navigation and tab controllers */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex gap-1.5 p-1 rounded-xl bg-white/5 border border-white/5">
          {(['ALL', 'LONG_TERM', 'MONTHLY', 'WEEKLY'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-all ${
                activeTab === tab
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'ALL' ? 'All Objectives' : tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setType(activeTab === 'ALL' ? 'WEEKLY' : activeTab);
            setIsAddOpen(true);
          }}
          className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl hover:bg-primary/95 shadow-md shadow-primary/10 transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add Objective
        </button>
      </div>

      {/* Main listing layout */}
      <div className="space-y-4">
        {filteredGoals.length === 0 ? (
          <div className="text-center py-16 text-xs text-muted-foreground border border-dashed border-white/5 rounded-3xl p-6">
            No goals matching the selected category.
          </div>
        ) : (
          filteredGoals
            .filter((g) => activeTab !== 'ALL' || !g.parentId) // On root View, hide child items so they display nested in their parents!
            .map((g) => {
              const children = getChildGoals(g.id);
              const isExpanded = expandedIds[g.id];
              const hasChildren = children.length > 0;

              return (
                <div
                  key={g.id}
                  className="rounded-3xl border border-border bg-card/60 p-5 shadow-sm space-y-4 hover:border-white/10 transition-all select-none text-left"
                >
                  {/* Goal header info */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => hasChildren && toggleExpand(g.id)}
                        disabled={!hasChildren}
                        className={`p-1 mt-0.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-all ${
                          !hasChildren ? 'opacity-20 cursor-default' : 'cursor-pointer'
                        }`}
                      >
                        {isExpanded ? <ChevronDown className="h-4.5 w-4.5" /> : <ChevronRight className="h-4.5 w-4.5" />}
                      </button>

                      <div className="min-w-0 pr-4">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-foreground truncate">
                            {g.title}
                          </h4>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                            g.type === 'LONG_TERM' 
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                              : g.type === 'MONTHLY'
                              ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                            {g.type.replace('_', ' ')}
                          </span>
                        </div>
                        {g.description && (
                          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-[500px]">
                            {g.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setEditingGoal(g);
                          setTitle(g.title);
                          setDescription(g.description);
                          setType(g.type);
                          setParentId(g.parentId);
                          setProgress(g.progress);
                          setStatus(g.status);
                          setStartDate(g.startDate ? g.startDate.split('T')[0] : '');
                          setEndDate(g.endDate ? g.endDate.split('T')[0] : '');
                          setIsEditOpen(true);
                        }}
                        className="p-1 rounded hover:bg-white/5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteGoal(g.id)}
                        className="p-1 rounded hover:bg-white/5 text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Goal Progress bar with inline Slider controller */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Activity className="h-3.5 w-3.5 text-primary" />
                        OKR Completion
                      </span>
                      <span className="text-foreground">{g.progress}%</span>
                    </div>

                    {g.type === 'WEEKLY' ? (
                      // Weekly goals can adjust progress via standard slider
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="10"
                        value={g.progress}
                        disabled={isPending}
                        onChange={(e) => handleSliderProgressChange(g.id, parseInt(e.target.value))}
                        className="w-full accent-primary h-1 bg-white/5 rounded-lg appearance-none cursor-pointer"
                      />
                    ) : (
                      // Parent goals progress is dynamically calculated and static!
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${g.progress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Nested child subgoals tree expansion overlay */}
                  <AnimatePresence>
                    {isExpanded && hasChildren && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pl-8 border-l border-white/5 space-y-3 pt-2 overflow-hidden"
                      >
                        {children.map((child) => (
                          <div
                            key={child.id}
                            className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.01] border border-white/5 text-xs text-foreground/90 font-medium"
                          >
                            <span className="truncate pr-4">{child.title}</span>
                            <div className="flex items-center gap-4 shrink-0">
                              <span className="text-[10px] text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">
                                {child.progress}% done
                              </span>
                              <span className={`text-[9px] px-2 py-0.5 rounded border uppercase font-bold tracking-wider ${
                                child.status === 'COMPLETED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-zinc-500/10 text-zinc-400 border-white/10'
                              }`}>
                                {child.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
        )}
      </div>

      {/* OBJECTIVE ADD MODAL */}
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
                Define New Objective
              </h3>

              <form onSubmit={handleCreateGoal} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Objective Title
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-foreground"
                    placeholder="Master dynamic programming..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Description / Key results
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-foreground resize-none"
                    placeholder="Solve 50 Medium DP problems on DP Syllabus..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Goal Type
                    </label>
                    <select
                      value={type}
                      onChange={(e) => {
                        const newType = e.target.value as Goal['type'];
                        setType(newType);
                        setParentId(''); // reset parent
                      }}
                      className="w-full px-3 py-2.5 rounded-xl glass-input text-sm text-foreground bg-card cursor-pointer"
                    >
                      <option value="WEEKLY">Weekly Checklist</option>
                      <option value="MONTHLY">Monthly Milestone</option>
                      <option value="LONG_TERM">Long-Term Vision</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Link Parent OKR
                    </label>
                    <select
                      value={parentId}
                      onChange={(e) => setParentId(e.target.value)}
                      disabled={type === 'LONG_TERM'}
                      className="w-full px-3 py-2.5 rounded-xl glass-input text-sm text-foreground bg-card cursor-pointer disabled:opacity-30"
                    >
                      <option value="">No Parent</option>
                      {type === 'WEEKLY' &&
                        monthlyGoals.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.title}
                          </option>
                        ))}
                      {type === 'MONTHLY' &&
                        longTermGoals.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.title}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-foreground cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Target Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-foreground cursor-pointer"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/95 transition-all shadow-md shadow-primary/10 cursor-pointer disabled:opacity-50"
                >
                  {isPending ? 'Syncing...' : 'Establish Objective'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OBJECTIVE EDIT MODAL */}
      <AnimatePresence>
        {isEditOpen && editingGoal && (
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
                  setEditingGoal(null);
                  setTitle('');
                  setDescription('');
                }}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <h3 className="text-lg font-bold text-foreground mb-4">
                Modify Objective Details
              </h3>

              <form onSubmit={handleEditGoal} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Objective Title
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Description / Key results
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-foreground resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Goal Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as Goal['status'])}
                      className="w-full px-3 py-2.5 rounded-xl glass-input text-sm text-foreground bg-card cursor-pointer"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="ABANDONED">Abandoned</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Link Parent OKR
                    </label>
                    <select
                      value={parentId}
                      onChange={(e) => setParentId(e.target.value)}
                      disabled={type === 'LONG_TERM'}
                      className="w-full px-3 py-2.5 rounded-xl glass-input text-sm text-foreground bg-card cursor-pointer disabled:opacity-30"
                    >
                      <option value="">No Parent</option>
                      {type === 'WEEKLY' &&
                        monthlyGoals.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.title}
                          </option>
                        ))}
                      {type === 'MONTHLY' &&
                        longTermGoals.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.title}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-foreground cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Target Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-foreground cursor-pointer"
                    />
                  </div>
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
