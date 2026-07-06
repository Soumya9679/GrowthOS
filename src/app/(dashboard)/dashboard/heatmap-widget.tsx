'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, HelpCircle } from 'lucide-react';

interface ActivityLog {
  date: Date;
  count: number; // overall actions logged that day
}

interface HeatmapProps {
  activityLogs: ActivityLog[];
}

export default function HeatmapWidget({ activityLogs }: HeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ date: string; count: number } | null>(null);

  // Generate 53 columns x 7 rows grid containing the last 371 days (aligned to preceding Sunday)
  const generateGridDays = () => {
    const today = new Date();
    const daysOffset = 364; // 52 weeks ago
    const startDate = new Date();
    startDate.setDate(today.getDate() - daysOffset);
    
    // Align grid to start on preceding Sunday
    const startDayOfWeek = startDate.getDay(); // 0 = Sunday, 6 = Saturday
    startDate.setDate(startDate.getDate() - startDayOfWeek);

    const grid = [];
    for (let i = 0; i < 53 * 7; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      grid.push(d);
    }
    return grid;
  };

  const gridDays = generateGridDays();

  // Maps dates to activity logs counts
  const getActivityLevel = (date: Date) => {
    const dateKey = date.toISOString().split('T')[0];
    const log = activityLogs.find((l) => {
      const logKey = new Date(l.date).toISOString().split('T')[0];
      return logKey === dateKey;
    });

    const count = log ? log.count : 0;
    if (count === 0) return { level: 0, count };
    if (count <= 2) return { level: 1, count };
    if (count <= 4) return { level: 2, count };
    if (count <= 6) return { level: 3, count };
    return { level: 4, count };
  };

  // Color mappings for levels
  const levelColors: Record<number, string> = {
    0: 'bg-zinc-900 border border-white/[0.02]',
    1: 'bg-emerald-950/60 border border-emerald-950/20',
    2: 'bg-emerald-800/80 border border-emerald-800/20',
    3: 'bg-emerald-600 border border-emerald-600/20',
    4: 'bg-emerald-500 border border-emerald-500/20 shadow-sm shadow-emerald-500/10',
  };

  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex flex-col h-full justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
            <Calendar className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Consistency Map
          </h3>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold">
          <span>Less</span>
          <div className="h-2.5 w-2.5 rounded bg-zinc-900 border border-white/[0.02]" />
          <div className="h-2.5 w-2.5 rounded bg-emerald-950/60" />
          <div className="h-2.5 w-2.5 rounded bg-emerald-800/80" />
          <div className="h-2.5 w-2.5 rounded bg-emerald-600" />
          <div className="h-2.5 w-2.5 rounded bg-emerald-500" />
          <span>More</span>
        </div>
      </div>

      {/* Heatmap Grid SVG Wrapper */}
      <div className="relative overflow-x-auto py-2 -mx-2 px-2 scrollbar-none flex gap-2">
        {/* Day of Week Labels */}
        <div className="flex flex-col justify-between text-[9px] text-muted-foreground/60 pr-2 pt-5 select-none font-bold">
          <span>Mon</span>
          <span>Wed</span>
          <span>Fri</span>
        </div>

        {/* Calendar Grid columns */}
        <div className="flex-1 flex flex-col gap-1.5 min-w-[620px]">
          {/* Month Headers */}
          <div className="flex justify-between text-[9px] text-muted-foreground/60 px-1 font-bold select-none h-4">
            <span>July</span>
            <span>Sep</span>
            <span>Nov</span>
            <span>Jan</span>
            <span>Mar</span>
            <span>May</span>
            <span>Today</span>
          </div>

          <div className="grid grid-flow-col grid-rows-7 gap-1.5">
            {gridDays.map((d, index) => {
              const { level, count } = getActivityLevel(d);
              const dateStr = d.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <div
                  key={index}
                  onMouseEnter={() => setHoveredCell({ date: dateStr, count })}
                  onMouseLeave={() => setHoveredCell(null)}
                  className={`h-2.5 w-2.5 rounded-xs transition-colors cursor-pointer ${levelColors[level]}`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Tooltip feedback block */}
      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-muted-foreground font-medium min-h-[30px]">
        {hoveredCell ? (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-foreground"
          >
            <strong>{hoveredCell.count} achievements & logs</strong> on {hoveredCell.date}
          </motion.span>
        ) : (
          <span className="flex items-center gap-1">
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60" />
            Hover over blocks to see daily xp logs details
          </span>
        )}
        <span className="hidden sm:block uppercase tracking-wider text-[10px] font-bold text-muted-foreground/60">
          Last 365 Days
        </span>
      </div>
    </div>
  );
}
