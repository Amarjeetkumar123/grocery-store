import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { useApiData } from '../../useApiData.js';
import { LoadingOrError } from '../../components/LoadingOrError.jsx';
import { AdminPageHeader } from './AdminLayout.jsx';
import { useProductForm } from './productForm/useProductForm.js';
import { ProductDetailsFields } from './productForm/ProductDetailsFields.jsx';
import { PackSizeEditor } from './productForm/PackSizeEditor.jsx';
import { ProductPhotoUpload } from './productForm/ProductPhotoUpload.jsx';

function ProductForm({ product, onSaved }) {
  const form = useProductForm(product, onSaved);
  return (
    <form className="admin-form" onSubmit={form.saveProduct} noValidate>
      <ProductDetailsFields formValues={form.formValues} updateField={form.updateField} fieldErrors={form.fieldErrors} />
      <PackSizeEditor formValues={form.formValues} fieldErrors={form.fieldErrors} updatePackSize={form.updatePackSize}
        addPackSize={form.addPackSize} removePackSize={form.removePackSize} />
      {form.submitError && <p className="error-text" role="alert">{form.submitError}</p>}
      <div className="form-actions">
        <Link to="/admin/products" className="button button-outline button-compact">Cancel</Link>
        <button type="submit" className="button button-compact" disabled={form.saving}>
          {form.saving ? 'Saving…' : product ? 'Save changes' : 'Add product'}
        </button>
      </div>
    </form>
  );
}

// /admin/products/new to add, /admin/products/:productId to edit.
export function AdminProductFormPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const loaded = useApiData(productId ? `/api/admin/products/${encodeURIComponent(productId)}` : null);
  const [savedProduct, setSavedProduct] = useState(null);
  // Bumped after each save so the form reloads with the saved pack size ids.
  const [formVersion, setFormVersion] = useState(0);
  const [savedMessage, setSavedMessage] = useState(location.state?.justAdded ? 'Product added. You can upload a photo now.' : null);
  const product = savedProduct ?? loaded.data?.product;

  function handleSaved(newProduct) {
    if (!productId) return navigate(`/admin/products/${newProduct.id}`, { replace: true, state: { justAdded: true } });
    setSavedProduct(newProduct);
    setFormVersion((version) => version + 1);
    setSavedMessage('Changes saved.');
  }

  if (productId && !product) return <LoadingOrError loading={loaded.loading} error={loaded.error} onRetry={loaded.reload} />;
  return (
    <>
      <AdminPageHeader title={product ? `Edit: ${product.name}` : 'Add product'}>
        <Link to="/admin/products" className="text-button">Back to products</Link>
      </AdminPageHeader>
      {savedMessage && <p className="notice notice-success" role="status">{savedMessage}</p>}
      <div className="admin-form-layout">
        <ProductForm key={product ? `${product.id}-${formVersion}` : 'new'} product={product} onSaved={handleSaved} />
        {product && <ProductPhotoUpload product={product} onUploaded={setSavedProduct} />}
      </div>
    </>
  );
}
