import { useParams } from 'react-router';
import { useApiData } from '../useApiData.js';
import { PageBar } from '../components/PageBar.jsx';
import { ProductCard } from '../components/ProductCard.jsx';
import { LoadingOrError } from '../components/LoadingOrError.jsx';
import { TabBar } from '../components/TabBar.jsx';

export function CategoryPage() {
  const { categoryId } = useParams();
  const categories = useApiData('/api/categories');
  const products = useApiData(`/api/products?categoryId=${encodeURIComponent(categoryId)}`);
  const category = categories.data?.categories.find((candidate) => String(candidate.id) === categoryId);
  const productList = products.data?.products ?? [];

  return (
    <main className="app-shell">
      <PageBar title={category?.name ?? 'Products'} subtitle={products.data ? `${productList.length} ${productList.length === 1 ? 'product' : 'products'}` : null} />
      <div className="page-body">
        <LoadingOrError loading={products.loading} error={products.error} onRetry={products.reload} />
        {products.data && productList.length === 0 && <p className="hint centered">No products here yet.</p>}
        <div className="product-list">
          {productList.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </div>
      <TabBar />
    </main>
  );
}
