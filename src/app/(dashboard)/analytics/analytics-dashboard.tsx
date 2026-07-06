'use client';

import { useState } from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { 
  Activity, Zap, Flame, ShieldAlert, BarChart3, TrendingUp, CheckCircle, Brain
} from 'lucide-react';

interface Snapshot {
  date: string;
  focusScore: number;
  velocity: number;
  burnout: number;
}

interface Stats {
  completedTasksCount: number;
  pendingTasksCount: number;
  habitsCount: number;
  weeklyHabitCheckIns: number;
  dsaProblemsCount: number;
  weeklyFocusData: { day: string; minutes: number }[];
}

interface AnalyticsDashboardProps {
  snapshots: Snapshot[];
  stats: Stats;
}

export default function AnalyticsDashboard({ snapshots, stats }: AnalyticsDashboardProps) {
  // Compute overall consistency numbers
  const totalTasks = stats.completedTasksCount + stats.pendingTasksCount;
  const taskCompletionRate = totalTasks > 0 ? Math.round((stats.completedTasksCount / totalTasks) * 100) : 0;

  // Calculate burnout warning: based on focus minutes in focus sessions
  const totalFocusMinutes = stats.weeklyFocusData.reduce((acc, curr) => acc + curr.minutes, 0);
  const averageDailyFocus = Math.round(totalFocusMinutes / 7);
  
  let burnoutRiskLevel = 'Low';
  let burnoutColor = 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
  let burnoutAdvice = 'Your study cycles look balanced. Maintain your current study-rest intervals.';

  if (averageDailyFocus > 150) {
    burnoutRiskLevel = 'High';
    burnoutColor = 'text-rose-400 border-rose-500/20 bg-rose-500/5';
    burnoutAdvice = 'Alert: Extreme study hours detected. Mandate 10-minute rest buffers and end screens by 10 PM.';
  } else if (averageDailyFocus > 90) {
    burnoutRiskLevel = 'Moderate';
    burnoutColor = 'text-amber-400 border-amber-500/20 bg-amber-500/5';
    burnoutAdvice = 'Caution: Focus hours are stacking up. Try inserting light physical stretches between focus blocks.';
  }

  return (
    <div className="space-y-6 text-left select-none">
      {/* Overview metric panels */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-3xl glass-panel p-5 shadow-sm border border-border flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
            <Zap className="h-5 w-5 fill-current text-primary" />
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Cognitive Velocity</div>
            <div className="text-xl font-extrabold text-foreground mt-0.5">1.8 Index</div>
          </div>
        </div>

        <div className="rounded-3xl glass-panel p-5 shadow-sm border border-border flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Task Completion</div>
            <div className="text-xl font-extrabold text-foreground mt-0.5">{taskCompletionRate}% Rate</div>
          </div>
        </div>

        <div className="rounded-3xl glass-panel p-5 shadow-sm border border-border flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Flame className="h-5 w-5 text-amber-400 fill-current" />
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Habit check-ins</div>
            <div className="text-xl font-extrabold text-foreground mt-0.5">{stats.weeklyHabitCheckIns} logs</div>
          </div>
        </div>

        <div className={`rounded-3xl border p-5 shadow-sm flex items-center gap-4 ${burnoutColor}`}>
          <div className="h-10 w-10 rounded-xl bg-current/10 flex items-center justify-center shrink-0">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider opacity-85">Burnout Risk</div>
            <div className="text-xl font-extrabold mt-0.5">{burnoutRiskLevel} Risk</div>
          </div>
        </div>
      </div>

      {/* Main Charts grid (2 columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart 1: Focus Study Minutes */}
        <div className="rounded-3xl glass-panel p-6 shadow-sm flex flex-col h-[340px]">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-1.5 shrink-0">
            <TrendingUp className="h-4.5 w-4.5 text-primary" />
            Focus Study Minutes (Last 7 Days)
          </h3>
          
          <div className="flex-1 min-h-0 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.weeklyFocusData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                <XAxis dataKey="day" stroke="#a1a1aa" fontSize={10} tickLine={false} />
                <YAxis stroke="#a1a1aa" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                  labelStyle={{ color: '#f4f4f5', fontWeight: 'bold' }}
                />
                <Bar dataKey="minutes" fill="var(--color-primary, #6366f1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Cognitive Velocity & Burnout trends */}
        <div className="rounded-3xl glass-panel p-6 shadow-sm flex flex-col h-[340px]">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-1.5 shrink-0">
            <Activity className="h-4.5 w-4.5 text-primary" />
            Daily Focus Score vs Burnout Trend
          </h3>
          
          <div className="flex-1 min-h-0 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={snapshots} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                <XAxis dataKey="date" stroke="#a1a1aa" fontSize={10} tickLine={false} />
                <YAxis stroke="#a1a1aa" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                  labelStyle={{ color: '#f4f4f5', fontWeight: 'bold' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="focusScore" stroke="#a78bfa" strokeWidth={2.5} name="Focus Score" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="burnout" stroke="#f43f5e" strokeWidth={2.5} name="Burnout Risk" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Burnout advisor block */}
      <div className="rounded-3xl glass-panel p-6 shadow-sm border border-border flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
          <Brain className="h-5.5 w-5.5 animate-pulse text-primary" />
        </div>

        <div>
          <h4 className="text-sm font-bold text-foreground">AI Advisor Burnout & Focus Insights</h4>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">
            {burnoutAdvice}
          </p>
        </div>
      </div>
    </div>
  );
}
