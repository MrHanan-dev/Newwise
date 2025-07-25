"use client";
import React from 'react';
import ShiftReportClientPage from "@/components/shiftwise/ShiftReportClientPage";
import { useUserProfileContext } from '@/context/UserProfileContext';
import { useDarkMode } from '@/components/shared/DarkModeProvider';
import { Moon, Sun } from 'lucide-react';
import { useRouter } from 'next/navigation';

function DarkModeToggle() {
  const { darkMode, toggleDarkMode } = useDarkMode();
  return (
    <button
      onClick={toggleDarkMode}
      className="flex items-center justify-center w-10 h-10 rounded-full bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary ml-2"
      aria-label="Toggle dark mode"
      title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{ position: 'absolute', top: 18, right: 18, zIndex: 40 }}
    >
      {darkMode ? <Moon className="h-6 w-6 text-primary" /> : <Sun className="h-6 w-6 text-secondary-yellow" />}
    </button>
  );
}

export default function Home() {
  const { profile } = useUserProfileContext();
  const isOperator = profile?.role === 'operator';
  const isTechnician = profile?.role === 'technician';
  const router = useRouter();

  React.useEffect(() => {
    if (isTechnician) {
      router.replace('/view-issues');
    }
  }, [isTechnician, router]);

  if (isTechnician) {
    return null; // Or a loading spinner
  }

  return (
    <div className="relative">
      {isOperator && <DarkModeToggle />}
      <ShiftReportClientPage />
    </div>
  );
}
