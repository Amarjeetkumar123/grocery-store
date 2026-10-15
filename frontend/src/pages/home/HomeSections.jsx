import { useApiData } from '../../useApiData.js';
import { formatCutoff, formatDeliveryDay, formatTimeRange } from '../../formatting.js';
import { ProductCard } from '../../components/ProductCard.jsx';

// Computers only: the next three delivery slots with places left.
export function NextSlotsCard() {
  const { data } = useApiData('/api/checkout/slots');
  const openSlots = (data?.slots ?? []).filter((slot) => slot.placesLeft > 0).slice(0, 3);
  return (
    <section className="card next-slots">
      <p className="hint">Next delivery slots</p>
      {data && openSlots.length === 0 && <p className="hint">No slots open right now.</p>}
      {openSlots.map((slot) => (
        <div key={`${slot.slotId}|${slot.deliveryDate}`} className="next-slot-row">
          <strong>{formatDeliveryDay(slot.deliveryDate)}, {formatTimeRange(slot.startTime, slot.endTime)}</strong>
          <span className="hint">Order by {formatCutoff(slot.cutoffAt)}</span>
        </div>
      ))}
    </section>
  );
}

// Best sellers of the week. A sideways row on phones, a grid on computers.
export function PopularProducts() {
  const { data } = useApiData('/api/products/popular');
  const products = data?.products ?? [];
  if (products.length === 0) return null;
  return (
    <section className="home-section">
      <h2 className="section-title">Popular this week</h2>
      <div className="product-row">
        {products.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
    </section>
  );
}
