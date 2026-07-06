'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Flame, BellRing } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function PomodoroWidget() {
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [duration, setDuration] = useState(25 * 60); // 25 minutes default
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [soundOn, setSoundOn] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Web Audio Context References for Synthesizing Sounds
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<AudioWorkletNode | ScriptProcessorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Initialize Timer duration on mode toggle
  useEffect(() => {
    const minutes = mode === 'focus' ? 25 : 5;
    setDuration(minutes * 60);
    setTimeLeft(minutes * 60);
    setIsRunning(false);
  }, [mode]);

  // Main Timer Countdown effect
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
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

  // Trigger synthesized audio effects on completion
  const handleTimerComplete = () => {
    setIsRunning(false);
    playCompletionChime();
    
    if (mode === 'focus') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      setMode('break');
    } else {
      setMode('focus');
    }
  };

  // Synthesize a gentle Bell chime using Web Audio API oscillators
  const playCompletionChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      // Gentle sine sweep chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5 node
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15); // G5 node
      
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.5);
    } catch (e) {
      console.warn('Audio Context failed to compile:', e);
    }
  };

  // Synthesize Brown Noise for study static using Web Audio API script processors
  const startBrownNoise = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
      }
      
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Generate Brown Noise using a custom ScriptProcessor node (guarantees wide browser support)
      const bufferSize = 4096;
      let lastOut = 0.0;
      
      const node = ctx.createScriptProcessor(bufferSize, 1, 1);
      node.onaudioprocess = (e) => {
        const output = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          // Brownian noise filter math
          output[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = output[i];
          // Volume multiplier adjustments
          output[i] *= 3.5; 
        }
      };

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.08, ctx.currentTime); // Soft background volume

      node.connect(gain);
      gain.connect(ctx.destination);

      noiseNodeRef.current = node;
      gainNodeRef.current = gain;
    } catch (err) {
      console.error('Failed to synthesize ambient noise:', err);
    }
  };

  const stopBrownNoise = () => {
    if (noiseNodeRef.current) {
      try {
        noiseNodeRef.current.disconnect();
      } catch (e) {}
      noiseNodeRef.current = null;
    }
    if (gainNodeRef.current) {
      try {
        gainNodeRef.current.disconnect();
      } catch (e) {}
      gainNodeRef.current = null;
    }
  };

  // Handle ambient sound toggle actions
  const toggleSound = () => {
    if (!soundOn) {
      setSoundOn(true);
      if (isRunning) {
        startBrownNoise();
      }
    } else {
      setSoundOn(false);
      stopBrownNoise();
    }
  };

  // Handle play/pause, syncing sound synthesis
  const handlePlayPause = () => {
    const nextRunning = !isRunning;
    setIsRunning(nextRunning);
    
    if (soundOn) {
      if (nextRunning) {
        startBrownNoise();
      } else {
        stopBrownNoise();
      }
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(duration);
    stopBrownNoise();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Progress Calculations for SVG radial circle: circumference = 2 * PI * r
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = duration === 0 ? 0 : circumference - (timeLeft / duration) * circumference;

  return (
    <div className="flex flex-col h-full items-center justify-between p-1">
      {/* Modes selections */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/5 w-full max-w-[240px] justify-center">
        <button
          onClick={() => setMode('focus')}
          className={`flex-1 py-1 text-xs font-semibold rounded-lg cursor-pointer transition-all ${
            mode === 'focus'
              ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/15'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Study Focus
        </button>
        <button
          onClick={() => setMode('break')}
          className={`flex-1 py-1 text-xs font-semibold rounded-lg cursor-pointer transition-all ${
            mode === 'break'
              ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/15'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Short Break
        </button>
      </div>

      {/* Timer circular progress ring */}
      <div className="relative my-4 flex items-center justify-center">
        <svg className="h-40 w-40 transform -rotate-90">
          <circle
            cx="80"
            cy="80"
            r={radius}
            className="stroke-white/5 fill-transparent"
            strokeWidth="6"
          />
          <motion.circle
            cx="80"
            cy="80"
            r={radius}
            className="stroke-primary fill-transparent"
            strokeWidth="6"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset }}
            transition={{ ease: 'linear', duration: 0.5 }}
            strokeLinecap="round"
          />
        </svg>

        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tracking-tabular leading-none font-mono text-foreground">
            {formatTime(timeLeft)}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground/80 font-bold mt-1">
            {mode === 'focus' ? 'Focusing' : 'Resting'}
          </span>
        </div>
      </div>

      {/* Interactive Controls Panel */}
      <div className="flex items-center gap-4">
        {/* Ambient Sound Controller */}
        <button
          onClick={toggleSound}
          className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
            soundOn
              ? 'bg-primary/10 border-primary/20 text-primary'
              : 'bg-white/[0.01] border-white/5 text-muted-foreground hover:text-foreground hover:bg-white/[0.02]'
          }`}
          title={soundOn ? 'Mute Brown Noise' : 'Synthesize Brown Noise Static'}
        >
          {soundOn ? <Volume2 className="h-4.5 w-4.5" /> : <VolumeX className="h-4.5 w-4.5" />}
        </button>

        {/* Play/Pause */}
        <button
          onClick={handlePlayPause}
          className="h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/15 hover:shadow-primary/20 active:scale-95 cursor-pointer transition-all"
        >
          {isRunning ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
        </button>

        {/* Reset */}
        <button
          onClick={handleReset}
          className="p-2.5 rounded-xl bg-white/[0.01] border border-white/5 text-muted-foreground hover:text-foreground hover:bg-white/[0.02] active:scale-95 cursor-pointer transition-all"
        >
          <RotateCcw className="h-4.5 w-4.5" />
        </button>
      </div>
    </div>
  );
}
