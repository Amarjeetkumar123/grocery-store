import { useState } from 'react';
import { Link } from 'react-router';
import { useApiData } from '../../useApiData.js';
import { useDebouncedValue } from '../../useDebouncedValue.js';
import { formatMonthYear, formatRupees } from '../../formatting.js';
import { categoryImageFor } from '../../categoryImages.js';
import { Icon } from '../../Icon.jsx';
import { LoadingOrError } from '../../components/LoadingOrError.jsx';
import { AdminPageHeader } from './AdminLayout.jsx';

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

const pageSizes = [10, 25, 50];

// Page numbers around the current page, at most five.
function nearbyPages(page, pageCount) {
  const first = Math.max(1, Math.min(page - 2, pageCount - 4));
  return Array.from({ length: Math.min(5, pageCount) }, (unused, index) => first + index);
}

function TablePager({ data, onChange }) {
  const { page, pageCount, pageSize, total, products } = data;
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  return (
    <div className="table-pager">
      <span>Showing <strong>{first}–{first + products.length - 1}</strong> of <strong>{total}</strong></span>
      <div className="table-pager-controls">
        <label className="table-pager-size">Rows per page
          <select className="input input-small" value={pageSize} onChange={(event) => onChange({ pageSize: Number(event.target.value), page: 1 })}>
            {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <nav className="table-pager-pages" aria-label="Pages">
          <button type="button" className="icon-button" disabled={page <= 1} onClick={() => onChange({ page: page - 1 })} aria-label="Previous page"><Icon name="back" size={16} /></button>
          {nearbyPages(page, pageCount).map((number) => (
            <button key={number} type="button" className="page-number" aria-current={number === page ? 'page' : undefined} onClick={() => onChange({ page: number })}>{number}</button>
          ))}
          <button type="button" className="icon-button" disabled={page >= pageCount} onClick={() => onChange({ page: page + 1 })} aria-label="Next page"><Icon name="right" size={16} /></button>
        </nav>
      </div>
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
      <TablePager data={data} onChange={onPageChange} />
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
