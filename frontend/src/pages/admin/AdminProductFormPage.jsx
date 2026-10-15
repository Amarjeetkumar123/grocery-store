import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { useApiData } from '../../useApiData.js';
import { categoryImageFor } from '../../categoryImages.js';
import { LoadingOrError } from '../../components/LoadingOrError.jsx';
import { AdminPageHeader } from './AdminLayout.jsx';
import { useProductForm } from './productForm/useProductForm.js';
import { ProductDetailsFields } from './productForm/ProductDetailsFields.jsx';
import { PackSizeEditor } from './productForm/PackSizeEditor.jsx';
import { ProductPhotoCard, uploadProductPhoto } from './productForm/ProductPhotoUpload.jsx';
import { ShopPreview, VisibilityCard } from './productForm/ProductSidePanels.jsx';

const formId = 'product-form';

// A photo chosen before the product exists: shown at once, uploaded right after the product is added.
function usePendingPhoto() {
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  useEffect(() => {
    if (!pendingPhoto) return undefined;
    const url = URL.createObjectURL(pendingPhoto);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingPhoto]);
  return { pendingPhoto, previewUrl: pendingPhoto ? previewUrl : null, setPendingPhoto };
}

function ProductForm({ product, savedMessage, onSaved, onPhotoUploaded }) {
  const photo = usePendingPhoto();
  const form = useProductForm(product, (saved) => onSaved(saved, photo.pendingPhoto));
  const categories = useApiData('/api/categories');
  const categoryName = categories.data?.categories.find((category) => String(category.id) === form.formValues.categoryId)?.name;
  const imageUrl = product?.imageUrl ?? photo.previewUrl;
  const choosePhoto = async (image) => (product ? onPhotoUploaded(await uploadProductPhoto(product.id, image)) : photo.setPendingPhoto(image));
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
          <ProductPhotoCard photo={{ imageUrl, fallbackUrl: categoryImageFor(categoryName), hasPhoto: Boolean(imageUrl) }} onPhotoChosen={choosePhoto} />
          <VisibilityCard shown={form.formValues.active} onChange={(shown) => form.updateField('active', shown)} />
          <ShopPreview formValues={form.formValues} imageUrl={imageUrl ?? categoryImageFor(categoryName)} />
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

// After adding: upload the photo chosen while adding, then open the new product.
function useSavedProduct(productId) {
  const navigate = useNavigate();
  const location = useLocation();
  const [savedProduct, setSavedProduct] = useState(null);
  // Bumped after each save so the form reloads with the saved pack size ids.
  const [formVersion, setFormVersion] = useState(0);
  const [savedMessage, setSavedMessage] = useState(location.state?.addedMessage ?? null);

  async function handleSaved(newProduct, pendingPhoto) {
    if (productId) {
      setSavedProduct(newProduct);
      setFormVersion((version) => version + 1);
      setSavedMessage('Changes saved.');
      return;
    }
    let addedMessage = 'Product added.';
    if (pendingPhoto) await uploadProductPhoto(newProduct.id, pendingPhoto).catch((error) => { addedMessage = `Product added, but the photo was not saved: ${error.message}`; });
    navigate(`/admin/products/${newProduct.id}`, { replace: true, state: { addedMessage } });
  }
  return { savedProduct, setSavedProduct, formVersion, savedMessage, handleSaved };
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
      onSaved={saved.handleSaved} onPhotoUploaded={saved.setSavedProduct} />
  );
}
