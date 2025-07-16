'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Home, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
// Use the Auth context that is provided in `src/context/AuthContext`
// so the navigation bar consumes the same provider as the rest of the app.
import { useAuth } from '@/context/AuthContext';
import { useDarkMode } from './DarkModeProvider';
import { Switch } from '@/components/ui/switch';
import { Moon, Sun } from 'lucide-react';

export function NavigationBar() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Map pathnames to page titles
  const pageTitles: { [key: string]: string } = {
    '/': 'Log Issue',
    '/history': 'History',
    '/profile': 'Profile',
    '/login': 'Login',
  };
  // Default to 'ShiftWise' if not found
  const pageTitle = pageTitles[pathname] || 'ShiftWise';

  // Helper to get initials
  function getInitials(nameOrEmail: string) {
    if (!nameOrEmail) return '';
    const parts = nameOrEmail.split(/\s+|\./).filter(Boolean);
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || '';
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  return (
    <header className="w-full bg-background/95 backdrop-blur border-b border-border sticky top-0 z-40" role="banner" aria-label="App header">
      <div className="w-full max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-7xl mx-auto flex justify-center items-center py-4 sm:py-5 px-2 sm:px-6">
        <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-primary text-center tracking-tight truncate w-full select-none transition-colors transition-transform duration-200 ease-out hover:text-blue-700 hover:scale-[1.03] active:scale-[0.98]" aria-label={pageTitle}>{pageTitle}</span>
        <div className="absolute right-4 flex items-center gap-2">
          <DarkModeToggle />
          {user && (
            <div
              className="ml-2 w-10 h-10 rounded-full bg-primary/10 border border-primary flex items-center justify-center text-primary font-bold text-lg shadow-sm select-none"
              aria-label="User avatar"
              title={(user.displayName ?? user.email ?? undefined)}
            >
              {getInitials(user.displayName ?? user.email ?? '')}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// Dark mode toggle switch component
function DarkModeToggle() {
  const { darkMode, toggleDarkMode } = useDarkMode();
  return (
    <button
      onClick={toggleDarkMode}
      className="flex items-center justify-center w-10 h-10 rounded-full bg-muted hover:bg-accent transition-colors border border-border focus:outline-none focus:ring-2 focus:ring-primary"
      aria-label="Toggle dark mode"
      title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      tabIndex={0}
    >
      {darkMode ? <Moon className="h-6 w-6 text-blue-400" /> : <Sun className="h-6 w-6 text-yellow-400" />}
    </button>
  );
}
