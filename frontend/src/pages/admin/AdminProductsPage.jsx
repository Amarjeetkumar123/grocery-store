import { useState } from 'react';
import { Link } from 'react-router';
import { useAuthentication } from '../../AuthenticationContext.jsx';
import { useApiData } from '../../useApiData.js';
import { useDebouncedValue } from '../../useDebouncedValue.js';
import { formatMonthYear, formatRupees } from '../../formatting.js';
import { categoryImageFor } from '../../categoryImages.js';
import { Icon } from '../../Icon.jsx';
import { LoadingOrError } from '../../components/LoadingOrError.jsx';
import { AdminPageHeader } from './AdminLayout.jsx';
import { TablePager } from './TablePager.jsx';
import { SelectAllCheckbox, SelectionBar, useDeleteRows, useRowSelection } from './RowSelection.jsx';

function StockBadge({ packSize }) {
  if (packSize.stock === 0) return <span className="pill pill-red">Out of stock</span>;
  if (packSize.stock <= packSize.lowStockLevel) return <span className="pill pill-amber">{packSize.stock} left</span>;
  return <span>{packSize.stock}</span>;
}

// owner: { selected, onToggle, onDelete } for the owner, who can tick and delete; null for packers.
function ProductRows({ product, owner }) {
  const shown = (packSize) => packSize.active && product.active;
  return product.packSizes.map((packSize, index) => (
    <tr key={packSize.id} className={`${shown(packSize) ? '' : 'row-hidden'}${owner?.selected ? ' row-selected' : ''}`}>
      {index === 0 && owner && (
        <td rowSpan={product.packSizes.length} className="checkbox-cell">
          <input type="checkbox" className="row-checkbox" checked={owner.selected} onChange={owner.onToggle} aria-label={`Select ${product.name}`} />
        </td>
      )}
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
      <td>{shown(packSize) ? <span className="status-dot">Active</span> : <span className="status-dot status-dot-off">Hidden</span>}</td>
      {index === 0 && (
        <td rowSpan={product.packSizes.length}>
          <div className="row-actions">
            <Link to={`/admin/products/${product.id}`} className="icon-button" aria-label={`Edit ${product.name}`}><Icon name="edit" /></Link>
            {owner && (
              <button type="button" className="icon-button icon-button-danger" onClick={owner.onDelete} aria-label={`Delete ${product.name}`} title="Delete">
                <Icon name="trash" size={18} />
              </button>
            )}
          </div>
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

// The owner ticks rows (or all on this page) and deletes them together. A product
// in past orders is kept; the server explains how to hide it instead.
function ProductTable({ data, onPageChange, onChanged }) {
  const { account } = useAuthentication();
  const isOwner = account.role === 'owner';
  const selection = useRowSelection(isOwner ? data.products.map((product) => product.id) : []);
  const { deleting, deleteRows } = useDeleteRows({
    words: { many: 'products', warning: 'Pack sizes are deleted with them.' },
    pathOf: (product) => `/api/admin/products/${product.id}`, nameOf: (product) => product.name,
    onDone: () => { selection.clear(); return onChanged(); },
  });
  const ownerOf = (product) => (isOwner ? {
    selected: selection.isSelected(product.id), onToggle: () => selection.toggle(product.id), onDelete: () => deleteRows([product]),
  } : null);
  return (
    <div className="table-box">
      <SelectionBar count={selection.selectedIds.length} noun={selection.selectedIds.length === 1 ? 'product' : 'products'} deleting={deleting}
        onClear={selection.clear} onDelete={() => deleteRows(data.products.filter((product) => selection.isSelected(product.id)))} />
      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              {isOwner && <th className="checkbox-cell"><SelectAllCheckbox selection={selection} label="Select all products on this page" /></th>}
              <th>Product</th><th>Category</th><th>Pack</th><th className="number">MRP</th><th className="number">Price</th><th className="number">Stock</th><th>Best before</th><th>Status</th><th />
            </tr>
          </thead>
          <tbody>{data.products.map((product) => <ProductRows key={product.id} product={product} owner={ownerOf(product)} />)}</tbody>
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
      {data && data.total > 0 && <ProductTable data={data} onPageChange={(changes) => setFilters((previous) => ({ ...previous, ...changes }))} onChanged={reload} />}
    </div>
  );
}
