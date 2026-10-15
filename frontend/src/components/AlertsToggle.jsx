import { useEffect, useState } from 'react';
import { findCurrentSubscription, isPushSupported, turnOffAlerts, turnOnAlerts } from '../push/pushNotifications.js';
import { Icon } from '../Icon.jsx';

const notes = {
  denied: 'Alerts are blocked for this site. Allow notifications in your browser settings.',
  unavailable: 'Alerts are not set up on the store server yet.',
  unsupported: 'On iPhone, first tap Share → Add to Home Screen, then open the app from there.',
};

// state: checking | on | off | busy | denied | unavailable | unsupported. note: why alerts cannot be used.
function useAlerts() {
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
  return { state, note: notes[state], toggle };
}

// "Turn on order alerts" for this browser. label: what the alerts are about.
export function AlertsToggle({ label = 'order alerts', className = 'button button-outline' }) {
  const { state, note, toggle } = useAlerts();
  if (state === 'checking') return null;
  if (note) return <p className="hint alerts-note"><Icon name="bell" size={16} /> {note}</p>;
  return (
    <button type="button" className={className} onClick={toggle} disabled={state === 'busy'}>
      <Icon name="bell" /> {state === 'on' ? `Turn off ${label}` : `Turn on ${label}`}
    </button>
  );
}

// Round bell for the shop header. A yellow dot means alerts are still off.
export function AlertsBell() {
  const { state, note, toggle } = useAlerts();
  const [showNote, setShowNote] = useState(false);
  if (state === 'checking') return null;
  const label = state === 'on' ? 'Turn off order alerts' : 'Turn on order alerts';
  return (
    <span className="alerts-bell-wrapper">
      <button type="button" className="alerts-bell" onClick={note ? () => setShowNote(!showNote) : toggle}
        disabled={state === 'busy'} aria-label={note ? 'Why alerts are off' : label} aria-pressed={state === 'on'} title={note ?? label}>
        <Icon name="bell" />
        {state !== 'on' && <span className="alerts-bell-dot" />}
      </button>
      {showNote && note && <span className="alerts-bell-note" role="status">{note}</span>}
    </span>
  );
}

// On/off switch row, for the admin sidebar. Greyed out with the reason when alerts cannot work here.
export function AlertsSwitch({ label }) {
  const { state, note, toggle } = useAlerts();
  if (state === 'checking') return null;
  return (
    <label className="alerts-switch" title={note}>
      <Icon name="bell" size={16} />
      <span>{label}</span>
      <input type="checkbox" className="switch" role="switch" checked={state === 'on'} disabled={Boolean(note) || state === 'busy'} onChange={toggle} />
    </label>
  );
}
