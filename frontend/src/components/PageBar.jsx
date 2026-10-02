import { useNavigate } from 'react-router';
import { Icon } from '../Icon.jsx';

// Top bar with a back button, a title and an optional subtitle.
export function PageBar({ title, subtitle, children }) {
  const navigate = useNavigate();
  return (
    <header className="page-bar page-bar-with-back">
      <button type="button" className="icon-button" onClick={() => navigate(-1)} aria-label="Go back">
        <Icon name="back" />
      </button>
      <div className="page-bar-title">
        <h1>{title}</h1>
        {subtitle && <p className="hint">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}
