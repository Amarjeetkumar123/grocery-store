import { formatRupees, percentOff } from '../../../formatting.js';

export function VisibilityCard({ shown, onChange }) {
  return (
    <section className="card form-panel">
      <label className="switch-row visibility-row">
        <span><strong>Show in the shop</strong><small>{shown ? 'Customers can find and order it' : 'Hidden until you turn this on'}</small></span>
        <input type="checkbox" className="switch switch-green" role="switch" checked={shown} onChange={(event) => onChange(event.target.checked)} />
      </label>
    </section>
  );
}

// The product card as customers will see it, built from the first pack size.
export function ShopPreview({ formValues, imageUrl, isPhoto }) {
  const packSize = formValues.packSizes[0];
  const price = Number(packSize?.price) || 0;
  const discount = percentOff(Number(packSize?.maximumRetailPrice) || 0, price);
  return (
    <section className="card form-panel">
      <header className="form-panel-heading form-panel-heading-row"><h2>In the shop</h2><span className="hint">Preview</span></header>
      <div className="form-panel-body">
        <div className="shop-preview-card">
          <div className={`shop-preview-image${isPhoto ? ' is-photo' : ''}`}>{discount > 0 && <span className="discount-badge">{discount}% OFF</span>}<img src={imageUrl} alt="" /></div>
          <div className="shop-preview-details">
            <small>{formValues.brand || 'Brand'}</small>
            <strong>{formValues.name || 'Your product name'}</strong>
            <small>{packSize?.label || 'Pack size'}</small>
            <p className="shop-preview-price"><strong>{price ? formatRupees(price) : '₹ —'}</strong>{discount > 0 && <s>{formatRupees(Number(packSize.maximumRetailPrice))}</s>}<span className="shop-preview-add">Add</span></p>
          </div>
        </div>
      </div>
    </section>
  );
}
