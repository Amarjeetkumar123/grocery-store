import { useState } from 'react';
import { Link } from 'react-router';
import { useApiData } from '../../useApiData.js';
import { useDebouncedValue } from '../../useDebouncedValue.js';
import { formatMonthYear, formatRupees } from '../../formatting.js';
import { categoryImageFor } from '../../categoryImages.js';
import { Icon } from '../../Icon.jsx';
import { LoadingOrError } from '../../components/LoadingOrError.jsx';
import { AdminPageHeader } from './AdminLayout.jsx';
import { TablePager } from './TablePager.jsx';

function StockBadge({ packSize }) {
  if (packSize.stock === 0) return <span className="pill pill-red">Out of stock</span>;
  if (packSize.stock <= packSize.lowStockLevel) return <span className="pill pill-amber">{packSize.stock} left</span>;
  return <span>{packSize.stock}</span>;
}

function ProductRows({ product }) {
  return product.packSizes.map((packSize, index) => (
    <tr key={packSize.id} className={packSize.active && product.active ? '' : 'row-hidden'}>
      {index === 0 && (
        <td rowSpan={product.packSizes.length}>
          <div className="product-cell">
            <img src={product.imageUrl ?? categoryImageFor(product.categoryName)} alt="" />
            <div><strong>{product.name}</strong><p className="hint">{product.brand ?? '—'}</p></div>
          </div>
        </td>
      )}
      {index === 0 && <td rowSpan={product.packSizes.length} className="hint">{product.categoryName}</td>}
      <td>{packSize.label}</td>
      <td className="number">{formatRupees(packSize.maximumRetailPrice)}</td>
      <td className="number"><strong>{formatRupees(packSize.price)}</strong></td>
      <td className="number"><StockBadge packSize={packSize} /></td>
      <td>{formatMonthYear(packSize.bestBefore) || '—'}</td>
      <td>{packSize.active && product.active ? <span className="status-dot">Active</span> : <span className="status-dot status-dot-off">Hidden</span>}</td>
      {index === 0 && (
        <td rowSpan={product.packSizes.length}>
          <Link to={`/admin/products/${product.id}`} className="icon-button" aria-label={`Edit ${product.name}`}><Icon name="edit" /></Link>
        </td>
      )}
    </tr>
  ));
}

function ProductFilters({ searchText, onSearchTextChange, categoryId, onCategoryIdChange }) {
  const categories = useApiData('/api/categories');
  return (
    <div className="filter-row">
      <label className="search-input admin-search">
        <Icon name="search" size={16} />
        <input type="search" value={searchText} onChange={(event) => onSearchTextChange(event.target.value)}
          placeholder="Search product or brand" aria-label="Search products" />
      </label>
      <select className="input admin-select" value={categoryId} onChange={(event) => onCategoryIdChange(event.target.value)} aria-label="Category">
        <option value="">All categories</option>
        {categories.data?.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
      </select>
    </div>
  );
}

function ProductTable({ data, onPageChange }) {
  return (
    <div className="table-box">
      <div className="table-scroll">
        <table className="admin-table">
          <thead><tr><th>Product</th><th>Category</th><th>Pack</th><th className="number">MRP</th><th className="number">Price</th><th className="number">Stock</th><th>Best before</th><th>Status</th><th /></tr></thead>
          <tbody>{data.products.map((product) => <ProductRows key={product.id} product={product} />)}</tbody>
        </table>
      </div>
      <TablePager page={data.page} pageCount={data.pageCount} pageSize={data.pageSize} total={data.total} shownCount={data.products.length} onChange={onPageChange} />
    </div>
  );
}

// The table fills the window and scrolls inside; page buttons sit under it.
export function AdminProductsPage() {
  const [filters, setFilters] = useState({ search: '', categoryId: '', page: 1, pageSize: 25 });
  const changeFilters = (changes) => setFilters((previous) => ({ ...previous, page: 1, ...changes }));
  const debouncedSearchText = useDebouncedValue(filters.search.trim());
  const query = new URLSearchParams({ search: debouncedSearchText, categoryId: filters.categoryId, page: filters.page, pageSize: filters.pageSize }).toString();
  const { data, error, loading, reload } = useApiData(`/api/admin/products?${query}`);
  const subtitle = data ? `${data.total} ${data.total === 1 ? 'product' : 'products'}` : null;

  return (
    <div className="fit-screen-page">
      <AdminPageHeader title="Products" subtitle={subtitle}>
        <Link to="/admin/products/import" className="button button-outline button-compact"><Icon name="upload" /> Bulk upload</Link>
        <Link to="/admin/products/new" className="button button-compact"><Icon name="plus" /> Add product</Link>
      </AdminPageHeader>
      <ProductFilters searchText={filters.search} onSearchTextChange={(search) => changeFilters({ search })}
        categoryId={filters.categoryId} onCategoryIdChange={(categoryId) => changeFilters({ categoryId })} />
      <LoadingOrError loading={loading && !data} error={error} onRetry={reload} />
      {data && data.total === 0 && <p className="hint centered">No products found. Add one, or upload a spreadsheet.</p>}
      {data && data.total > 0 && <ProductTable data={data} onPageChange={(changes) => setFilters((previous) => ({ ...previous, ...changes }))} />}
    </div>
  );
}
