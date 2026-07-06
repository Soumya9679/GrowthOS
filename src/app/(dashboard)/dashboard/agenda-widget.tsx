'use client';

import { useState, useEffect } from 'react';
import { CalendarRange, Plus, Clock, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface TimeBlock {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  color: string;
  notes: string | null;
}

interface AgendaProps {
  timeBlocks: TimeBlock[];
}

export default function AgendaWidget({ timeBlocks }: AgendaProps) {
  const [currentHour, setCurrentHour] = useState(new Date().getHours());

  useEffect(() => {
    setCurrentHour(new Date().getHours());
    const interval = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatHour = (date: Date) => {
    const hours = new Date(date).getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    return `${displayHour} ${ampm}`;
  };

  const getActiveBlockId = () => {
    const now = new Date();
    const block = timeBlocks.find((tb) => {
      const start = new Date(tb.startTime);
      const end = new Date(tb.endTime);
      return now >= start && now <= end;
    });
    return block?.id || null;
  };

  const activeBlockId = getActiveBlockId();

  return (
    <div className="flex flex-col justify-between h-full">
      <div>
        {/* Widget Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
              <CalendarRange className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Today&apos;s Agenda
            </h3>
          </div>

          <Link href="/planner">
            <span className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5 cursor-pointer">
              Go to Planner
              <ChevronRight className="h-3 w-3" />
            </span>
          </Link>
        </div>

        {/* Time Blocks List */}
        <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
          {timeBlocks.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-white/5 rounded-2xl p-4">
              No time blocks scheduled for today. Go to Daily Planner to organize tasks.
            </div>
          ) : (
            timeBlocks
              .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
              .map((tb) => {
                const isActive = activeBlockId === tb.id;
                
                return (
                  <div
                    key={tb.id}
                    className={`flex items-start gap-4 p-3 rounded-2xl border transition-all ${
                      isActive
                        ? 'bg-primary/5 border-primary/25 shadow-md shadow-primary/5'
                        : 'bg-white/[0.01] border-white/5 hover:border-white/10'
                    }`}
                  >
                    {/* Time Slot display */}
                    <div className="flex flex-col items-center justify-center shrink-0 w-16 text-center">
                      <span className="text-xs font-bold text-foreground">
                        {formatHour(tb.startTime)}
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                        to {formatHour(tb.endTime)}
                      </span>
                    </div>

                    {/* Block line separator */}
                    <div
                      className="w-1 self-stretch rounded-full"
                      style={{ backgroundColor: tb.color || '#6366f1' }}
                    />

                    {/* Block details */}
                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className="text-sm font-semibold text-foreground truncate flex items-center gap-1.5">
                        {tb.title}
                        {isActive && (
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                        )}
                      </h4>
                      {tb.notes && (
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1 leading-relaxed">
                          {tb.notes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        <Clock className="h-4 w-4 text-primary" />
        <span>Current Hour block: {formatHour(new Date())}</span>
      </div>
    </div>
  );
}
