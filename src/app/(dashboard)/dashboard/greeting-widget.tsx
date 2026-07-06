'use client';

import { useState, useEffect } from 'react';
import { Sun, CloudRain, CloudSun, Moon, Quote, Flame, MapPin } from 'lucide-react';

interface GreetingProps {
  userName: string | null;
  streak: number;
  city: string | null;
}

export default function GreetingWidget({ userName, streak, city }: GreetingProps) {
  const [greeting, setGreeting] = useState('Welcome back');
  const [quote, setQuote] = useState({ text: 'Focus on being productive instead of busy.', author: 'Tim Ferriss' });

  // Curated list of high-quality developer and growth quotes
  const quotesList = [
    { text: 'Simplicity is the soul of efficiency.', author: 'Austin Freeman' },
    { text: 'Small daily improvements over time lead to stunning results.', author: 'Robin Sharma' },
    { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
    { text: 'Make it work, make it right, make it fast.', author: 'Kent Beck' },
    { text: 'First, solve the problem. Then, write the code.', author: 'John Johnson' },
    { text: 'It always seems impossible until it is done.', author: 'Nelson Mandela' },
    { text: 'Focus is a matter of deciding what things you are not going to do.', author: 'John Carmack' },
    { text: 'You do not rise to the level of your goals. You fall to the level of your systems.', author: 'James Clear' },
  ];

  useEffect(() => {
    // 1. Establish time-sensitive greeting
    const hours = new Date().getHours();
    if (hours < 12) {
      setGreeting('Good morning');
    } else if (hours < 18) {
      setGreeting('Good afternoon');
    } else {
      setGreeting('Good evening');
    }

    // 2. Select a consistent quote for the day
    const day = new Date().getDate();
    setQuote(quotesList[day % quotesList.length]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Determine weather icon based on time
  const isNight = new Date().getHours() >= 18 || new Date().getHours() < 6;

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between h-full gap-4">
      {/* Greetings & Weather */}
      <div className="flex-1">
        <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          {greeting}, {userName?.split(' ')[0] || 'Learner'}!
        </h2>
        <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-1">
          Ready to optimize your syllabus goals and claim today&apos;s XP?
        </p>
      </div>

      {/* Stats (Weather & Streaks) */}
      <div className="flex items-center gap-6 shrink-0 bg-white/[0.02] border border-white/5 px-4 py-2.5 rounded-2xl">
        {/* Streak indicator */}
        <div className="flex items-center gap-2 border-r border-white/5 pr-4">
          <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
            <Flame className="h-5 w-5 fill-current animate-pulse" />
          </div>
          <div>
            <div className="text-sm font-bold text-foreground">{streak} Days</div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Active Streak</div>
          </div>
        </div>

        {/* Weather simulation */}
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
            {isNight ? (
              <Moon className="h-5 w-5" />
            ) : (
              <CloudSun className="h-5 w-5" />
            )}
          </div>
          <div>
            <div className="text-sm font-bold text-foreground">{isNight ? '62°F' : '72°F'}</div>
            <div className="text-[10px] text-muted-foreground flex items-center gap-0.5 truncate max-w-[90px] font-bold uppercase tracking-wider">
              <MapPin className="h-3 w-3 text-muted-foreground/60" />
              {city || 'San Francisco'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
