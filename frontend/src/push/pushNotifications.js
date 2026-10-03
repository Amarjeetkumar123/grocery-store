import { callApi } from '../apiClient.js';

// Order alerts through the browser's own push service (free).
// iPhone: only after "Add to Home Screen", on iOS 16.4 or newer.

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// The server's public key arrives as base64url text; the browser wants bytes.
function toBytes(base64Url) {
  const base64 = (base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

export async function findCurrentSubscription() {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

// Returns "on", "denied" or "unavailable" (no keys on the server).
export async function turnOnAlerts() {
  const { publicKey } = await callApi('/api/push/public-key');
  if (!publicKey) return 'unavailable';
  if ((await Notification.requestPermission()) !== 'granted') return 'denied';
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toBytes(publicKey) });
  await callApi('/api/push/subscriptions', { method: 'POST', body: subscription.toJSON() });
  return 'on';
}

// Also used at sign-out, so a shared phone stops getting someone else's alerts.
export async function turnOffAlerts() {
  const subscription = await findCurrentSubscription().catch(() => null);
  if (!subscription) return;
  await callApi('/api/push/subscriptions', { method: 'DELETE', body: { endpoint: subscription.endpoint } }).catch(() => {});
  await subscription.unsubscribe();
}
