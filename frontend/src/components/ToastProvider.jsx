import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Icon } from '../Icon.jsx';

const ToastContext = createContext(null);
const toneIcons = { success: 'check', error: 'close', info: 'bell' };
const maximumToasts = 3;

// Short messages after an action: showToast('Product deleted') or showToast(message, 'error').
// Errors stay a little longer so there is time to read them.
export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);
  const dismiss = useCallback((id) => setToasts((list) => list.filter((toast) => toast.id !== id)), []);
  const showToast = useCallback((message, tone = 'success') => {
    const id = nextId.current++;
    setToasts((list) => [...list.slice(1 - maximumToasts), { id, message, tone }]);
    setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 3500);
  }, [dismiss]);
  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.tone}`}>
            <span className="toast-icon" aria-hidden="true"><Icon name={toneIcons[toast.tone]} size={14} /></span>
            <p>{toast.message}</p>
            <button type="button" className="toast-close" onClick={() => dismiss(toast.id)} aria-label="Dismiss"><Icon name="close" size={14} /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
