import webPush from 'web-push';

const sixHoursInSeconds = 6 * 60 * 60;

// Sends browser notifications with the store's own VAPID keys (free, no
// third-party service). Without keys, alerts are simply switched off.
export function createPushSender({ publicKey, privateKey, subject }) {
  const isConfigured = Boolean(publicKey && privateKey && subject);
  if (isConfigured) webPush.setVapidDetails(subject, publicKey, privateKey);
  return {
    isConfigured,
    publicKey: isConfigured ? publicKey : null,
    // Returns "sent", or "gone" when the browser has dropped this subscription.
    async send(subscription, message) {
      try {
        await webPush.sendNotification(subscription, JSON.stringify(message), { TTL: sixHoursInSeconds });
        return 'sent';
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) return 'gone';
        throw error;
      }
    },
  };
}
