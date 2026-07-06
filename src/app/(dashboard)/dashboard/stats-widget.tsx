'use client';

import { motion } from 'framer-motion';
import { Target, CheckCircle2, Timer, Award } from 'lucide-react';

interface StatsProps {
  tasksDone: number;
  tasksTotal: number;
  focusMinutes: number;
  xpGainedToday: number;
  level: number;
}

export default function StatsWidget({ tasksDone, tasksTotal, focusMinutes, xpGainedToday, level }: StatsProps) {
  const stats = [
    {
      name: 'Focus Time',
      value: `${Math.round(focusMinutes)}m`,
      label: 'Pomodoro cycles completed',
      icon: Timer,
      color: 'text-primary bg-primary/10 border-primary/20',
    },
    {
      name: 'Tasks Done',
      value: `${tasksDone} / ${tasksTotal}`,
      label: 'Kanban cards completed',
      icon: CheckCircle2,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      name: 'Daily XP',
      value: `+${xpGainedToday}`,
      label: 'Experience gained today',
      icon: Award,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-3 h-full items-center gap-4">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.name}
            className="flex items-center gap-3.5 bg-white/[0.01] border border-white/5 p-4 rounded-2xl h-full"
          >
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center border shrink-0 ${stat.color}`}>
              <Icon className="h-5.5 w-5.5" />
            </div>
            
            <div className="min-w-0">
              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                {stat.name}
              </div>
              <div className="text-xl font-bold text-foreground mt-0.5">
                {stat.value}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 truncate hidden sm:block">
                {stat.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
