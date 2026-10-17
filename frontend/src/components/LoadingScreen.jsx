import logoImage from '../assets/logo.png';

// Full-screen loader while the app works out who is signed in. The name is fixed
// (like the page title) because the store settings are not loaded yet.
export function LoadingScreen() {
  return (
    <div className="splash-screen" role="status" aria-label="Loading">
      <div className="splash-top">
        <div className="splash-logo">
          <svg className="splash-ring" viewBox="0 0 114 114" aria-hidden="true">
            <rect x="1.5" y="1.5" width="111" height="111" rx="32" pathLength="100" />
          </svg>
          <img src={logoImage} alt="" />
        </div>
      </div>
      <p className="splash-name">Grocery Store</p>
      <p className="splash-tagline">Fresh groceries from your neighbourhood</p>
      <p className="splash-foot">Delivered to your door</p>
    </div>
  );
}
