import { Link } from 'react-router';
import { useCart } from '../cart/CartContext.jsx';
import { Icon } from '../Icon.jsx';

// Sticky "View cart" bar for pages without the tab bar.
export function CartBar() {
  const { itemCount } = useCart();
  if (itemCount === 0) return null;
  return (
    <div className="bottom-action">
      <Link to="/cart" className="button button-large">
        <Icon name="cart" /> View cart · {itemCount} {itemCount === 1 ? 'item' : 'items'}
      </Link>
    </div>
  );
}
