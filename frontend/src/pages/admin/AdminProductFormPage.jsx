import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { useApiData } from '../../useApiData.js';
import { categoryImageFor } from '../../categoryImages.js';
import { LoadingOrError } from '../../components/LoadingOrError.jsx';
import { AdminPageHeader } from './AdminLayout.jsx';
import { useProductForm } from './productForm/useProductForm.js';
import { ProductDetailsFields } from './productForm/ProductDetailsFields.jsx';
import { PackSizeEditor } from './productForm/PackSizeEditor.jsx';
import { ProductPhotosPanel } from './productForm/ProductPhotosPanel.jsx';
import { uploadProductPhoto, usePhotoList } from './productForm/usePhotoList.js';
import { ShopPreview, VisibilityCard } from './productForm/ProductSidePanels.jsx';

const formId = 'product-form';

// Photos of a new product wait in the browser and upload, in order, right after it is added.
function ProductForm({ product, savedMessage, onSaved, onPhotosChanged }) {
  const photoList = usePhotoList(product, onPhotosChanged);
  const form = useProductForm(product, (saved) => onSaved(saved, product ? [] : photoList.photos.map((photo) => photo.image)));
  const categories = useApiData('/api/categories');
  const categoryName = categories.data?.categories.find((category) => String(category.id) === form.formValues.categoryId)?.name;
  const imageUrl = photoList.photos[0]?.url ?? null;
  return (
    <>
      <AdminPageHeader title={<ProductTitle product={product} />} subtitle={<><Link to="/admin/products">Products</Link> / {product ? product.name : 'New product'}</>}>
        <SaveButtons product={product} saving={form.saving} />
      </AdminPageHeader>
      {savedMessage && <p className="notice notice-success" role="status">{savedMessage}</p>}
      <form id={formId} className="product-form-layout" onSubmit={form.saveProduct} noValidate>
        <div className="product-form-main">
          {form.submitError && <p className="error-text" role="alert">{form.submitError}</p>}
          <ProductDetailsFields formValues={form.formValues} updateField={form.updateField} fieldErrors={form.fieldErrors} />
          <PackSizeEditor formValues={form.formValues} fieldErrors={form.fieldErrors} updatePackSize={form.updatePackSize}
            addPackSize={form.addPackSize} removePackSize={form.removePackSize} editing={Boolean(product)} />
        </div>
        <aside className="product-form-side">
          <ProductPhotosPanel list={photoList} fallbackUrl={categoryImageFor(categoryName)} />
          <VisibilityCard shown={form.formValues.active} onChange={(shown) => form.updateField('active', shown)} />
          <ShopPreview formValues={form.formValues} imageUrl={imageUrl ?? categoryImageFor(categoryName)} isPhoto={Boolean(imageUrl)} />
        </aside>
      </form>
    </>
  );
}

// In the page header, outside the form: Save submits it through its form attribute.
function SaveButtons({ product, saving }) {
  return (
    <>
      <Link to="/admin/products" className="button button-outline button-compact">Cancel</Link>
      <button type="submit" form={formId} className="button button-compact" disabled={saving}>{saving ? 'Saving…' : product ? 'Save changes' : 'Add product'}</button>
    </>
  );
}

function ProductTitle({ product }) {
  if (!product) return 'Add product';
  return <>{product.name} <span className={product.active ? 'pill pill-green' : 'pill pill-gray'}>{product.active ? 'Shown in shop' : 'Hidden'}</span></>;
}

// After adding: upload the photos chosen while adding, then open the new product.
function useSavedProduct(productId) {
  const navigate = useNavigate();
  const location = useLocation();
  const [savedProduct, setSavedProduct] = useState(null);
  // Bumped after each save so the form reloads with the saved pack size ids.
  const [formVersion, setFormVersion] = useState(0);
  const [savedMessage, setSavedMessage] = useState(location.state?.addedMessage ?? null);

  async function handleSaved(newProduct, pendingImages) {
    if (productId) {
      setSavedProduct(newProduct);
      setFormVersion((version) => version + 1);
      setSavedMessage('Changes saved.');
      return;
    }
    const addedMessage = await uploadPendingPhotos(newProduct.id, pendingImages);
    navigate(`/admin/products/${newProduct.id}`, { replace: true, state: { addedMessage } });
  }
  return { savedProduct, setSavedProduct, formVersion, savedMessage, handleSaved };
}

// One at a time, so they keep their order. Returns the message for the product page.
async function uploadPendingPhotos(productId, images) {
  let failedCount = 0;
  for (const image of images) await uploadProductPhoto(productId, image).catch(() => { failedCount += 1; });
  if (failedCount === 0) return 'Product added.';
  return `Product added, but ${failedCount} ${failedCount === 1 ? 'photo was' : 'photos were'} not saved. Add ${failedCount === 1 ? 'it' : 'them'} again below.`;
}

// /admin/products/new to add, /admin/products/:productId to edit.
export function AdminProductFormPage() {
  const { productId } = useParams();
  const loaded = useApiData(productId ? `/api/admin/products/${encodeURIComponent(productId)}` : null);
  const saved = useSavedProduct(productId);
  const product = saved.savedProduct ?? loaded.data?.product;

  if (productId && !product) return <LoadingOrError loading={loaded.loading} error={loaded.error} onRetry={loaded.reload} />;
  return (
    <ProductForm key={product ? `${product.id}-${saved.formVersion}` : 'new'} product={product} savedMessage={saved.savedMessage}
      onSaved={saved.handleSaved} onPhotosChanged={saved.setSavedProduct} />
  );
}
