import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isDashboard = nextUrl.pathname.startsWith('/dashboard') || 
                          nextUrl.pathname.startsWith('/habits') ||
                          nextUrl.pathname.startsWith('/tasks') ||
                          nextUrl.pathname.startsWith('/planner') ||
                          nextUrl.pathname.startsWith('/focus') ||
                          nextUrl.pathname.startsWith('/dsa') ||
                          nextUrl.pathname.startsWith('/study') ||
                          nextUrl.pathname.startsWith('/reading') ||
                          nextUrl.pathname.startsWith('/journal') ||
                          nextUrl.pathname.startsWith('/notes') ||
                          nextUrl.pathname.startsWith('/analytics') ||
                          nextUrl.pathname.startsWith('/assistant') ||
                          nextUrl.pathname.startsWith('/settings');
      
      const isAuthPage = nextUrl.pathname === '/login' || nextUrl.pathname === '/register';

      if (isDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isAuthPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL('/dashboard', nextUrl));
        }
        return true;
      }
      return true;
    },
  },
  providers: [], // Empty providers block to satisfy TypeScript, populated in auth.ts
} satisfies NextAuthConfig;
