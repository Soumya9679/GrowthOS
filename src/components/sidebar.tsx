'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, Calendar, CheckSquare, RefreshCw, Timer, 
  Code, BookOpen, BookMarked, PenTool, BarChart2, 
  Sparkles, Settings, LogOut, ChevronLeft, ChevronRight,
  User, Award
} from 'lucide-react';

interface SidebarProps {
  initialOpen?: boolean;
  userProfile: {
    name: string;
    avatarUrl: string | null;
    level: number;
    xp: number;
    title: string;
  } | null;
}

export default function Sidebar({ initialOpen = true, userProfile }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(initialOpen);

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Daily Planner', path: '/planner', icon: Calendar },
    { name: 'Tasks (Kanban)', path: '/tasks', icon: CheckSquare },
    { name: 'Habits', path: '/habits', icon: RefreshCw },
    { name: 'Focus Room', path: '/focus', icon: Timer },
    { name: 'DSA Tracker', path: '/dsa', icon: Code },
    { name: 'Spaced Repetition', path: '/study', icon: BookOpen },
    { name: 'Notes Workspace', path: '/notes', icon: BookMarked },
    { name: 'Daily Journal', path: '/journal', icon: PenTool },
    { name: 'Growth Analytics', path: '/analytics', icon: BarChart2 },
    { name: 'AI Advisor', path: '/assistant', icon: Sparkles },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  // Calculate XP percentage for next level: quadratic formula (100 * level^1.5)
  const calculateXpForNextLevel = (lvl: number) => Math.round(100 * Math.pow(lvl, 1.5));
  const calculateXpForCurrentLevel = (lvl: number) => lvl <= 1 ? 0 : Math.round(100 * Math.pow(lvl - 1, 1.5));
  
  const currentLvlXpFloor = userProfile ? calculateXpForCurrentLevel(userProfile.level) : 0;
  const nextLvlXpCeiling = userProfile ? calculateXpForNextLevel(userProfile.level) : 100;
  const xpInCurrentLevel = userProfile ? (userProfile.xp - currentLvlXpFloor) : 0;
  const xpNeededForLevel = nextLvlXpCeiling - currentLvlXpFloor;
  const xpPercent = Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForLevel) * 100));

  return (
    <motion.aside
      animate={{ width: isOpen ? 260 : 78 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="h-screen sticky top-0 flex flex-col bg-card/60 border-r border-border backdrop-blur-md z-30 select-none overflow-hidden"
    >
      {/* Sidebar Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-2 font-bold text-lg text-foreground tracking-tight"
            >
              <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-md shadow-primary/20">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                GrowthOS
              </span>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mx-auto h-7 w-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-md shadow-primary/20"
            >
              <Sparkles className="h-4 w-4" />
            </motion.div>
          )}
        </AnimatePresence>

        {isOpen && (
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {!isOpen && (
        <div className="flex justify-center py-4 border-b border-border">
          <button
            onClick={() => setIsOpen(true)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* User profile details Section */}
      {userProfile && (
        <div className={`p-4 border-b border-border ${isOpen ? '' : 'flex flex-col items-center'}`}>
          <div className="flex items-center gap-3">
            {userProfile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={userProfile.avatarUrl} 
                alt="avatar" 
                className="h-9 w-9 rounded-xl object-cover ring-2 ring-primary/20"
              />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                <User className="h-4 w-4" />
              </div>
            )}

            {isOpen && (
              <div className="min-w-0">
                <h4 className="text-sm font-semibold truncate leading-tight text-foreground">
                  {userProfile.name}
                </h4>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate uppercase tracking-wider font-semibold">
                  <Award className="h-3 w-3 text-primary" />
                  {userProfile.title}
                </p>
              </div>
            )}
          </div>

          {isOpen ? (
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-muted-foreground">Level {userProfile.level}</span>
                <span className="text-foreground">{userProfile.xp} / {nextLvlXpCeiling} XP</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${xpPercent}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-primary to-violet-400 rounded-full" 
                />
              </div>
            </div>
          ) : (
            <div className="mt-2 text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full border border-primary/20">
              Lvl {userProfile.level}
            </div>
          )}
        </div>
      )}

      {/* Main Navigation Section */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link key={item.path} href={item.path}>
              <div className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative cursor-pointer ${
                isActive 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}>
                {/* Active Indicator bar */}
                {isActive && (
                  <motion.div
                    layoutId="active-nav-indicator"
                    className="absolute left-0 top-2 bottom-2 w-0.5 bg-primary rounded-r"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                
                <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground/80 group-hover:text-foreground'}`} />
                
                {isOpen && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="truncate"
                  >
                    {item.name}
                  </motion.span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-border">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer ${
            isOpen ? '' : 'justify-center'
          }`}
        >
          <LogOut className="h-4.5 w-4.5 shrink-0" />
          {isOpen && <span>Sign Out</span>}
        </button>
      </div>
    </motion.aside>
  );
}
