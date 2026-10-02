import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { AuthenticationProvider } from './AuthenticationContext.jsx';
import { CartProvider } from './cart/CartContext.jsx';
import { App } from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthenticationProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </AuthenticationProvider>
    </BrowserRouter>
  </StrictMode>,
);
