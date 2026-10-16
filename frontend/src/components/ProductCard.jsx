import { useState } from 'react';
import { Link } from 'react-router';
import { categoryImageFor } from '../categoryImages.js';
import { formatRupees, packSizeName, percentOff } from '../formatting.js';
import { QuantityStepper } from './QuantityStepper.jsx';
import { RatingLine } from './Rating.jsx';

export function ProductImage({ product, className }) {
  const fallback = categoryImageFor(product.categoryName);
  const photoClass = product.imageUrl ? ' is-photo' : '';
  return <img className={`${className}${photoClass}`} src={product.imageUrl ?? fallback} alt="" loading="lazy" />;
}

// showDiscount: false when the "% off" is already shown on the photo.
export function PriceLine({ packSize, showDiscount = true }) {
  const discount = percentOff(packSize.maximumRetailPrice, packSize.price);
  return (
    <p className="price-line">
      <strong className="price">{formatRupees(packSize.price)}</strong>
      {discount > 0 && <s className="maximum-retail-price">MRP {formatRupees(packSize.maximumRetailPrice)}</s>}
      {showDiscount && discount > 0 && <span className="discount">{discount}% off</span>}
    </p>
  );
}

export function StockStatus({ packSize }) {
  if (!packSize.inStock) return <span className="pill pill-red">Out of stock</span>;
  if (packSize.fewLeft) return <span className="pill pill-amber">Only a few left</span>;
  return null;
}

function CardPhoto({ product, packSize }) {
  const discount = percentOff(packSize.maximumRetailPrice, packSize.price);
  return (
    <Link to={`/product/${product.id}`} className="product-card-media" aria-label={product.name}>
      <ProductImage product={product} className="product-card-image" />
      {packSize.inStock && discount > 0 && <span className="discount-badge">{discount}% OFF</span>}
      {packSize.inStock && packSize.fewLeft && <span className="product-card-few">Only a few left</span>}
      {!packSize.inStock && <span className="product-card-out">Out of stock</span>}
    </Link>
  );
}

// "Save ₹16" over the Add button; the button greys out when the pack is out of stock.
function CardBottom({ product, packSize }) {
  const saving = packSize.maximumRetailPrice - packSize.price;
  return (
    <div className="product-card-bottom">
      {packSize.inStock && saving > 0 && <span className="product-card-save">Save {formatRupees(saving)}</span>}
      {packSize.inStock
        ? <QuantityStepper packSize={packSize} productName={product.name} />
        : <button type="button" className="product-card-sold-out" disabled>Out of stock</button>}
    </div>
  );
}

// One product in a list: photo, brand, name, rating, pack size, price, Add.
// The Add buttons sit at the bottom, so they line up across a row.
export function ProductCard({ product }) {
  const [chosenPackSizeId, setChosenPackSizeId] = useState(product.packSizes[0].id);
  const packSize = product.packSizes.find((candidate) => candidate.id === chosenPackSizeId) ?? product.packSizes[0];
  return (
    <article className={packSize.inStock ? 'product-card' : 'product-card product-card-unavailable'}>
      <CardPhoto product={product} packSize={packSize} />
      <div className="product-card-details">
        {product.brand && <p className="product-card-brand">{product.brand}</p>}
        <Link to={`/product/${product.id}`} className="product-card-name">{product.name}</Link>
        <RatingLine rating={product.rating} />
        <PackSizePicker product={product} chosenPackSizeId={packSize.id} onChoose={setChosenPackSizeId} />
        <p className="product-card-price">
          <strong>{formatRupees(packSize.price)}</strong>
          {packSize.maximumRetailPrice > packSize.price && <s>{formatRupees(packSize.maximumRetailPrice)}</s>}
        </p>
        <CardBottom product={product} packSize={packSize} />
      </div>
    </article>
  );
}

function PackSizePicker({ product, chosenPackSizeId, onChoose }) {
  if (product.packSizes.length === 1) return <span className="product-card-pack">{packSizeName(product.packSizes[0])}</span>;
  return (
    <select className="product-card-pack product-card-pack-select" value={chosenPackSizeId}
      onChange={(event) => onChoose(Number(event.target.value))} aria-label={`Pack size for ${product.name}`}>
      {product.packSizes.map((packSize) => <option key={packSize.id} value={packSize.id}>{packSizeName(packSize)}</option>)}
    </select>
  );
}
