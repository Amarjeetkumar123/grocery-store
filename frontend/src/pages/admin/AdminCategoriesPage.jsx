import { useApiData } from '../../useApiData.js';
import { LoadingOrError } from '../../components/LoadingOrError.jsx';
import { AdminPageHeader } from './AdminLayout.jsx';
import { CategoryRow } from './categories/CategoryRow.jsx';
import { AddCategoryForm } from './categories/AddCategoryForm.jsx';
import { SelectAllCheckbox, SelectionBar, useDeleteRows, useRowSelection } from './RowSelection.jsx';

// Ticked categories are deleted together; one with products cannot be ticked.
function CategoryTable({ categories, onChanged }) {
  const selection = useRowSelection(categories.filter((category) => category.productCount === 0).map((category) => category.id));
  const { deleting, deleteRows } = useDeleteRows({
    words: { many: 'categories' },
    pathOf: (category) => `/api/admin/categories/${category.id}`, nameOf: (category) => category.name,
    onDone: () => { selection.clear(); return onChanged(); },
  });
  const count = selection.selectedIds.length;
  return (
    <div className="table-box">
      <SelectionBar count={count} noun={count === 1 ? 'category' : 'categories'} deleting={deleting} onClear={selection.clear}
        onDelete={() => deleteRows(categories.filter((category) => selection.isSelected(category.id)))} />
      <div className="table-scroll">
        <table className="admin-table category-table">
          <thead>
            <tr>
              <th className="checkbox-cell"><SelectAllCheckbox selection={selection} label="Select all empty categories" /></th>
              <th>Category</th><th className="number">Products</th><th>Status</th><th>Order</th><th />
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <CategoryRow key={`${category.id}-${category.name}-${category.sortOrder}-${category.comingSoon}`} category={category} onSaved={onChanged}
                selection={{ selected: selection.isSelected(category.id), onToggle: () => selection.toggle(category.id) }} onDelete={() => deleteRows([category])} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Categories on the shop home page, each with an optional photo.
export function AdminCategoriesPage() {
  const { data, error, loading, reload } = useApiData('/api/admin/categories');
  return (
    <div className="narrow-page fit-screen-page">
      <AdminPageHeader title="Categories" />
      <p className="hint page-intro">Shown on the shop home page, smallest order number first. Tap a photo to change it.</p>
      <AddCategoryForm onAdded={reload} />
      <LoadingOrError loading={loading && !data} error={error} onRetry={reload} />
      {data && <CategoryTable categories={data.categories} onChanged={reload} />}
    </div>
  );
}
