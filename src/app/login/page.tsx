'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Shield, Mail, Lock, ArrowRight, Loader2, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError('Invalid email or password.');
        setLoading(false);
      } else {
        router.refresh();
        router.push('/dashboard');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 bg-background relative overflow-hidden aurora-mesh">
      {/* Background radial overlays */}
      <div className="absolute inset-0 pointer-events-none bg-radial-[circle_at_50%_-20%] from-primary/10 via-transparent to-transparent" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[440px] z-10"
      >
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 border border-primary/25 mb-4 text-primary"
          >
            <Shield className="h-8 w-8" />
          </motion.div>
          
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-b from-foreground to-foreground/75 bg-clip-text text-transparent">
            Welcome back to GrowthOS
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Enter your credentials to access your daily operating system
          </p>
        </div>

        <div className="rounded-3xl glass-panel p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle inner grid lines */}
          <div className="absolute inset-0 bg-linear-to-b from-white/[0.02] to-transparent pointer-events-none" />

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground/60">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm text-foreground"
                  placeholder="name@domain.com"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground/60">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm text-foreground"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:bg-primary/95 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Securing Session...
                </>
              ) : (
                <>
                  Enter Operating System
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Seed account quick login info box */}
          <div className="mt-6 pt-6 border-t border-white/5 flex flex-col gap-2 bg-white/[0.01] -mx-8 -mb-8 p-6 rounded-b-[24px]">
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" />
              <span>Sandbox Demo Access:</span>
            </div>
            <div className="text-xs text-muted-foreground flex flex-col gap-1 leading-relaxed">
              <div>Email: <code className="text-foreground bg-white/5 px-1.5 py-0.5 rounded font-mono select-all">demo@growthos.com</code></div>
              <div>Password: <code className="text-foreground bg-white/5 px-1.5 py-0.5 rounded font-mono select-all">demopassword</code></div>
            </div>
          </div>
        </div>

        <p className="text-center mt-6 text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-primary hover:underline font-medium">
            Initialize Profile
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
