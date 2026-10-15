import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useApiData } from '../useApiData.js';
import { formatMonthYear, formatRupees } from '../formatting.js';
import { PageBar } from '../components/PageBar.jsx';
import { LoadingOrError } from '../components/LoadingOrError.jsx';
import { PriceLine, ProductImage, StockStatus } from '../components/ProductCard.jsx';
import { QuantityStepper } from '../components/QuantityStepper.jsx';
import { useCartSummary } from '../components/CartBar.jsx';
import { useCart } from '../cart/CartContext.jsx';
import { Icon } from '../Icon.jsx';

function PackSizeChoices({ packSizes, chosenPackSize, onChoose }) {
  return (
    <div className="chip-row pack-choices" role="group" aria-label="Pack size">
      {packSizes.map((packSize) => (
        <button key={packSize.id} type="button" className="chip" aria-pressed={packSize.id === chosenPackSize.id}
          onClick={() => onChoose(packSize.id)}>
          {packSize.label}
          <span className="chip-price">{formatRupees(packSize.price)}</span>
        </button>
      ))}
    </div>
  );
}

// The details printed on the pack, which online sellers must also show.
function PackDetails({ product, packSize }) {
  const rows = [
    ['Net quantity', packSize.label],
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
  const { itemCount } = useCart();
  return (
    <div className="product-hero">
      <ProductImage product={product} className="product-hero-image" />
      <button type="button" className="hero-button hero-button-back" onClick={() => navigate(-1)} aria-label="Go back">
        <Icon name="back" />
      </button>
      <Link to="/cart" className="hero-button hero-button-cart" aria-label={`Cart, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}>
        <Icon name="cart" />
        {itemCount > 0 && <span className="tab-badge">{itemCount}</span>}
      </Link>
    </div>
  );
}

function GoToCartButton() {
  const { itemsLabel, total } = useCartSummary();
  return (
    <Link to="/cart" className="button button-large go-to-cart">
      <span><strong>Go to cart</strong><small>{itemsLabel}{total ? ` · ${formatRupees(total)}` : ''}</small></span>
      <Icon name="right" />
    </Link>
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
        <LoadingOrError loading={loading} error={error} onRetry={reload} />
        {product && (
          <>
            <ProductHero product={product} />
            <div>
              {product.brand && <p className="brand-name">{product.brand}</p>}
              <h1 className="product-title">{product.name}</h1>
            </div>
            <PackSizeChoices packSizes={product.packSizes} chosenPackSize={packSize} onChoose={setChosenPackSizeId} />
            <PriceLine packSize={packSize} />
            <StockStatus packSize={packSize} />
            {product.description && <p className="hint">{product.description}</p>}
            <PackDetails product={product} packSize={packSize} />
          </>
        )}
      </div>
      {packSize && <BuyBar product={product} packSize={packSize} />}
    </main>
  );
}
