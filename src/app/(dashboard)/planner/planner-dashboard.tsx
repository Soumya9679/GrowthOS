'use client';

import { useState, useEffect, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Clock, Trash2, Edit2, X, AlertTriangle, ChevronRight, Check
} from 'lucide-react';
import { createTimeBlock, updateTimeBlock, deleteTimeBlock } from '@/app/actions/planner';

interface TimeBlock {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  color: string;
  notes: string;
}

interface PlannerDashboardProps {
  initialBlocks: TimeBlock[];
}

const HOUR_HEIGHT = 50; // Each hour block is 50px high

const COLORS = [
  { hex: '#6366f1', label: 'Indigo' },
  { hex: '#3b82f6', label: 'Blue' },
  { hex: '#10b981', label: 'Emerald' },
  { hex: '#8b5cf6', label: 'Violet' },
  { hex: '#ec4899', label: 'Pink' },
  { hex: '#f59e0b', label: 'Amber' },
  { hex: '#ef4444', label: 'Rose' },
];

export default function PlannerDashboard({ initialBlocks }: PlannerDashboardProps) {
  const [blocks, setBlocks] = useState<TimeBlock[]>(initialBlocks);
  const [activeBlock, setActiveBlock] = useState<TimeBlock | null>(null);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [startHourStr, setStartHourStr] = useState('09:00');
  const [endHourStr, setEndHourStr] = useState('10:00');
  const [color, setColor] = useState('#6366f1');
  const [notes, setNotes] = useState('');

  // Live time indicator state
  const [currentTimeY, setCurrentTimeY] = useState<number | null>(null);

  const [isPending, startTransition] = useTransition();

  // Track live clock Y position
  useEffect(() => {
    const calculateTimeY = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const totalHours = hours + minutes / 60;
      setCurrentTimeY(totalHours * HOUR_HEIGHT);
    };

    calculateTimeY();
    const interval = setInterval(calculateTimeY, 30000); // Update Y position every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getFullDateTimeString = (timeStr: string) => {
    const today = new Date();
    const [h, m] = timeStr.split(':');
    today.setHours(parseInt(h), parseInt(m), 0, 0);
    return today.toISOString();
  };

  const handleCreateBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const startISO = getFullDateTimeString(startHourStr);
    const endISO = getFullDateTimeString(endHourStr);

    const inputData = {
      title,
      startTime: startISO,
      endTime: endISO,
      color,
      notes,
    };

    startTransition(async () => {
      const res = await createTimeBlock(inputData);
      if (!res.error && res.block) {
        const added: TimeBlock = {
          id: res.block.id,
          title: res.block.title,
          startTime: res.block.startTime.toISOString(),
          endTime: res.block.endTime.toISOString(),
          color: res.block.color,
          notes: res.block.notes || '',
        };
        setBlocks((prev) => [...prev, added]);
        setIsAddOpen(false);
        setTitle('');
        setNotes('');
        setStartHourStr('09:00');
        setEndHourStr('10:00');
      } else if (res.error) {
        alert(res.error);
      }
    });
  };

  const handleEditBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBlock) return;

    const startISO = getFullDateTimeString(startHourStr);
    const endISO = getFullDateTimeString(endHourStr);

    const inputData = {
      title,
      startTime: startISO,
      endTime: endISO,
      color,
      notes,
    };

    startTransition(async () => {
      const res = await updateTimeBlock(activeBlock.id, inputData);
      if (!res.error && res.block) {
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === activeBlock.id
              ? {
                  ...b,
                  title: res.block.title,
                  startTime: res.block.startTime.toISOString(),
                  endTime: res.block.endTime.toISOString(),
                  color: res.block.color,
                  notes: res.block.notes || '',
                }
              : b
          )
        );
        setIsEditOpen(false);
        setActiveBlock(null);
        setTitle('');
        setNotes('');
      } else if (res.error) {
        alert(res.error);
      }
    });
  };

  const handleDeleteBlock = (blockId: string) => {
    if (!confirm('Are you sure you want to delete this scheduled block?')) return;

    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    setIsEditOpen(false);
    setActiveBlock(null);

    startTransition(async () => {
      await deleteTimeBlock(blockId);
    });
  };

  const formatHourLabel = (hour24: number) => {
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    const displayHour = hour24 % 12 || 12;
    return `${displayHour.toString().padStart(2, '0')}:00 ${ampm}`;
  };

  // Convert ISO Date strings into coordinates ratios
  const getBlockStyles = (block: TimeBlock) => {
    const start = new Date(block.startTime);
    const end = new Date(block.endTime);

    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;

    const top = startHour * HOUR_HEIGHT;
    const height = (endHour - startHour) * HOUR_HEIGHT;

    return {
      top: `${top}px`,
      height: `${height}px`,
    };
  };

  const formatTimeLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const h = date.getHours();
    const m = date.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  };

  return (
    <div className="space-y-6">
      {/* Date Header Controller */}
      <div className="flex items-center justify-between bg-card/40 border border-border p-4 rounded-3xl backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            Today: {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl hover:bg-primary/95 shadow-md shadow-primary/10 transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Schedule Block
        </button>
      </div>

      {/* 24 Hour Scrollable Grid layout */}
      <div className="rounded-3xl border border-border bg-card/30 overflow-hidden relative backdrop-blur-md shadow-sm">
        {/* Time Line Scrollable Area */}
        <div className="overflow-y-auto max-h-[640px] relative scrollbar-thin">
          <div className="h-[1200px] relative w-full" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
            {/* Grid background Hour dividers */}
            {Array.from({ length: 24 }).map((_, hour) => (
              <div
                key={hour}
                className="absolute inset-x-0 border-t border-white/[0.03] flex items-center"
                style={{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
              >
                {/* Hour label on left */}
                <div className="w-20 text-right text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider pr-4 select-none">
                  {formatHourLabel(hour)}
                </div>
                {/* Vertical column separator */}
                <div className="w-[1px] h-full bg-white/[0.05]" />
                {/* Cell area */}
                <div className="flex-1 h-full" />
              </div>
            ))}

            {/* Scheduled Block Cards absolute overlays */}
            {blocks.map((b) => {
              const styles = getBlockStyles(b);
              return (
                <div
                  key={b.id}
                  onClick={() => {
                    setActiveBlock(b);
                    setTitle(b.title);
                    setNotes(b.notes);
                    // Extract hours for time pickers
                    const start = new Date(b.startTime);
                    const end = new Date(b.endTime);
                    setStartHourStr(`${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`);
                    setEndHourStr(`${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`);
                    setColor(b.color);
                    setIsEditOpen(true);
                  }}
                  className="absolute left-24 right-4 rounded-2xl border px-4 py-2.5 flex flex-col justify-between overflow-hidden cursor-pointer shadow-md transition-all scale-[0.99] hover:scale-[1.0] select-none text-left"
                  style={{
                    ...styles,
                    left: '6rem',
                    backgroundColor: `${b.color}0a`,
                    borderColor: `${b.color}35`,
                    color: b.color,
                  }}
                >
                  <div className="min-w-0 pr-4">
                    <h4 className="text-xs font-bold truncate text-foreground leading-snug">
                      {b.title}
                    </h4>
                    {b.notes && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1 leading-relaxed">
                        {b.notes}
                      </p>
                    )}
                  </div>

                  <span className="text-[9px] font-bold uppercase tracking-wider mt-1 flex items-center gap-1 opacity-75">
                    <Clock className="h-3 w-3" />
                    {formatTimeLabel(b.startTime)} - {formatTimeLabel(b.endTime)}
                  </span>
                </div>
              );
            })}

            {/* Live Clock Y Line Marker Overlay */}
            {currentTimeY !== null && (
              <div
                className="absolute inset-x-0 flex items-center pointer-events-none z-10"
                style={{ top: `${currentTimeY}px` }}
              >
                {/* Clock indicator tag */}
                <div className="w-20 pr-4 text-right">
                  <span className="text-[9px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-md shadow-sm leading-none tracking-tight">
                    {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                {/* Horizontal marker line */}
                <div className="flex-1 h-[2px] bg-primary relative shadow-[0_0_8px_hsl(var(--primary))]">
                  <div className="h-2 w-2 rounded-full bg-primary absolute -left-1 -top-[3px] shadow-[0_0_8px_hsl(var(--primary))]" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SCHEDULE BLOCK DIALOG MODAL */}
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
                Schedule Planner Block
              </h3>

              <form onSubmit={handleCreateBlock} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Block Title
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-foreground"
                    placeholder="E.g., Practice Leetcode DP, Reading, Coffee..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Notes / Description
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-foreground resize-none"
                    placeholder="Study plan notes, specific files..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Start Hour
                    </label>
                    <input
                      type="time"
                      required
                      value={startHourStr}
                      onChange={(e) => setStartHourStr(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-foreground cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      End Hour
                    </label>
                    <input
                      type="time"
                      required
                      value={endHourStr}
                      onChange={(e) => setEndHourStr(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-foreground cursor-pointer"
                    />
                  </div>
                </div>

                {/* Color Tags Selector */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Color Category Tag
                  </label>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setColor(c.hex)}
                        className={`h-6.5 w-6.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center`}
                        style={{
                          backgroundColor: `${c.hex}15`,
                          borderColor: color === c.hex ? c.hex : `${c.hex}40`,
                          color: c.hex,
                        }}
                      >
                        {color === c.hex && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/95 transition-all shadow-md shadow-primary/10 cursor-pointer disabled:opacity-50"
                >
                  {isPending ? 'Syncing...' : 'Allocate Block'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT/DELETE BLOCK DIALOG MODAL */}
      <AnimatePresence>
        {isEditOpen && activeBlock && (
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
                  setActiveBlock(null);
                  setTitle('');
                  setNotes('');
                }}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <h3 className="text-lg font-bold text-foreground mb-4">
                Modify Schedule Settings
              </h3>

              <form onSubmit={handleEditBlock} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Block Title
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
                    Notes / Description
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-foreground resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Start Hour
                    </label>
                    <input
                      type="time"
                      required
                      value={startHourStr}
                      onChange={(e) => setStartHourStr(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-foreground cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      End Hour
                    </label>
                    <input
                      type="time"
                      required
                      value={endHourStr}
                      onChange={(e) => setEndHourStr(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-foreground cursor-pointer"
                    />
                  </div>
                </div>

                {/* Color Tags Selector */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Color Category Tag
                  </label>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setColor(c.hex)}
                        className={`h-6.5 w-6.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center`}
                        style={{
                          backgroundColor: `${c.hex}15`,
                          borderColor: color === c.hex ? c.hex : `${c.hex}40`,
                          color: c.hex,
                        }}
                      >
                        {color === c.hex && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteBlock(activeBlock.id)}
                    className="py-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold hover:bg-destructive/20 cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Block
                  </button>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95 transition-all shadow-md shadow-primary/10 cursor-pointer disabled:opacity-50"
                  >
                    {isPending ? 'Syncing...' : 'Save Settings'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
