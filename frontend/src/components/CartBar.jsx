import { Link } from 'react-router';
import { useCart } from '../cart/CartContext.jsx';
import { useCartQuote } from '../cart/useCartQuote.js';
import { useDebouncedValue } from '../useDebouncedValue.js';
import { formatRupees } from '../formatting.js';
import { Icon } from '../Icon.jsx';
import { ProductImage } from './ProductCard.jsx';

// Item count, plus the fresh total once the shopper stops tapping + and −.
export function useCartSummary() {
  const { items, itemCount } = useCart();
  const quote = useCartQuote(useDebouncedValue(items, 400));
  return {
    itemCount,
    itemsLabel: `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`,
    total: itemCount > 0 ? quote.cart?.total : null,
    lines: quote.cart?.lines ?? [],
  };
}

// Floating "View cart" bar. aboveTabBar: the page also shows the tab bar.
export function CartBar({ aboveTabBar = false }) {
  const { itemCount, itemsLabel, total, lines } = useCartSummary();
  if (itemCount === 0) return null;
  return (
    <div className={aboveTabBar ? 'cart-bar cart-bar-above-tabs' : 'cart-bar'}>
      <Link to="/cart" className="cart-bar-link">
        <span className="cart-bar-photos" aria-hidden="true">
          {lines.slice(0, 2).map((line) => <ProductImage key={line.packSizeId} product={line} className="cart-bar-photo" />)}
        </span>
        <span className="cart-bar-summary">
          <strong>{total ? formatRupees(total) : itemsLabel}</strong>
          {total && <small>{itemsLabel}</small>}
        </span>
        <span className="cart-bar-button">View cart <Icon name="right" size={16} /></span>
      </Link>
    </div>
  );
}
