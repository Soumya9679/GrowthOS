import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import SettingsDashboard from './settings-dashboard';

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const userId = session.user.id;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  const profile = await db.profile.findUnique({
    where: { userId },
  });

  const preference = await db.userPreference.findUnique({
    where: { userId },
  });

  const serializedUser = user ? { name: user.name || '', email: user.email } : null;
  const serializedProfile = profile ? { bio: profile.bio || '', avatarUrl: profile.avatarUrl || '' } : null;
  const serializedPreference = preference
    ? {
        theme: preference.theme,
        notificationsEnabled: preference.notificationsEnabled,
        pomodoroWorkDuration: preference.pomodoroWorkDuration,
        pomodoroBreakDuration: preference.pomodoroBreakDuration,
        soundVolume: preference.soundVolume,
        weatherCity: preference.weatherCity || '',
      }
    : null;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Workspace Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Configure Pomodoro timers, sound alerts, notification thresholds, and manage your account bio.
        </p>
      </div>

      <SettingsDashboard
        user={serializedUser}
        profile={serializedProfile}
        preference={serializedPreference}
      />
    </div>
  );
}
