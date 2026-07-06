'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, RotateCcw, Volume2, VolumeX, Timer, 
  CheckCircle2, Clock, Sparkles, ChevronRight, Activity
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import confetti from 'canvas-confetti';
import { logFocusSession } from '@/app/actions/focus';

interface FocusSession {
  id: string;
  duration: number;
  category: string;
  createdAt: string;
}

interface FocusDashboardProps {
  todaySessions: FocusSession[];
  pastWeekSessions: FocusSession[];
}

const CATEGORIES = ['Coding', 'Reading', 'Compiler Design', 'Networks', 'Research', 'Fitness'];

export default function FocusDashboard({ todaySessions, pastWeekSessions }: FocusDashboardProps) {
  const [sessions, setSessions] = useState<FocusSession[]>(todaySessions);
  const [duration, setDuration] = useState(25); // Minutes
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [category, setCategory] = useState('Coding');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [isPending, startTransition] = useTransition();

  // Web Audio Context References for Synthesizing Sounds
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<AudioWorkletNode | ScriptProcessorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Sync Timer on duration changes
  useEffect(() => {
    if (!isRunning) {
      setTimeLeft(duration * 60);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  // Main Timer Countdown loop
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  const handleComplete = () => {
    setIsRunning(false);
    playChime();
    stopBrownNoise();

    startTransition(async () => {
      const res = await logFocusSession({ duration, category });
      if (!res.error && res.focusSession) {
        const added: FocusSession = {
          id: res.focusSession.id,
          duration: res.focusSession.duration,
          category: res.focusSession.category,
          createdAt: res.focusSession.createdAt.toISOString(),
        };
        setSessions((prev) => [added, ...prev]);

        // Explode Confetti
        confetti({
          particleCount: 150,
          spread: 85,
          origin: { y: 0.6 },
        });

        if (res.leveledUp) {
          setTimeout(() => {
            confetti({
              particleCount: 200,
              spread: 100,
              colors: ['#8b5cf6', '#a78bfa', '#f59e0b'],
            });
          }, 600);
        }
      }
    });

    setTimeLeft(duration * 60);
  };

  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.2); // G5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.2);
    } catch (e) {}
  };

  const startBrownNoise = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const bufferSize = 4096;
      let lastOut = 0.0;
      const node = ctx.createScriptProcessor(bufferSize, 1, 1);
      node.onaudioprocess = (e) => {
        const out = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          out[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = out[i];
          out[i] *= 3.5;
        }
      };

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.08, ctx.currentTime);

      node.connect(gain);
      gain.connect(ctx.destination);

      noiseNodeRef.current = node;
      gainNodeRef.current = gain;
    } catch (err) {}
  };

  const stopBrownNoise = () => {
    if (noiseNodeRef.current) {
      try { noiseNodeRef.current.disconnect(); } catch (e) {}
      noiseNodeRef.current = null;
    }
    if (gainNodeRef.current) {
      try { gainNodeRef.current.disconnect(); } catch (e) {}
      gainNodeRef.current = null;
    }
  };

  const toggleSound = () => {
    if (!soundOn) {
      setSoundOn(true);
      if (isRunning) startBrownNoise();
    } else {
      setSoundOn(false);
      stopBrownNoise();
    }
  };

  const handlePlayPause = () => {
    const nextRunning = !isRunning;
    setIsRunning(nextRunning);
    if (soundOn) {
      if (nextRunning) startBrownNoise();
      else stopBrownNoise();
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(duration * 60);
    stopBrownNoise();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Recharts Data Aggregation for Past 7 Days
  const getChartData = () => {
    const daysData: Record<string, number> = {};
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const name = dayNames[d.getDay()];
      daysData[name] = 0;
    }

    pastWeekSessions.forEach((s) => {
      const d = new Date(s.createdAt);
      const name = dayNames[d.getDay()];
      if (daysData[name] !== undefined) {
        daysData[name] += s.duration;
      }
    });

    return Object.entries(daysData).map(([day, minutes]) => ({
      day,
      minutes,
    }));
  };

  const chartData = getChartData();

  // Stats
  const totalTodayMins = sessions.reduce((acc, curr) => acc + curr.duration, 0);
  const avgSessionMins = sessions.length === 0 ? 0 : Math.round(totalTodayMins / sessions.length);

  // SVG circular timer geometry
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (timeLeft / (duration * 60)) * circumference;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
      {/* Left Panel: Circular countdown timer (md:col-span-5) */}
      <div className="md:col-span-5 rounded-3xl glass-panel p-6 shadow-sm flex flex-col items-center justify-between min-h-[500px]">
        {/* Category Pickers */}
        <div className="w-full space-y-3">
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">
            Focus Activity
          </label>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none justify-center -mx-2 px-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all shrink-0 border ${
                  category === cat
                    ? 'bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/10'
                    : 'bg-white/[0.01] border-white/5 text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Big Timer Circle */}
        <div className="relative my-6 flex items-center justify-center">
          <svg className="h-48 w-48 transform -rotate-90">
            <circle
              cx="96"
              cy="96"
              r={radius}
              className="stroke-white/5 fill-transparent"
              strokeWidth="7"
            />
            <motion.circle
              cx="96"
              cy="96"
              r={radius}
              className="stroke-primary fill-transparent"
              strokeWidth="7"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset }}
              transition={{ ease: 'linear', duration: 0.5 }}
              strokeLinecap="round"
            />
          </svg>

          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-4xl font-bold font-mono tracking-tabular leading-none text-foreground">
              {formatTime(timeLeft)}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/80 font-bold mt-2.5">
              Focus Session
            </span>
          </div>
        </div>

        {/* Duration configuration slider */}
        <div className="w-full px-4 mb-4 space-y-2">
          <div className="flex justify-between text-xs font-semibold text-muted-foreground">
            <span>Cycle Length</span>
            <span className="text-foreground">{duration} Minutes</span>
          </div>
          <input
            type="range"
            min="10"
            max="60"
            step="5"
            value={duration}
            disabled={isRunning}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            className="w-full accent-primary h-1 bg-white/5 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
          />
        </div>

        {/* Controls Bar */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSound}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              soundOn
                ? 'bg-primary/10 border-primary/20 text-primary shadow-sm'
                : 'bg-white/[0.01] border-white/5 text-muted-foreground hover:text-foreground'
            }`}
            title={soundOn ? 'Mute Brown Noise' : 'Enable Brownian study noise'}
          >
            {soundOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </button>

          <button
            onClick={handlePlayPause}
            className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/15 hover:shadow-primary/25 active:scale-95 transition-all cursor-pointer"
          >
            {isRunning ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current ml-0.5" />}
          </button>

          <button
            onClick={handleReset}
            className="p-3 rounded-xl bg-white/[0.01] border border-white/5 text-muted-foreground hover:text-foreground active:scale-95 transition-all cursor-pointer"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Right Panel: Focus session history & Charts (md:col-span-7) */}
      <div className="md:col-span-7 space-y-6">
        {/* Mini stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card/50 border border-border p-4 rounded-3xl">
            <h4 className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total Time</h4>
            <div className="text-xl font-bold text-foreground mt-1">{totalTodayMins} <span className="text-xs text-muted-foreground font-medium">mins</span></div>
          </div>
          <div className="bg-card/50 border border-border p-4 rounded-3xl">
            <h4 className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Sessions</h4>
            <div className="text-xl font-bold text-foreground mt-1">{sessions.length} completed</div>
          </div>
          <div className="bg-card/50 border border-border p-4 rounded-3xl">
            <h4 className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Average length</h4>
            <div className="text-xl font-bold text-foreground mt-1">{avgSessionMins} <span className="text-xs text-muted-foreground font-medium">mins</span></div>
          </div>
        </div>

        {/* Recharts Bar Chart */}
        <div className="rounded-3xl glass-panel p-6 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Weekly Focus History
          </h3>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                <XAxis 
                  dataKey="day" 
                  stroke="rgba(255,255,255,0.4)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.4)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  contentStyle={{
                    background: 'rgba(18, 18, 22, 0.85)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: '#fff',
                  }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Bar 
                  dataKey="minutes" 
                  fill="url(#focusGradient)" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Today's completed sessions list */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Today&apos;s Completed Cycles
          </h3>

          <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-white/5 rounded-3xl p-4">
                No focus cycles logged today. Start the timer to lock focus.
              </div>
            ) : (
              sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.01] border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8.5 w-8.5 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">
                        {s.category}
                      </h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(s.createdAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-primary bg-primary/5 px-2.5 py-1 rounded-xl border border-primary/10">
                    +{s.duration} mins focus (+50 XP)
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
