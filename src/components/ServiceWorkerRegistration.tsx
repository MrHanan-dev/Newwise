'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/serviceWorkerRegistration';

// This component simply registers the service worker without depending on auth
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // Register service worker when component mounts
    registerServiceWorker().catch(error => {
      console.error('Failed to register service worker:', error);
    });
  }, []);

  // This is a utility component that doesn't render anything
  return null;
}
