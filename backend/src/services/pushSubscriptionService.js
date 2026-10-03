import { deleteSubscription, saveSubscription } from '../dbHelper/pushSubscriptionDbHelper.js';
import { ServiceError } from './serviceError.js';

// Only the browsers' own push services: the server will send requests to
// this address, so it must never be an address someone made up.
const pushServiceHosts = [/^fcm\.googleapis\.com$/, /\.push\.services\.mozilla\.com$/, /^web\.push\.apple\.com$/, /\.notify\.windows\.com$/];

function readEndpoint(value) {
  try {
    const url = new URL(value);
    const known = url.protocol === 'https:' && pushServiceHosts.some((pattern) => pattern.test(url.hostname));
    return known && value.length <= 1000 ? value : null;
  } catch {
    return null;
  }
}

const isShortText = (value) => typeof value === 'string' && value.length > 0 && value.length <= 200;

// body: the browser's PushSubscription as JSON: { endpoint, keys: { p256dh, auth } }
async function subscribe({ database }, user, body) {
  const endpoint = readEndpoint(body.endpoint);
  const { p256dh, auth } = body.keys ?? {};
  if (!endpoint || !isShortText(p256dh) || !isShortText(auth)) throw ServiceError.badRequest('This browser cannot receive alerts.');
  await saveSubscription(database, user.id, { endpoint, keys: { p256dh, auth } });
  return { subscribed: true };
}

async function unsubscribe({ database }, user, body) {
  if (typeof body.endpoint === 'string') await deleteSubscription(database, body.endpoint, user.id);
  return { subscribed: false };
}

export function createPushSubscriptionService(dependencies) {
  return {
    publicKey: () => ({ publicKey: dependencies.pushSender.publicKey }),
    subscribe: (user, body) => subscribe(dependencies, user, body),
    unsubscribe: (user, body) => unsubscribe(dependencies, user, body),
  };
}
