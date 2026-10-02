import { maximumQuantityPerItem, useCart } from '../cart/CartContext.jsx';
import { Icon } from '../Icon.jsx';

// "Add" until the pack is in the cart, then  –  2  +
export function QuantityStepper({ packSize, productName, large = false }) {
  const { quantityOf, setQuantity } = useCart();
  const quantity = quantityOf(packSize.id);
  const sizeClass = large ? ' stepper-large' : '';
  const label = `${productName}, ${packSize.label}`;

  if (!packSize.inStock && quantity === 0) return null;
  if (quantity === 0) {
    return (
      <button type="button" className={`add-button${sizeClass}`} onClick={() => setQuantity(packSize.id, 1)} aria-label={`Add ${label}`}>
        Add
      </button>
    );
  }
  return (
    <div className={`stepper${sizeClass}`} role="group" aria-label={`Quantity of ${label}`}>
      <button type="button" onClick={() => setQuantity(packSize.id, quantity - 1)} aria-label="One less"><Icon name="minus" size={18} /></button>
      <span aria-live="polite">{quantity}</span>
      <button type="button" onClick={() => setQuantity(packSize.id, quantity + 1)} disabled={quantity >= maximumQuantityPerItem}
        aria-label="One more"><Icon name="plus" size={18} /></button>
    </div>
  );
}
