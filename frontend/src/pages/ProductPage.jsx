import { useState } from 'react';
import { useParams } from 'react-router';
import { useApiData } from '../useApiData.js';
import { formatMonthYear, formatRupees } from '../formatting.js';
import { PageBar } from '../components/PageBar.jsx';
import { LoadingOrError } from '../components/LoadingOrError.jsx';
import { PriceLine, ProductImage, StockStatus } from '../components/ProductCard.jsx';

function PackSizeChoices({ packSizes, chosenPackSize, onChoose }) {
  return (
    <div className="chip-row" role="group" aria-label="Pack size">
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

export function ProductPage() {
  const { productId } = useParams();
  const { data, error, loading, reload } = useApiData(`/api/products/${encodeURIComponent(productId)}`);
  const [chosenPackSizeId, setChosenPackSizeId] = useState(null);
  const product = data?.product;
  const packSize = product?.packSizes.find((candidate) => candidate.id === chosenPackSizeId) ?? product?.packSizes[0];

  return (
    <main className="app-shell">
      <PageBar title={product?.name ?? 'Product'} />
      <div className="page-body">
        <LoadingOrError loading={loading} error={error} onRetry={reload} />
        {product && (
          <>
            <ProductImage product={product} className="product-hero-image" />
            <div>
              {product.brand && <p className="brand-name">{product.brand}</p>}
              <h2 className="product-title">{product.name}</h2>
            </div>
            <PackSizeChoices packSizes={product.packSizes} chosenPackSize={packSize} onChoose={setChosenPackSizeId} />
            <PriceLine packSize={packSize} />
            <StockStatus packSize={packSize} />
            {product.description && <p className="hint">{product.description}</p>}
            <PackDetails product={product} packSize={packSize} />
          </>
        )}
      </div>
    </main>
  );
}
