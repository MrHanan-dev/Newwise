// ===============================
// Service Worker Registration Helper
// ===============================
// This file helps register the service worker for PWA functionality and notifications

// Register Firebase Messaging service worker
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered with scope:', registration.scope);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  } else {
    console.warn('Service workers are not supported in this browser');
    return null;
  }
}
