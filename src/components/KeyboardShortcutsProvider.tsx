"use client";
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if typing in input, textarea, or contenteditable
      const tag = (e.target as HTMLElement)?.tagName;
      const editable = (e.target as HTMLElement)?.isContentEditable;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || editable) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      switch (e.key.toLowerCase()) {
        case 'l':
          router.push('/log-issue');
          break;
        case 'v':
          router.push('/view-issues');
          break;
        case 'd':
          router.push('/dashboard');
          break;
        case '/':
          // Focus search bar if present
          const search = document.querySelector('input[type="search"], input[placeholder*="search" i]') as HTMLInputElement;
          if (search) {
            e.preventDefault();
            search.focus();
          }
          break;
        case 'm':
          // Toggle dark mode
          const toggleBtn = document.querySelector('[aria-label="Toggle dark mode"]') as HTMLButtonElement;
          if (toggleBtn) toggleBtn.click();
          break;
        case '?':
          setShowShortcuts(true);
          break;
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  return (
    <>
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-2xl shadow-2xl border border-border p-8 max-w-md w-full flex flex-col items-center">
            <h2 className="text-2xl font-bold mb-2 text-primary">Keyboard Shortcuts</h2>
            <ul className="mb-4 text-left text-foreground list-disc pl-6">
              <li><b>L</b> — Log New Issue</li>
              <li><b>V</b> — View Issues</li>
              <li><b>D</b> — Dashboard</li>
              <li><b>/</b> — Focus Search</li>
              <li><b>M</b> — Toggle Dark Mode</li>
              <li><b>?</b> — Show this help</li>
            </ul>
            <button
              className="mt-2 px-6 py-2 rounded-xl bg-primary text-primary-foreground font-semibold shadow hover:bg-primary/90"
              onClick={() => setShowShortcuts(false)}
              autoFocus
            >
              Close
            </button>
          </div>
        </div>
      )}
      {children}
    </>
  );
} 