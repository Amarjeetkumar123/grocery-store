import { useApiData } from '../../useApiData.js';
import { LoadingOrError } from '../../components/LoadingOrError.jsx';
import { AdminPageHeader } from './AdminLayout.jsx';
import { CategoryRow } from './categories/CategoryRow.jsx';
import { AddCategoryForm } from './categories/AddCategoryForm.jsx';

// Categories on the shop home page, each with an optional photo.
export function AdminCategoriesPage() {
  const { data, error, loading, reload } = useApiData('/api/admin/categories');
  return (
    <>
      <AdminPageHeader title="Categories" />
      <AddCategoryForm onAdded={reload} />
      <LoadingOrError loading={loading && !data} error={error} onRetry={reload} />
      {data && (
        <div className="table-box">
          <table className="admin-table">
            <thead><tr><th>Photo</th><th>Name</th><th>Order</th><th>Status</th><th className="number">Products</th><th /></tr></thead>
            <tbody>
              {data.categories.map((category) => (
                <CategoryRow key={`${category.id}-${category.name}-${category.sortOrder}-${category.comingSoon}`} category={category} onSaved={reload} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
