import { useState } from 'react';
import { Link } from 'react-router';
import { categoryImageFor } from '../categoryImages.js';
import { formatRupees, percentOff } from '../formatting.js';
import { QuantityStepper } from './QuantityStepper.jsx';

export function ProductImage({ product, className }) {
  const fallback = categoryImageFor(product.categoryName);
  return <img className={className} src={product.imageUrl ?? fallback} alt="" loading="lazy" />;
}

export function PriceLine({ packSize }) {
  const discount = percentOff(packSize.maximumRetailPrice, packSize.price);
  return (
    <p className="price-line">
      <strong className="price">{formatRupees(packSize.price)}</strong>
      {discount > 0 && <s className="maximum-retail-price">MRP {formatRupees(packSize.maximumRetailPrice)}</s>}
      {discount > 0 && <span className="discount">{discount}% off</span>}
    </p>
  );
}

export function StockStatus({ packSize }) {
  if (!packSize.inStock) return <span className="pill pill-red">Out of stock</span>;
  if (packSize.fewLeft) return <span className="pill pill-amber">Only a few left</span>;
  return null;
}

// One product in a list: picture, name, pack size picker and price.
export function ProductCard({ product }) {
  const [chosenPackSizeId, setChosenPackSizeId] = useState(product.packSizes[0].id);
  const packSize = product.packSizes.find((candidate) => candidate.id === chosenPackSizeId) ?? product.packSizes[0];
  return (
    <article className={packSize.inStock ? 'product-card' : 'product-card product-card-unavailable'}>
      <Link to={`/product/${product.id}`} className="product-card-image-link" aria-label={product.name}>
        <ProductImage product={product} className="product-card-image" />
      </Link>
      <div className="product-card-details">
        <Link to={`/product/${product.id}`} className="product-card-name">{product.name}</Link>
        {product.brand && <p className="hint">{product.brand}</p>}
        <PackSizePicker product={product} chosenPackSizeId={packSize.id} onChoose={setChosenPackSizeId} />
        <div className="price-row">
          <PriceLine packSize={packSize} />
          <QuantityStepper packSize={packSize} productName={product.name} />
        </div>
        <StockStatus packSize={packSize} />
      </div>
    </article>
  );
}

function PackSizePicker({ product, chosenPackSizeId, onChoose }) {
  if (product.packSizes.length === 1) return <span className="pack-label">{product.packSizes[0].label}</span>;
  return (
    <select
      className="pack-select"
      value={chosenPackSizeId}
      onChange={(event) => onChoose(Number(event.target.value))}
      aria-label={`Pack size for ${product.name}`}
    >
      {product.packSizes.map((packSize) => <option key={packSize.id} value={packSize.id}>{packSize.label}</option>)}
    </select>
  );
}
