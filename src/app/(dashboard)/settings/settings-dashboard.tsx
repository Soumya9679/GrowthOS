'use client';

import { useState, useTransition } from 'react';
import { 
  User, Settings, Volume2, Bell, Sparkles, Clock, Globe, ShieldAlert
} from 'lucide-react';
import { savePreferences, saveProfile } from '@/app/actions/settings';
import confetti from 'canvas-confetti';

interface UserData {
  name: string;
  email: string;
}

interface ProfileData {
  bio: string;
  avatarUrl: string;
}

interface PreferenceData {
  theme: string;
  notificationsEnabled: boolean;
  pomodoroWorkDuration: number;
  pomodoroBreakDuration: number;
  soundVolume: number;
  weatherCity: string;
}

interface SettingsDashboardProps {
  user: UserData | null;
  profile: ProfileData | null;
  preference: PreferenceData | null;
}

const THEME_OPTIONS = [
  { id: 'dark-default', name: 'Dark Default', desc: 'Sleek carbon with subtle slate tones.' },
  { id: 'neon-cyberpunk', name: 'Neon Cyberpunk', desc: 'Vibrant cyberpunk neon borders.' },
  { id: 'emerald-forest', name: 'Emerald Forest', desc: 'Deep jade and moss hues.' },
  { id: 'midnight-aurora', name: 'Midnight Aurora', desc: 'Dynamic cosmic purple tints.' },
];

export default function SettingsDashboard({ user, profile, preference }: SettingsDashboardProps) {
  const [isPending, startTransition] = useTransition();

  // Profile states
  const [name, setName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || '');
  const [bio, setBio] = useState(profile?.bio || '');

  // Preferences states
  const [theme, setTheme] = useState(preference?.theme || 'dark-default');
  const [notifEnabled, setNotifEnabled] = useState<boolean>(preference?.notificationsEnabled !== false);
  const [pWork, setPWork] = useState(preference?.pomodoroWorkDuration || 25);
  const [pBreak, setPBreak] = useState(preference?.pomodoroBreakDuration || 5);
  const [volume, setVolume] = useState(preference?.soundVolume || 50);
  const [city, setCity] = useState(preference?.weatherCity || '');

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isPending) return;

    startTransition(async () => {
      const res = await saveProfile({ name, bio, avatarUrl });
      if (res?.success) {
        alert('Profile updated successfully!');
      } else if (res?.error) {
        alert(res.error);
      }
    });
  };

  const handleUpdatePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;

    startTransition(async () => {
      const res = await savePreferences({
        theme,
        notificationsEnabled: notifEnabled,
        pomodoroWorkDuration: pWork,
        pomodoroBreakDuration: pBreak,
        soundVolume: volume,
        weatherCity: city || null,
      });

      if (res?.success) {
        confetti({
          particleCount: 50,
          spread: 40,
          origin: { y: 0.8 },
        });
        alert('Workspace preferences saved successfully!');
        window.location.reload();
      } else if (res?.error) {
        alert(res.error);
      }
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start text-left">
      {/* Left Column: Account Profile Editor (md:col-span-5) */}
      <div className="md:col-span-5 rounded-3xl glass-panel p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
          <User className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Account Profile
          </h3>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Display Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-foreground"
              placeholder="e.g., Rohan Sharma"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Email Address *(non-editable)*
            </label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/5 text-sm text-muted-foreground cursor-not-allowed opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Avatar Image URL
            </label>
            <input
              type="text"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-foreground"
              placeholder="https://images.unsplash.com/..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Bio Summary
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-foreground resize-none focus:outline-none"
              placeholder="Write a brief bio about your learning tracks..."
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/95 transition-all shadow-md shadow-primary/10 cursor-pointer"
          >
            Update profile
          </button>
        </form>
      </div>

      {/* Right Column: Preferences Customizer (md:col-span-7) */}
      <div className="md:col-span-7 rounded-3xl glass-panel p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
          <Settings className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Workspace Preferences
          </h3>
        </div>

        <form onSubmit={handleUpdatePreferences} className="space-y-6">
          {/* Theme customizers */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Workspace Style Theme
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {THEME_OPTIONS.map((o) => {
                const isSelected = theme === o.id;
                return (
                  <div
                    key={o.id}
                    onClick={() => setTheme(o.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-primary/10 border-primary text-foreground'
                        : 'bg-white/[0.01] border-white/5 hover:bg-white/5'
                    }`}
                  >
                    <span className="text-xs font-bold text-foreground">{o.name}</span>
                    <span className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{o.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pomodoro slider timers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-primary" />
                Pomodoro Duration (Mins)
              </label>
              <input
                type="number"
                value={pWork}
                min={5}
                max={120}
                onChange={(e) => setPWork(parseInt(e.target.value) || 25)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-primary" />
                Short Break Duration (Mins)
              </label>
              <input
                type="number"
                value={pBreak}
                min={1}
                max={30}
                onChange={(e) => setPBreak(parseInt(e.target.value) || 5)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-foreground"
              />
            </div>
          </div>

          {/* Sound & Notifications settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/5 pt-4">
            {/* Sound alert volume slider */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Volume2 className="h-3.5 w-3.5 text-primary" />
                  Alert Volume
                </span>
                <span className="text-[10px] text-muted-foreground font-bold">{volume}%</span>
              </label>
              <input
                type="range"
                value={volume}
                min={0}
                max={100}
                onChange={(e) => setVolume(parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            {/* Notification toggle */}
            <div className="flex items-center justify-between py-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Bell className="h-3.5 w-3.5 text-primary" />
                Notification Alerts
              </span>
              <button
                type="button"
                onClick={() => setNotifEnabled(!notifEnabled)}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${
                  notifEnabled ? 'bg-primary' : 'bg-white/5 border border-white/5'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-all absolute ${
                    notifEnabled ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Location for weather forecast */}
          <div className="border-t border-white/5 pt-4">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
              <Globe className="h-3.5 w-3.5 text-primary" />
              Weather Forecast Location (City)
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-foreground"
              placeholder="e.g. San Francisco"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/95 transition-all shadow-md shadow-primary/10 cursor-pointer flex items-center justify-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Save preferences
          </button>
        </form>
      </div>
    </div>
  );
}
