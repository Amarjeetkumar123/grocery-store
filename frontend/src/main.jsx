import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { AuthenticationProvider } from './AuthenticationContext.jsx';
import { CartProvider } from './cart/CartContext.jsx';
import { DialogProvider } from './components/DialogProvider.jsx';
import { ToastProvider } from './components/ToastProvider.jsx';
import { App } from './App.jsx';
import './styles.css';

// Needed for order alerts and for "Add to Home Screen".
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').catch((error) => console.warn('Service worker not registered', error));
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthenticationProvider>
        <CartProvider>
          <ToastProvider>
            <DialogProvider>
              <App />
            </DialogProvider>
          </ToastProvider>
        </CartProvider>
      </AuthenticationProvider>
    </BrowserRouter>
  </StrictMode>,
);
