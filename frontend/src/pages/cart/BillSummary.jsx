import { formatRupees } from '../../formatting.js';
import { Icon } from '../../Icon.jsx';

function DeliveryChargeValue({ cart }) {
  if (cart.deliveryCharge > 0) return formatRupees(cart.deliveryCharge);
  if (cart.fullDeliveryCharge === 0) return 'FREE';
  return <><s className="maximum-retail-price">{formatRupees(cart.fullDeliveryCharge)}</s> <strong className="discount">FREE</strong></>;
}

function BillHint({ cart }) {
  if (!cart.meetsMinimum) {
    return (
      <p className="notice notice-warning">
        Minimum order for your area is {formatRupees(cart.minimumOrderValue)}.
        Add {formatRupees(cart.minimumOrderValue - cart.itemsTotal)} more.
      </p>
    );
  }
  if (cart.deliveryCharge > 0 && cart.freeDeliveryAbove !== null) {
    return <p className="hint">Add {formatRupees(cart.freeDeliveryAbove - cart.itemsTotal)} more for free delivery.</p>;
  }
  return null;
}

export function BillSummary({ cart }) {
  const itemCount = cart.lines.filter((line) => !line.problem).reduce((sum, line) => sum + line.quantity, 0);
  return (
    <section className="card bill">
      <div className="detail-row"><span>Items ({itemCount})</span><span>{formatRupees(cart.itemsTotal)}</span></div>
      <div className="detail-row"><span>Delivery</span><span><DeliveryChargeValue cart={cart} /></span></div>
      <div className="detail-row bill-total"><span>To pay</span><span>{formatRupees(cart.total)}</span></div>
      <BillHint cart={cart} />
      <p className="pay-at-door"><Icon name="cash" size={18} /> Pay at your door · Cash or UPI</p>
    </section>
  );
}
