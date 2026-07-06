'use client';

import { motion } from 'framer-motion';
import { Sparkles, Activity, Target, ShieldAlert, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

interface AIBriefProps {
  level: number;
  unresolvedCardsCount: number;
  weakSubjects: string[];
}

export default function AIBriefWidget({ level, unresolvedCardsCount, weakSubjects }: AIBriefProps) {
  const recommendations = [
    {
      title: 'Review Spaced Repetition Cards',
      description: `You have ${unresolvedCardsCount} flashcards due for review. Let's practice before memory decay sets in.`,
      actionLabel: 'Open Review',
      actionPath: '/study',
      icon: Target,
    },
    {
      title: 'Computer Networks Target Alert',
      description: 'Your study hours for Computer Networks are 45% behind schedule this week. Consider adding a 45-minute focus session.',
      actionLabel: 'Open Planner',
      actionPath: '/planner',
      icon: ShieldAlert,
    },
  ];

  return (
    <div className="flex flex-col justify-between h-full">
      <div>
        {/* Widget Title */}
        <div className="flex items-center gap-2 mb-4">
          <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
            <Sparkles className="h-4 w-4 fill-current animate-pulse" />
          </div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            AI Morning Brief
          </h3>
        </div>

        {/* AI Morning Brief Message */}
        <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 relative overflow-hidden mb-4">
          <div className="absolute top-0 right-0 h-16 w-16 bg-primary/5 rounded-full filter blur-xl pointer-events-none" />
          <p className="text-sm leading-relaxed text-foreground/90">
            &ldquo;You are doing great maintaining a <strong className="text-amber-500">12-day streak</strong>! Today, your priority should be review cycles. I notice your performance in <strong>Dynamic Programming</strong> is strong, but you have neglected <strong>LALR Parsing</strong>. Focus on study tasks between 2 PM and 5 PM for peak concentration.&rdquo;
          </p>
        </div>

        {/* Active Suggestions List */}
        <div className="space-y-3">
          {recommendations.map((rec) => {
            const Icon = rec.icon;
            return (
              <div
                key={rec.title}
                className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.01] border border-white/5"
              >
                <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-foreground truncate">
                    {rec.title}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    {rec.description}
                  </p>
                  
                  <Link href={rec.actionPath}>
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-primary hover:underline mt-2 cursor-pointer uppercase tracking-wider">
                      {rec.actionLabel}
                      <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        <Activity className="h-4 w-4 text-emerald-500" />
        <span>Burnout Risk: <strong className="text-emerald-400">Low (14%)</strong>. Keep up the regular breaks!</span>
      </div>
    </div>
  );
}
