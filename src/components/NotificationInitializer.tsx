'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  setupForegroundNotifications,
  requestNotificationPermission,
  subscribeToFCM,
  checkNotificationSupport,
} from '@/lib/notificationService';
import { useToast } from '@/hooks/use-toast';

// This component initializes notifications after auth is available
export default function NotificationInitializer() {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Store the unsubscribe function
    let unsubscribe: (() => void) | null = null;

    const initNotifications = async () => {
      // Only run if there's a user and the browser supports notifications
      if (user && checkNotificationSupport()) {
        console.log("Initializing notifications for user:", user.uid);
        
        const permissionGranted = await requestNotificationPermission();
        
        if (permissionGranted) {
          console.log('Notification permission granted.');
          // Get the FCM token and save it to Firestore
          await subscribeToFCM(user.uid);
          // Set up the listener for messages received while the app is in the foreground
          unsubscribe = setupForegroundNotifications();
        } else {
          console.log('Notification permission was not granted.');
          // Optionally, inform the user that they need to enable notifications
          // This could be done with a toast, but we'll keep it to the console for now
        }
      }
    };

    initNotifications();

    // Cleanup notification listeners on component unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, toast]);

  // This is a utility component that doesn't render anything
  return null;
}
