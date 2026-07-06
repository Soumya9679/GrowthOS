'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Calendar, CheckSquare, Trash2, Edit2, 
  MoreHorizontal, ChevronRight, X, Clock, AlertTriangle, Check
} from 'lucide-react';
import { 
  createTask, updateTaskStatus, updateTask, deleteTask,
  createSubtask, toggleSubtask, deleteSubtask 
} from '@/app/actions/tasks';

interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate: string | null;
  projectId: string;
  projectName: string;
  subtasks: Subtask[];
}

interface Project {
  id: string;
  name: string;
}

interface KanbanBoardProps {
  initialTasks: Task[];
  projects: Project[];
}

const COLUMNS: { id: Task['status']; name: string; color: string; bg: string }[] = [
  { id: 'TODO', name: 'Backlog / Todo', color: 'bg-zinc-500', bg: 'bg-zinc-500/5 border-zinc-500/10' },
  { id: 'IN_PROGRESS', name: 'In Progress', color: 'bg-violet-500', bg: 'bg-violet-500/5 border-violet-500/10' },
  { id: 'IN_REVIEW', name: 'In Review', color: 'bg-amber-500', bg: 'bg-amber-500/5 border-amber-500/10' },
  { id: 'DONE', name: 'Completed', color: 'bg-emerald-500', bg: 'bg-emerald-500/5 border-emerald-500/10' },
];

