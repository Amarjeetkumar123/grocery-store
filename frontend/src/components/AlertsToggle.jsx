import { useEffect, useState } from 'react';
import { findCurrentSubscription, isPushSupported, turnOffAlerts, turnOnAlerts } from '../push/pushNotifications.js';
import { Icon } from '../Icon.jsx';

const notes = {
  denied: 'Alerts are blocked for this site. Allow notifications in your browser settings.',
  unavailable: 'Alerts are not set up on the store server yet.',
  unsupported: 'On iPhone, first tap Share → Add to Home Screen, then open the app from there.',
};

// "Turn on order alerts" for this browser. label: what the alerts are about.
export function AlertsToggle({ label = 'order alerts', className = 'button button-outline' }) {
  const [state, setState] = useState(isPushSupported() ? 'checking' : 'unsupported');
  useEffect(() => {
    if (state !== 'checking') return;
    if (Notification.permission === 'denied') setState('denied');
    else findCurrentSubscription().then((subscription) => setState(subscription ? 'on' : 'off')).catch(() => setState('off'));
  }, [state]);

  async function toggle() {
    setState('busy');
    try {
      if (state === 'on') {
        await turnOffAlerts();
        setState('off');
      } else setState(await turnOnAlerts());
    } catch {
      setState('off');
    }
  }

  if (state === 'checking') return null;
  if (notes[state]) return <p className="hint alerts-note"><Icon name="bell" size={16} /> {notes[state]}</p>;
  return (
    <button type="button" className={className} onClick={toggle} disabled={state === 'busy'}>
      <Icon name="bell" /> {state === 'on' ? `Turn off ${label}` : `Turn on ${label}`}
    </button>
  );
}
