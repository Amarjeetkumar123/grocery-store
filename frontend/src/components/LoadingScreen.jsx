import logoImage from '../assets/logo.png';

// Full-screen loader while the app works out who is signed in.
export function LoadingScreen() {
  return (
    <div className="splash-screen" role="status" aria-label="Loading">
      <span className="splash-logo"><img src={logoImage} alt="" /></span>
      <span className="loading-dots" aria-hidden="true"><i /><i /><i /></span>
    </div>
  );
}
