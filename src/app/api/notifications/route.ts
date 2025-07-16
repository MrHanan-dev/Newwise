// ===============================
// Firebase Cloud Functions for Notifications
// ===============================
// This file contains server-side cloud functions for sending notifications

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

// Initialize Firebase Admin SDK
let db: any = null;
let messaging: any = null;

function initializeFirebase() {
  if (!getApps().length) {
    // Try to get service account from FIREBASE_SERVICE_ACCOUNT (JSON string)
    let serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : null;

    // If not found, try to construct from individual environment variables
    if (!serviceAccount && process.env.FIREBASE_PROJECT_ID) {
      serviceAccount = {
        type: process.env.FIREBASE_TYPE,
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: process.env.FIREBASE_AUTH_URI,
        token_uri: process.env.FIREBASE_TOKEN_URI,
        auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
        client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
      };
    }

    if (!serviceAccount) {
      console.warn('Service account credentials are not provided. Firebase Admin SDK will not be initialized.');
      return false;
    }

    try {
      initializeApp({
        credential: cert(serviceAccount),
      });
      return true;
    } catch (error) {
      console.error('Failed to initialize Firebase Admin SDK:', error);
      return false;
    }
  }
  return true;
}

// Initialize Firebase services only if credentials are available
if (initializeFirebase()) {
  db = getFirestore();
  messaging = getMessaging();
}

// Send notification for issue changes
export async function sendIssueChangeNotification(issueId: string, reportId: string, changeType: any, title: any, body: any) {
  try {
    // Check if Firebase is initialized
    if (!db || !messaging) {
      console.error('Firebase Admin SDK is not initialized');
      return { success: false, error: 'Firebase Admin SDK is not initialized' };
    }

    // Find subscribers to this issue
    const issueRef = db.collection('shiftReports').doc(reportId);
    const issueDoc = await issueRef.get();
    
    if (!issueDoc.exists) {
      console.error(`Issue document not found: ${reportId}`);
      return { success: false, error: 'Issue document not found' };
    }
    
    const issueData = issueDoc.data();
    const issueIndex = parseInt(issueId.split('-')[1], 10);
    
    if (!issueData || !issueData.issues || !issueData.issues[issueIndex]) {
      console.error(`Issue not found at index ${issueIndex}`);
      return { success: false, error: 'Issue not found' };
    }
    
    const issue = issueData.issues[issueIndex];
    const subscribers = issue.subscribers || [];
    
    if (!subscribers.length) {
      console.log('No subscribers found for this issue');
      return { success: true, notified: 0 };
    }
    
    // Get FCM tokens for all subscribers
    const tokens: string[] = [];
    const userNotificationsSnapshot = await db.collection('userNotifications')
      .where('userId', 'in', subscribers)
      .where('enabled', '==', true)
      .get();
      
    userNotificationsSnapshot.forEach((doc: any) => {
      const userData = doc.data();
      if (Array.isArray(userData.fcmTokens)) {
        tokens.push(...userData.fcmTokens);
      }
    });
    
    if (!tokens.length) {
      console.log('No FCM tokens found for subscribers');
      return { success: true, notified: 0 };
    }
    
    // Send notification to all tokens
    const payload = {
      notification: {
        title: title || `Issue Update: ${issue.issue}`,
        body: body || `Status: ${issue.status} - Update: ${changeType}`,
        icon: '/icon-192x192.png',
        clickAction: `/history?issueId=${issueId}`
      },
      data: {
        issueId,
        reportId,
        changeType
      }
    };

    let successCount = 0;
    let failureCount = 0;

    await Promise.all(tokens.map(async (token) => {
      try {
        await messaging.send({
          token,
          ...payload
        });
        successCount++;
      } catch (err) {
        failureCount++;
        console.error(`Failed to send notification to token ${token}:`, err);
      }
    }));

    console.log(`Successfully sent notifications to ${successCount} devices`);
    return { 
      success: true, 
      notified: successCount,
      failed: failureCount
    };
    
  } catch (error) {
    console.error('Error sending notifications:', error);
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return { success: false, error: errorMessage };
  }
}

// CREATE route handler for sending notifications via API
export async function POST(request: Request) {
  try {
    const { issueId, reportId, changeType, title, body } = await request.json();
    
    if (!issueId || !reportId || !changeType) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const result = await sendIssueChangeNotification(issueId, reportId, changeType, title, body);
    
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error in notification API:', error);
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
