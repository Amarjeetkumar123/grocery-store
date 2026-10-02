import { useEffect, useState } from 'react';
import { useDebouncedValue } from '../useDebouncedValue.js';
import { useSearchParams } from 'react-router';
import { useApiData } from '../useApiData.js';
import { Icon } from '../Icon.jsx';
import { ProductCard } from '../components/ProductCard.jsx';
import { LoadingOrError } from '../components/LoadingOrError.jsx';
import { TabBar } from '../components/TabBar.jsx';

export function SearchPage() {
  const [searchParameters, setSearchParameters] = useSearchParams();
  const [searchText, setSearchText] = useState(searchParameters.get('query') ?? '');
  const debouncedText = useDebouncedValue(searchText.trim());
  const canSearch = debouncedText.length >= 2;
  const results = useApiData(canSearch ? `/api/products?search=${encodeURIComponent(debouncedText)}` : null);

  useEffect(() => {
    setSearchParameters(debouncedText ? { query: debouncedText } : {}, { replace: true });
  }, [debouncedText, setSearchParameters]);

  const products = results.data?.products ?? [];
  return (
    <main className="app-shell">
      <header className="page-bar">
        <label className="search-input">
          <Icon name="search" />
          <input type="search" value={searchText} onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search atta, oil, dal…" aria-label="Search products" autoFocus />
        </label>
      </header>
      <div className="page-body">
        {!canSearch && <p className="hint centered">Type at least 2 letters, like “atta” or “Fortune”.</p>}
        {canSearch && <LoadingOrError loading={results.loading} error={results.error} onRetry={results.reload} />}
        {canSearch && results.data && products.length === 0 && <p className="hint centered">No products match “{debouncedText}”.</p>}
        <div className="product-list">
          {products.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </div>
      <TabBar />
    </main>
  );
}
