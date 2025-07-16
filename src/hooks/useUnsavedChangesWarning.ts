// ===============================
// useUnsavedChangesWarning Hook
// ===============================
// This custom React hook warns the user if they try to leave the page with unsaved changes.
// It uses the browser's beforeunload event to show a warning dialog.
//
// Usage: Call useUnsavedChangesWarning(isDirty) in your form component.
// If isDirty is true, the warning will be shown on navigation/refresh.

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export function useUnsavedChangesWarning(isDirty: boolean) {
  const [showWarning, setShowWarning] = useState(false); // Not currently used, but could be for custom UI
  const pathname = usePathname(); // Current route path
  // useRouter is not used here but kept for potential future use with routeChangeStart

  useEffect(() => {
    // Handler for browser refresh/close
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        // returnValue is required for Chrome
        event.returnValue = '';
        // Most browsers show a generic message, not this custom one
        return 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    // Add event listener on mount
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    // Clean up event listener on unmount
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
    };
  }, [isDirty]);

  // This part is more complex with Next.js App Router.
  // 'routeChangeStart' is not directly available like in Pages Router.
  // For simplicity, this hook will primarily rely on 'beforeunload'.
  // A more robust solution for SPA navigation might involve context or a layout-level check.
}
