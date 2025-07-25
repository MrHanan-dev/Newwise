"use client";

import { useRouter, usePathname } from "next/navigation";
import { useUserProfileContext } from '@/context/UserProfileContext';
import { useState } from "react";
import Link from 'next/link';

export function BottomNavigationBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { profile } = useUserProfileContext();
  const [isBarVisible, setIsBarVisible] = useState(true);

  const isOperator = profile?.role === 'operator';
  const isTechnician = profile?.role === 'technician';

  const navItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: (
        <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M3 9h18M3 15h18" /></svg>
      ),
      active: pathname === '/dashboard',
    },
    // Show only one combined tab for issues (Log Issue & View Issues)
    {
      label: 'Issues',
      path: '/',
      icon: (
        // Home/house icon
        <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6" /></svg>
      ),
      active: pathname === '/',
    },
    {
      label: 'History',
      path: '/history',
      icon: (
        <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
      ),
      active: pathname === '/history',
    },
    {
      label: 'Profile',
      path: '/profile',
      icon: (
        <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" /></svg>
      ),
      active: pathname === '/profile',
    },
  ];

  return (
    <>
      {/* Toggle button: only one is ever rendered, and never overlaps the bar */}
      {!isBarVisible && (
        <button
          className="fixed left-1/2 z-50 -translate-x-1/2 bottom-3 bg-card dark:bg-card border border-blue-200 dark:border-border rounded-full shadow-lg p-2 flex items-center justify-center transition-all hover:bg-blue-100/60 dark:hover:bg-blue-900/30"
          style={{ minWidth: 44, minHeight: 44 }}
          onClick={() => setIsBarVisible(true)}
          aria-label="Show navigation bar"
          tabIndex={0}
        >
          {/* Chevron up icon */}
          <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 15l7-7 7 7" /></svg>
        </button>
      )}
      <nav
        className={`fixed bottom-0 inset-x-0 z-40 flex justify-center bg-transparent transition-transform duration-300 ${isBarVisible ? 'translate-y-0' : 'translate-y-full pointer-events-none'}`}
        role="navigation"
        aria-label="Main navigation bar"
      >
        <div className="w-full max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-7xl mx-auto bg-card dark:bg-card backdrop-blur-md border-t border-blue-200 dark:border-border rounded-t-3xl shadow-2xl flex justify-around items-center py-2 px-2 sm:px-4 relative">
          {/* SVG filter for glow */}
          <svg className="absolute inset-0 w-0 h-0 pointer-events-none" aria-hidden="true">
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </svg>
          {navItems.map((item, idx) => (
            <Link
              key={item.path}
              href={item.path}
              prefetch={true}
              className={`flex flex-col items-center justify-center gap-0.5 px-2 sm:px-4 py-1 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary ${item.active ? 'text-primary font-bold scale-110' : 'text-muted-foreground hover:text-primary/80'}`}
              aria-label={item.label}
              tabIndex={0}
              role="button"
            >
              {item.icon}
              <span className="text-xs font-medium mt-0.5" aria-hidden="true">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
      {/* Toggle button when bar is visible */}
      {isBarVisible && (
        <button
          className="fixed left-1/2 z-50 -translate-x-1/2 bottom-[76px] bg-card dark:bg-card border border-blue-200 dark:border-border rounded-full shadow-lg p-2 flex items-center justify-center transition-all hover:bg-blue-100/60 dark:hover:bg-blue-900/30"
          style={{ minWidth: 44, minHeight: 44 }}
          onClick={() => setIsBarVisible(false)}
          aria-label="Hide navigation bar"
          tabIndex={0}
        >
          {/* Chevron down icon */}
          <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" /></svg>
        </button>
      )}
    </>
  );
}
