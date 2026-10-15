import { useEffect, useRef, useState } from 'react';
import { useCart } from '../../cart/CartContext.jsx';
import { Icon } from '../../Icon.jsx';
import { CartPanel } from './CartPanel.jsx';

// Matches the slide-out time in styles.css (.cart-drawer).
const closingMilliseconds = 320;

// Keeps the contents on screen while the panel slides out, then removes them.
function useShownWhileClosing(open) {
  const [shown, setShown] = useState(open);
  if (open && !shown) setShown(true);
  useEffect(() => {
    if (open) return undefined;
    const timer = setTimeout(() => setShown(false), closingMilliseconds);
    return () => clearTimeout(timer);
  }, [open]);
  return shown;
}

// The cart as a panel sliding in from the right, over whatever page is open.
// A native <dialog>: Escape closes it, and focus stays inside while it is open.
export function CartDrawer() {
  const { cartOpen, closeCart, itemCount } = useCart();
  const dialogReference = useRef(null);
  const shown = useShownWhileClosing(cartOpen);

  useEffect(() => {
    const dialog = dialogReference.current;
    if (cartOpen && !dialog.open) dialog.showModal();
    if (!cartOpen && dialog.open) dialog.close();
  }, [cartOpen]);

  // A click on the dimmed area outside the panel closes it.
  const closeOnBackdrop = (event) => event.target === dialogReference.current && closeCart();
  return (
    <dialog ref={dialogReference} className="cart-drawer" aria-labelledby="cart-drawer-title" onClose={closeCart} onClick={closeOnBackdrop}>
      <div className="cart-drawer-inner">
        <header className="cart-drawer-header">
          <h2 id="cart-drawer-title">Cart{itemCount > 0 && <span className="hint"> · {itemCount} {itemCount === 1 ? 'item' : 'items'}</span>}</h2>
          <button type="button" className="icon-button" onClick={closeCart} aria-label="Close cart"><Icon name="close" /></button>
        </header>
        {shown && <CartPanel />}
      </div>
    </dialog>
  );
}
