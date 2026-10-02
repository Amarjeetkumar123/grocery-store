import { Link } from 'react-router';
import { useCart } from '../../cart/CartContext.jsx';
import { formatRupees } from '../../formatting.js';
import { ProductImage } from '../../components/ProductCard.jsx';
import { QuantityStepper } from '../../components/QuantityStepper.jsx';

function CartLine({ line }) {
  const { setQuantity } = useCart();
  const noLongerSold = line.problem === 'This item is no longer sold.';
  const packSize = { id: line.packSizeId, label: line.packLabel, inStock: true };
  return (
    <li className="cart-line">
      <ProductImage product={line} className="cart-line-image" />
      <div className="cart-line-details">
        <Link to={`/product/${line.productId}`} className="product-card-name">{line.productName}</Link>
        <p className="hint">{line.packLabel} · {formatRupees(line.unitPrice)}</p>
        {line.problem && <p className="field-error">{line.problem}</p>}
      </div>
      {noLongerSold
        ? <button type="button" className="text-button small-text-button" onClick={() => setQuantity(line.packSizeId, 0)}>Remove</button>
        : <QuantityStepper packSize={packSize} productName={line.productName} />}
    </li>
  );
}

export function CartLines({ lines }) {
  return (
    <ul className="card cart-lines">
      {lines.map((line) => <CartLine key={line.packSizeId} line={line} />)}
    </ul>
  );
}