const PRIORITIES: { id: Task['priority']; label: string; color: string }[] = [
  { id: 'URGENT', label: 'Urgent', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  { id: 'HIGH', label: 'High', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { id: 'MEDIUM', label: 'Medium', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { id: 'LOW', label: 'Low', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
];

export default function KanbanBoard({ initialTasks, projects }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  
  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTaskCol, setNewTaskCol] = useState<Task['status']>('TODO');
  
  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('MEDIUM');
  const [projectId, setProjectId] = useState('');
  const [dueDate, setDueDate] = useState('');
  
  // Subtask input state
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const [isPending, startTransition] = useTransition();

  // Helper mapping priority sorting weights
  const getPriorityWeight = (p: Task['priority']) => {
    switch (p) {
      case 'URGENT': return 4;
      case 'HIGH': return 3;
      case 'MEDIUM': return 2;
      case 'LOW': return 1;
      default: return 0;
    }
  };

  const handleStatusChange = (taskId: string, targetStatus: Task['status']) => {
    // 1. Optimistically update client state
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t))
    );

    // If the expanded detail task is open, sync its state too
    if (activeTask && activeTask.id === taskId) {
      setActiveTask((prev) => (prev ? { ...prev, status: targetStatus } : null));
    }

    // 2. Call Server Action
    startTransition(async () => {
      const res = await updateTaskStatus(taskId, targetStatus);
      if (res?.error) {
        // Rollback state on error
        setTasks(initialTasks);
        if (activeTask && activeTask.id === taskId) {
          setActiveTask(activeTask);
        }
      }
    });
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const inputData = {
      title,
      description,
      status: newTaskCol,
      priority,
      projectId,
      dueDate: dueDate || null,
    };

    startTransition(async () => {
      const res = await createTask(inputData);
      if (!res.error && res.task) {
        const added: Task = {
          id: res.task.id,
          title: res.task.title,
          description: res.task.description || '',
          status: res.task.status as Task['status'],
          priority: res.task.priority as Task['priority'],
          dueDate: res.task.dueDate ? res.task.dueDate.toISOString() : null,
          projectId: res.task.projectId || '',
          projectName: projects.find((p) => p.id === res.task.projectId)?.name || '',
          subtasks: [],
        };
        setTasks((prev) => [added, ...prev]);
        setIsAddOpen(false);
        // Reset form
        setTitle('');
        setDescription('');
        setPriority('MEDIUM');
        setProjectId('');
        setDueDate('');
      }
    });
  };

  const handleEditTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTask) return;

    const inputData = {
      title: activeTask.title,
      description: activeTask.description,
      status: activeTask.status,
      priority: activeTask.priority,
      projectId: activeTask.projectId,
      dueDate: activeTask.dueDate,
    };

    startTransition(async () => {
      const res = await updateTask(activeTask.id, inputData);
      if (!res.error) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === activeTask.id
              ? {
                  ...t,
                  title: activeTask.title,
                  description: activeTask.description,
                  priority: activeTask.priority,
                  projectId: activeTask.projectId,
                  projectName: projects.find((p) => p.id === activeTask.projectId)?.name || '',
                  dueDate: activeTask.dueDate,
                }
              : t
          )
        );
        setActiveTask(null);
      }
    });
  };

  const handleDeleteTask = (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setActiveTask(null);

    startTransition(async () => {
      await deleteTask(taskId);
    });
  };

  // Subtask Interactions
  const handleToggleSubtask = (subtaskId: string) => {
    if (!activeTask) return;

    // Optimistic toggle
    const updatedSubtasks = activeTask.subtasks.map((s) =>
      s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s
    );
    setActiveTask({ ...activeTask, subtasks: updatedSubtasks });
    setTasks((prev) =>
      prev.map((t) => (t.id === activeTask.id ? { ...t, subtasks: updatedSubtasks } : t))
    );

    startTransition(async () => {
      await toggleSubtask(subtaskId);
    });
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTask || !newSubtaskTitle.trim()) return;

    startTransition(async () => {
      const res = await createSubtask(activeTask.id, newSubtaskTitle);
      if (!res.error && res.subtask) {
        const added = {
          id: res.subtask.id,
          title: res.subtask.title,
          isCompleted: res.subtask.isCompleted,
        };
        const updated = [...activeTask.subtasks, added];
        setActiveTask({ ...activeTask, subtasks: updated });
        setTasks((prev) =>
          prev.map((t) => (t.id === activeTask.id ? { ...t, subtasks: updated } : t))
        );
        setNewSubtaskTitle('');
      }
    });
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    if (!activeTask) return;

    const updated = activeTask.subtasks.filter((s) => s.id !== subtaskId);
    setActiveTask({ ...activeTask, subtasks: updated });
    setTasks((prev) =>
      prev.map((t) => (t.id === activeTask.id ? { ...t, subtasks: updated } : t))
    );

    startTransition(async () => {
      await deleteSubtask(subtaskId);
    });
  };

  // Helper verifying overdue status
  const isOverdue = (dateStr: string | null, status: string) => {
    if (!dateStr || status === 'DONE') return false;
    return new Date(dateStr) < new Date(new Date().setHours(0,0,0,0));
  };

  return (
    <div className="space-y-6">
      {/* Board Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-210px)] overflow-hidden">
        {COLUMNS.map((col) => {
          const colTasks = tasks
            .filter((t) => t.status === col.id)
            .sort((a, b) => getPriorityWeight(b.priority) - getPriorityWeight(a.priority));

          return (
            <div
              key={col.id}
              className={`rounded-3xl p-4 flex flex-col h-full overflow-hidden ${col.bg} border`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
                  <span className="text-sm font-semibold text-foreground tracking-tight">
                    {col.name}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">
                    {colTasks.length}
                  </span>
                </div>

                <button
                  onClick={() => {
                    setNewTaskCol(col.id);
                    setIsAddOpen(true);
                  }}
                  className="p-1 rounded-md hover:bg-white/5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Tasks List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                {colTasks.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground/60 border border-dashed border-white/5 rounded-2xl p-4">
                    Empty column
                  </div>
                ) : (
                  colTasks.map((t) => {
                    const doneSubtasks = t.subtasks.filter((s) => s.isCompleted).length;
                    const totalSubtasks = t.subtasks.length;
                    const priorityDetails = PRIORITIES.find((p) => p.id === t.priority);
                    const overdue = isOverdue(t.dueDate, t.status);

                    return (
                      <motion.div
                        layout
                        key={t.id}
                        onClick={() => setActiveTask(t)}
                        className="rounded-2xl p-4 bg-card/60 hover:bg-card border border-border hover:border-white/10 hover:shadow-lg shadow-sm cursor-pointer select-none relative group transition-all"
                      >
                        {/* Priority & Status swap dropdown */}
                        <div className="flex items-center justify-between mb-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${priorityDetails?.color}`}>
                            {priorityDetails?.label}
                          </span>

                          <select
                            value={t.status}
                            disabled={isPending}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleStatusChange(t.id, e.target.value as Task['status']);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] bg-white/5 border border-white/5 text-muted-foreground group-hover:text-foreground font-semibold rounded px-1 py-0.5 focus:outline-none cursor-pointer"
                          >
                            <option value="TODO">Todo</option>
                            <option value="IN_PROGRESS">Progress</option>
                            <option value="IN_REVIEW">Review</option>
                            <option value="DONE">Done</option>
                          </select>
                        </div>

                        {/* Title */}
                        <h4 className="text-sm font-semibold text-foreground leading-snug truncate">
                          {t.title}
                        </h4>

                        {/* Subtasks Progress */}
                        {totalSubtasks > 0 && (
                          <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground font-semibold">
                            <CheckSquare className="h-3.5 w-3.5" />
                            <span>
                              {doneSubtasks}/{totalSubtasks} Checklist
                            </span>
                            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${(doneSubtasks / totalSubtasks) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Due Date & Project tags */}
                        {(t.dueDate || t.projectName) && (
                          <div className="mt-3.5 pt-3.5 border-t border-white/5 flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                            <span className={`flex items-center gap-1 ${overdue ? 'text-rose-400 font-bold' : ''}`}>
                              {t.dueDate && (
                                <>
                                  {overdue ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                  {new Date(t.dueDate).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </>
                              )}
                            </span>

                            {t.projectName && (
                              <span className="truncate bg-primary/5 px-2 py-0.5 rounded border border-primary/10 max-w-[120px] text-primary">
                                {t.projectName}
                              </span>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD TASK DIALOG MODAL */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-[500px] rounded-3xl glass-panel p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setIsAddOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <h3 className="text-lg font-bold text-foreground mb-4">
                Add Task to {COLUMNS.find((c) => c.id === newTaskCol)?.name}
              </h3>

              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Task Title
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-foreground"
                    placeholder="Implement auth redirects..."
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
                    placeholder="Provide details about sub-tasks or specs..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as Task['priority'])}
                      className="w-full px-3 py-2.5 rounded-xl glass-input text-sm text-foreground bg-card cursor-pointer"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Project Link
                    </label>
                    <select
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl glass-input text-sm text-foreground bg-card cursor-pointer"
                    >
                      <option value="">No Project</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-foreground cursor-pointer"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/95 transition-all shadow-md shadow-primary/10 cursor-pointer disabled:opacity-50"
                >
                  {isPending ? 'Syncing...' : 'Create Task card'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAILED TASK EDIT & SUBTASKS MODAL */}
      <AnimatePresence>
        {activeTask && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-[600px] rounded-3xl glass-panel p-6 shadow-2xl relative grid grid-cols-1 md:grid-cols-5 gap-6"
            >
              {/* Close Button */}
              <button
                onClick={() => setActiveTask(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors z-10"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Main task info editor (Left 60%) */}
              <div className="md:col-span-3 space-y-4">
                <div>
                  <input
                    type="text"
                    value={activeTask.title}
                    onChange={(e) => setActiveTask({ ...activeTask, title: e.target.value })}
                    className="w-full text-lg font-bold bg-transparent border-b border-transparent focus:border-white/10 py-1 focus:outline-none text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={activeTask.description}
                    onChange={(e) => setActiveTask({ ...activeTask, description: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs text-foreground resize-none leading-relaxed"
                    placeholder="Provide description..."
                  />
                </div>

                {/* Subtask Checklist Section */}
                <div className="space-y-3">
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Checklist Subtasks
                  </label>

                  {/* Add subtask input */}
                  <form onSubmit={handleAddSubtask} className="flex gap-2">
                    <input
                      type="text"
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl glass-input text-xs text-foreground"
                      placeholder="Add checklist item..."
                    />
                    <button
                      type="submit"
                      disabled={isPending}
                      className="px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-xs text-foreground hover:bg-white/10 cursor-pointer transition-all"
                    >
                      Add
                    </button>
                  </form>

                  {/* Subtask checklist list */}
                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    {activeTask.subtasks.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-white/[0.01] border border-white/5 text-xs"
                      >
                        <div
                          onClick={() => handleToggleSubtask(sub.id)}
                          className="flex items-center gap-2 cursor-pointer select-none flex-1 min-w-0"
                        >
                          <div className={`h-4.5 w-4.5 rounded border flex items-center justify-center transition-all ${
                            sub.isCompleted ? 'bg-primary border-primary text-white' : 'border-white/20'
                          }`}>
                            {sub.isCompleted && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                          <span className={`truncate ${sub.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {sub.title}
                          </span>
                        </div>

                        <button
                          onClick={() => handleDeleteSubtask(sub.id)}
                          className="p-1 rounded text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status details & Sidebar controls (Right 40%) */}
              <div className="md:col-span-2 bg-white/[0.01] border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Status selection */}
                  <div>
                    <label className="block text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Column Status
                    </label>
                    <select
                      value={activeTask.status}
                      onChange={(e) => handleStatusChange(activeTask.id, e.target.value as Task['status'])}
                      className="w-full px-2 py-1.5 rounded-lg glass-input text-xs text-foreground bg-card cursor-pointer"
                    >
                      <option value="TODO">Todo</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="IN_REVIEW">In Review</option>
                      <option value="DONE">Completed</option>
                    </select>
                  </div>

                  {/* Priority selection */}
                  <div>
                    <label className="block text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Task Priority
                    </label>
                    <select
                      value={activeTask.priority}
                      onChange={(e) => setActiveTask({ ...activeTask, priority: e.target.value as Task['priority'] })}
                      className="w-full px-2 py-1.5 rounded-lg glass-input text-xs text-foreground bg-card cursor-pointer"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>

                  {/* Project selection */}
                  <div>
                    <label className="block text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Linked Project
                    </label>
                    <select
                      value={activeTask.projectId}
                      onChange={(e) => setActiveTask({ ...activeTask, projectId: e.target.value })}
                      className="w-full px-2 py-1.5 rounded-lg glass-input text-xs text-foreground bg-card cursor-pointer"
                    >
                      <option value="">No Project</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Due Date selection */}
                  <div>
                    <label className="block text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={activeTask.dueDate ? activeTask.dueDate.split('T')[0] : ''}
                      onChange={(e) => setActiveTask({ ...activeTask, dueDate: e.target.value || null })}
                      className="w-full px-2 py-1.5 rounded-lg glass-input text-xs text-foreground cursor-pointer"
                    />
                  </div>
                </div>

                {/* Footer Save & Delete controls */}
                <div className="space-y-2 mt-6 pt-4 border-t border-white/5">
                  <button
                    onClick={handleEditTask}
                    disabled={isPending}
                    className="w-full py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:bg-primary/95 shadow-md shadow-primary/10 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    {isPending ? 'Syncing...' : 'Save Changes'}
                  </button>

                  <button
                    onClick={() => handleDeleteTask(activeTask.id)}
                    className="w-full py-2 bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold rounded-xl hover:bg-destructive/20 cursor-pointer transition-colors flex items-center justify-center gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Task
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
