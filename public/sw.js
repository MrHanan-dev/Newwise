// ===============================
// Service Worker for ShiftWise App
// ===============================
// This service worker handles background notifications and offline functionality

importScripts("./firebase-config.js");
importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js");

// Your web app's Firebase configuration is in firebase-config.js

// Initialize Firebase
if (typeof firebase !== 'undefined' && typeof firebase.initializeApp !== 'function') {
    firebase.initializeApp(firebaseConfig);
} else if (typeof firebase !== 'undefined' && firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
}

const messaging = firebase.messaging();

// Optional: Background Message Handler
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/icon-192x192.png",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Listen for push events
self.addEventListener('push', event => {
  try {
    const data = event.data?.json() || {};
    const { title, body, issueId, url } = data;
    
    const notificationOptions = {
      body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      data: { issueId, url },
      vibrate: [100, 50, 100],
      tag: issueId, // Group notifications by issue
      renotify: true
    };
    
    // Display the notification
    event.waitUntil(
      self.registration.showNotification(title || 'ShiftWise Update', notificationOptions)
    );
  } catch (error) {
    console.error('Error showing notification:', error);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  const notification = event.notification;
  notification.close();
  
  const issueId = notification.data?.issueId;
  const url = notification.data?.url || '/history';
  
  // Open or focus the app and navigate to the issue
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // Check if there is already a window/tab open with the target URL
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no window/tab is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(issueId ? `${url}?issueId=${issueId}` : url);
      }
    })
  );
});

// Skip the waiting phase
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Cache the app shell for offline use
const CACHE_NAME = 'shiftwise-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return the cached response if found
        if (response) {
          return response;
        }
        
        // Otherwise try to fetch from network
        return fetch(event.request)
          .then(response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response
            const responseToCache = response.clone();
            
            // Add it to the cache for later use
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          });
      })
  );
});
