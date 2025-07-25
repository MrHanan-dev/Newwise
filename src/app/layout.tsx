// Working login Page marker 

import type { Metadata } from 'next';
import './globals.css';

import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { BottomNavigationBar } from '@/components/shared/BottomNavigationBar';
import AuthContextClientProvider from '@/components/AuthContextClientProvider'; // <-- new import
import { UserProfileProvider } from '@/context/UserProfileContext';

// Vercel Analytics React component import:
import { Analytics } from '@vercel/analytics/react';
import DarkModeProvider from '@/components/shared/DarkModeProvider';
import AnimatedBackground from '@/components/shared/AnimatedBackground';
import KeyboardShortcutsProvider from '@/components/KeyboardShortcutsProvider';
import AuthGate from "@/components/AuthGate";
import { useAuth } from "@/context/AuthContext";
import AppShell from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'Waitoa UHT Issues Logger',
  description: 'Shift Report Entry App',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Keyboard shortcuts state
  // Remove any useState, useRef, useEffect, useRouter code from this file. Only use KeyboardShortcutsProvider for client logic.

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var theme = localStorage.getItem('theme');
                var dark = theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (dark) document.documentElement.classList.add('dark');
                else document.documentElement.classList.remove('dark');
              } catch (e) {}
            })();
          `
        }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap"
          rel="stylesheet"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4f46e5" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-192x192.png" />
      </head>
      <body className="min-h-screen bg-background text-foreground dark:bg-gray-900 dark:text-gray-100">
        <KeyboardShortcutsProvider>
          <AnimatedBackground />
          <DarkModeProvider>
            <AuthContextClientProvider>
              <UserProfileProvider>
                <AppShell>{children}</AppShell>
              </UserProfileProvider>
            </AuthContextClientProvider>
          </DarkModeProvider>
        </KeyboardShortcutsProvider>
      </body>
    </html>
  );
}
