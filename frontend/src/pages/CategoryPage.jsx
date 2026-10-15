import { NavLink, useParams } from 'react-router';
import { useApiData } from '../useApiData.js';
import { categoryImageFor } from '../categoryImages.js';
import { PageBar } from '../components/PageBar.jsx';
import { ProductCard } from '../components/ProductCard.jsx';
import { LoadingOrError } from '../components/LoadingOrError.jsx';
import { TabBar } from '../components/TabBar.jsx';
import { CartBar } from '../components/CartBar.jsx';

// Computers only: every open category on the left, to jump between them.
function CategorySideList({ categories }) {
  return (
    <nav className="category-side-list" aria-label="Categories">
      {categories.filter((category) => !category.comingSoon).map((category) => (
        <NavLink key={category.id} to={`/category/${category.id}`} className="category-side-link">
          <img src={category.imageUrl ?? categoryImageFor(category.name)} alt="" />{category.name}
        </NavLink>
      ))}
    </nav>
  );
}

export function CategoryPage() {
  const { categoryId } = useParams();
  const categories = useApiData('/api/categories');
  const products = useApiData(`/api/products?categoryId=${encodeURIComponent(categoryId)}`);
  const categoryList = categories.data?.categories ?? [];
  const category = categoryList.find((candidate) => String(candidate.id) === categoryId);
  const productList = products.data?.products ?? [];

  return (
    <main className="app-shell">
      <PageBar title={category?.name ?? 'Products'} subtitle={products.data ? `${productList.length} ${productList.length === 1 ? 'product' : 'products'}` : null} />
      <div className="page-body with-side-list">
        <CategorySideList categories={categoryList} />
        <div className="side-list-content">
          <LoadingOrError loading={products.loading} error={products.error} onRetry={products.reload} />
          {products.data && productList.length === 0 && <p className="hint centered">No products here yet.</p>}
          <div className="product-list">
            {productList.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </div>
      </div>
      <CartBar aboveTabBar />
      <TabBar />
    </main>
  );
}
