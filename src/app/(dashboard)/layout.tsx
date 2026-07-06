import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import Sidebar from '@/components/sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // If not logged in, redirect to login page
  if (!session?.user?.id) {
    redirect('/login');
  }

  const userId = session.user.id as string;

  // Fetch user profile and preferences from database
  let profile = await db.profile.findUnique({
    where: { userId },
  });

  // Fallback profile creation in case of seeding anomalies
  if (!profile) {
    profile = await db.profile.create({
      data: {
        userId,
        xp: 100,
        level: 1,
        title: 'Novice',
      },
    });
  }

  const preference = await db.userPreference.findUnique({
    where: { userId },
  });

  const sidebarOpen = preference ? preference.sidebarOpen : true;

  // Prepare profile details safely
  const profileDetails = {
    name: session.user.name || 'User',
    avatarUrl: profile.avatarUrl,
    level: profile.level,
    xp: profile.xp,
    title: profile.title,
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Collaspable Navigation Sidebar */}
      <Sidebar initialOpen={sidebarOpen} userProfile={profileDetails} />
      
      {/* Scrollable Main viewport */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Animated Mesh Grid background */}
        <div className="absolute inset-0 pointer-events-none bg-radial-[circle_at_50%_0%] from-primary/[0.03] via-transparent to-transparent z-0" />
        
        <main className="flex-1 overflow-y-auto z-10">
          {children}
        </main>
      </div>
    </div>
  );
}
