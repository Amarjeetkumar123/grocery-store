import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import logoImage from '../assets/logo.png';
import { Icon } from '../Icon.jsx';

const dismissedKey = 'installBarDismissedAt';
const hideForDays = 7;
const staffPaths = ['/admin', '/rider'];

function dismissedRecently() {
  try {
    const dismissedAt = Number(localStorage.getItem(dismissedKey));
    return Date.now() - dismissedAt < hideForDays * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function rememberDismissed() {
  try {
    localStorage.setItem(dismissedKey, String(Date.now()));
  } catch {
    // Private mode: the bar may come back next visit, which is fine.
  }
}

// Chrome fires beforeinstallprompt when the site can be installed (never once it is).
// Its own install box can only open from a tap, so we keep the event for the Install button.
function useInstallEvent() {
  const [installEvent, setInstallEvent] = useState(null);
  useEffect(() => {
    const keep = (event) => { event.preventDefault(); setInstallEvent(event); };
    const forget = () => setInstallEvent(null);
    window.addEventListener('beforeinstallprompt', keep);
    window.addEventListener('appinstalled', forget);
    return () => {
      window.removeEventListener('beforeinstallprompt', keep);
      window.removeEventListener('appinstalled', forget);
    };
  }, []);
  return [installEvent, setInstallEvent];
}

// "Get the app" bar at the top on the login and shop pages (mobile Chrome, Edge, Samsung Internet).
// × or a swipe up hides it for 7 days.
export function InstallAppBar() {
  const [installEvent, setInstallEvent] = useInstallEvent();
  const [hidden, setHidden] = useState(dismissedRecently);
  const { pathname } = useLocation();
  const touchStartY = useRef(null);
  if (!installEvent || hidden || staffPaths.some((path) => pathname.startsWith(path))) return null;

  const dismiss = () => { rememberDismissed(); setHidden(true); };
  async function install() {
    installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    setInstallEvent(null);
    if (outcome === 'dismissed') dismiss();
  }
  return (
    <aside className="install-bar" aria-label="Install the app"
      onTouchStart={(event) => { touchStartY.current = event.touches[0].clientY; }}
      onTouchEnd={(event) => { if (touchStartY.current - event.changedTouches[0].clientY > 30) dismiss(); }}>
      <img src={logoImage} alt="" />
      <p><b>Get the app</b><span>Order faster, get alerts</span></p>
      <button type="button" className="install-bar-button" onClick={install}><Icon name="download" size={14} /> Install</button>
      <button type="button" className="install-bar-close" onClick={dismiss} aria-label="Not now"><Icon name="close" size={12} /></button>
    </aside>
  );
}
