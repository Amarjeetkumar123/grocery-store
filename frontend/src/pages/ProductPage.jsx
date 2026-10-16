import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useApiData } from '../useApiData.js';
import { formatMonthYear, formatRupees, packSizeName } from '../formatting.js';
import { PageBar } from '../components/PageBar.jsx';
import { LoadingOrError } from '../components/LoadingOrError.jsx';
import { PriceLine, ProductCard, ProductImage, StockStatus } from '../components/ProductCard.jsx';
import { QuantityStepper } from '../components/QuantityStepper.jsx';
import { useCartSummary } from '../components/CartBar.jsx';
import { useCart } from '../cart/CartContext.jsx';
import { Icon } from '../Icon.jsx';
import { StarIcon } from '../components/Rating.jsx';
import { ProductReviews } from './product/ProductReviews.jsx';

function PackSizeChoices({ packSizes, chosenPackSize, onChoose }) {
  return (
    <div className="chip-row pack-choices" role="group" aria-label="Pack size">
      {packSizes.map((packSize) => (
        <button key={packSize.id} type="button" className="chip" aria-pressed={packSize.id === chosenPackSize.id}
          onClick={() => onChoose(packSize.id)}>
          {packSizeName(packSize)}
          <span className="chip-price">{formatRupees(packSize.price)}</span>
        </button>
      ))}
    </div>
  );
}

// The details printed on the pack, which online sellers must also show.
function PackDetails({ product, packSize }) {
  const rows = [
    ['Net quantity', packSizeName(packSize)],
    ['Manufacturer', product.manufacturer],
    ['Best before', formatMonthYear(packSize.bestBefore)],
    ['Country of origin', product.countryOfOrigin],
  ].filter(([, value]) => value);
  return (
    <dl className="card detail-list">
      {rows.map(([label, value]) => <div key={label} className="detail-row"><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
  );
}

// Photo with back and cart buttons floating over it, instead of a top bar.
function ProductHero({ product }) {
  const navigate = useNavigate();
  const { itemCount, openCart } = useCart();
  return (
    <div className="product-hero">
      <ProductImage product={product} className="product-hero-image" />
      <button type="button" className="hero-button hero-button-back" onClick={() => navigate(-1)} aria-label="Go back">
        <Icon name="back" />
      </button>
      <button type="button" className="hero-button hero-button-cart" onClick={openCart} aria-label={`Cart, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}>
        <Icon name="cart" />
        {itemCount > 0 && <span className="tab-badge">{itemCount}</span>}
      </button>
    </div>
  );
}

function GoToCartButton() {
  const { itemsLabel, total } = useCartSummary();
  const { openCart } = useCart();
  return (
    <button type="button" className="button button-large go-to-cart" onClick={openCart}>
      <span><strong>Go to cart</strong><small>{itemsLabel}{total ? ` · ${formatRupees(total)}` : ''}</small></span>
      <Icon name="right" />
    </button>
  );
}

// Bottom bar: "Add to cart" first, then the quantity and a way to the cart.
function BuyBar({ product, packSize }) {
  const { quantityOf, setQuantity } = useCart();
  const inCart = quantityOf(packSize.id) > 0;
  let content = <button type="button" className="button button-large" disabled>Out of stock</button>;
  if (inCart) {
    content = <><QuantityStepper packSize={packSize} productName={product.name} large /><GoToCartButton /></>;
  } else if (packSize.inStock) {
    content = (
      <button type="button" className="button button-large" onClick={() => setQuantity(packSize.id, 1)}>
        <Icon name="plus" /> Add to cart · {formatRupees(packSize.price)}
      </button>
    );
  }
  return <div className="bottom-action buy-bar">{content}</div>;
}

// Other products from the same category, under the details.
function SimilarProducts({ product }) {
  const { data } = useApiData(`/api/products?categoryId=${product.categoryId}`);
  const others = (data?.products ?? []).filter((candidate) => candidate.id !== product.id).slice(0, 6);
  if (others.length === 0) return null;
  return (
    <section className="similar-products">
      <h2 className="section-title">You may also like</h2>
      <div className="product-row">{others.map((other) => <ProductCard key={other.id} product={other} />)}</div>
    </section>
  );
}

// "4.4 ★ · 128 ratings" under the name; a tap scrolls to the reviews.
function TitleRating({ rating }) {
  if (!rating?.count) return null;
  return (
    <a href="#reviews" className="title-rating">
      <span className="rating-chip">{rating.average.toFixed(1)} <StarIcon size={10} /></span>
      {rating.count} {rating.count === 1 ? 'rating' : 'ratings'}
    </a>
  );
}

// Phones: picture on top, Add to cart fixed at the bottom. Computers: picture on the left, details on the right.
function ProductDetails({ product, packSize, onChoosePackSize, onRatingsChanged }) {
  return (
    <div className="product-layout">
      <ProductHero product={product} />
      <div className="product-details">
        <div>
          {product.brand && <p className="brand-name">{product.brand}</p>}
          <h1 className="product-title">{product.name}</h1>
          <TitleRating rating={product.rating} />
        </div>
        <PackSizeChoices packSizes={product.packSizes} chosenPackSize={packSize} onChoose={onChoosePackSize} />
        <PriceLine packSize={packSize} />
        <StockStatus packSize={packSize} />
        <BuyBar product={product} packSize={packSize} />
        {product.description && <p className="hint">{product.description}</p>}
        <PackDetails product={product} packSize={packSize} />
        <ProductReviews product={product} onRatingsChanged={onRatingsChanged} />
        <SimilarProducts product={product} />
      </div>
    </div>
  );
}

export function ProductPage() {
  const { productId } = useParams();
  const { data, error, loading, reload } = useApiData(`/api/products/${encodeURIComponent(productId)}`);
  const [chosenPackSizeId, setChosenPackSizeId] = useState(null);
  const product = data?.product;
  const packSize = product?.packSizes.find((candidate) => candidate.id === chosenPackSizeId) ?? product?.packSizes[0];

  return (
    <main className="app-shell product-page">
      {!product && <PageBar title="Product" />}
      <div className="page-body">
        <LoadingOrError loading={loading && !product} error={product ? null : error} onRetry={reload} />
        {product && <ProductDetails key={product.id} product={product} packSize={packSize} onChoosePackSize={setChosenPackSizeId} onRatingsChanged={reload} />}
      </div>
    </main>
  );
}
