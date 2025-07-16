// ===============================
// Notification Service for ShiftWise App
// ===============================
// This service handles push notification functionality:
// - Requesting permission
// - Subscribing to specific issues
// - Managing notification preferences
// - Interfacing with Firebase Cloud Messaging

import { db } from "./firebaseClient";
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, setDoc } from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Notification Types
export enum NotificationType {
  STATUS_CHANGE = 'status_change',
  COMMENT_ADDED = 'comment_added', 
  PHOTO_ADDED = 'photo_added',
  DATE_CHANGED = 'date_changed',
  DESCRIPTION_UPDATED = 'description_updated',
  ALL = 'all'
}

export interface NotificationPreferences {
  userId: string;
  subscribedIssues: string[]; // Array of issue IDs
  notificationTypes: NotificationPreferences[]; // Which types of notifications to receive
  enabled: boolean; // Global toggle for notifications
}

// Check if browser supports notifications
export const checkNotificationSupport = (): boolean => {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!checkNotificationSupport()) return false;
  
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

// Subscribe to Firebase Cloud Messaging
export const subscribeToFCM = async (userId: string): Promise<string | null> => {
  try {
    const messaging = getMessaging();
    // Get the service worker registration that is already active
    const registration = await navigator.serviceWorker.ready;
    const currentToken = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration, // Pass the registration to FCM
    });
    
    if (currentToken) {
      // Store the token in Firestore for the user
      await updateUserFCMToken(userId, currentToken);
      return currentToken;
    } else {
      console.warn('No registration token available');
      return null;
    }
  } catch (error) {
    console.error('An error occurred while subscribing to FCM:', error);
    return null;
  }
};

// Store or update user's FCM token in Firestore
export const updateUserFCMToken = async (userId: string, token: string): Promise<void> => {
  const userRef = doc(db, 'userNotifications', userId);
  const userDoc = await getDoc(userRef);
  
  if (userDoc.exists()) {
    await updateDoc(userRef, {
      fcmTokens: arrayUnion(token),
      lastUpdated: new Date()
    });
  } else {
    await setDoc(userRef, {
      fcmTokens: [token],
      userId,
      subscribedIssues: [],
      notificationTypes: Object.values(NotificationType),
      enabled: true,
      lastUpdated: new Date()
    });
  }
};

// Subscribe to an issue (to receive notifications about it)
export const subscribeToIssue = async (userId: string, issueId: string, reportId: string): Promise<boolean> => {
  try {
    // Update user's notification preferences
    const userRef = doc(db, 'userNotifications', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      await updateDoc(userRef, {
        subscribedIssues: arrayUnion(issueId)
      });
    } else {
      // If the user document doesn't exist, create it.
      await setDoc(userRef, {
        userId,
        subscribedIssues: [issueId],
        fcmTokens: [],
        notificationTypes: Object.values(NotificationType),
        enabled: true,
        lastUpdated: new Date()
      });
    }
    
    // Also update the issue document to add this user as a subscriber
    const reportRef = doc(db, 'shiftReports', reportId);
    const reportData = await getDoc(reportRef);
    
    if (reportData.exists()) {
      const report = reportData.data();
      const issues = report.issues || [];
      
      // Find the right issue and update its subscribers
      const updatedIssues = issues.map((issue: any, index: number) => {
        if (`${reportId}-${index}` === issueId) {
          return {
            ...issue,
            subscribers: Array.isArray(issue.subscribers) 
              ? [...issue.subscribers, userId] 
              : [userId]
          };
        }
        return issue;
      });
      
      await updateDoc(reportRef, { issues: updatedIssues });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error subscribing to issue:', error);
    return false;
  }
};

// Unsubscribe from an issue
export const unsubscribeFromIssue = async (userId: string, issueId: string, reportId: string): Promise<boolean> => {
  try {
    // Update user's notification preferences
    const userRef = doc(db, 'userNotifications', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      await updateDoc(userRef, {
        subscribedIssues: arrayRemove(issueId)
      });
    }
    
    // Also update the issue document to remove this user as a subscriber
    const reportRef = doc(db, 'shiftReports', reportId);
    const reportData = await getDoc(reportRef);
    
    if (reportData.exists()) {
      const report = reportData.data();
      const issues = report.issues || [];
      
      // Find the right issue and update its subscribers
      const updatedIssues = issues.map((issue: any, index: number) => {
        if (`${reportId}-${index}` === issueId) {
          return {
            ...issue,
            subscribers: Array.isArray(issue.subscribers) 
              ? issue.subscribers.filter((id: string) => id !== userId)
              : []
          };
        }
        return issue;
      });
      
      await updateDoc(reportRef, { issues: updatedIssues });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error unsubscribing from issue:', error);
    return false;
  }
};

// Check if user is subscribed to an issue
export const isSubscribedToIssue = async (userId: string, issueId: string): Promise<boolean> => {
  try {
    const userRef = doc(db, 'userNotifications', userId);
    const userData = await getDoc(userRef);
    
    if (userData.exists()) {
      const data = userData.data();
      return Array.isArray(data.subscribedIssues) && data.subscribedIssues.includes(issueId);
    }
    
    return false;
  } catch (error) {
    console.error('Error checking subscription:', error);
    return false;
  }
};

// Set up foreground notification handler
export const setupForegroundNotifications = () => {
  try {
    const messaging = getMessaging();
    
    return onMessage(messaging, (payload) => {
      const { title, body, issueId } = payload.data || {};
      
      // Create and display a notification
      if (title && body) {
        new Notification(title, {
          body,
          icon: '/icon-192x192.png',
          data: { issueId }
        });
      }
    });
  } catch (error) {
    console.error('Error setting up foreground notifications:', error);
    return null;
  }
};
