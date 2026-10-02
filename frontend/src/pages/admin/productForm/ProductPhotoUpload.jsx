import { useState } from 'react';
import { callApi } from '../../../apiClient.js';
import { shrinkImage } from '../../../imageResizing.js';
import { categoryImageFor } from '../../../categoryImages.js';
import { Icon } from '../../../Icon.jsx';

// Photo of a saved product. onUploaded(product) receives the updated product.
export function ProductPhotoUpload({ product, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  async function uploadPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    setErrorMessage(null);
    try {
      const image = await shrinkImage(file);
      const result = await callApi(`/api/admin/products/${product.id}/image`, { method: 'POST', rawBody: image, contentType: image.type });
      onUploaded(result.product);
    } catch (error) {
      setErrorMessage(error.message ?? 'This photo could not be read. Try a JPG or PNG.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="card form-section photo-section">
      <h2>Photo</h2>
      <img className="product-photo-preview" src={product.imageUrl ?? categoryImageFor(product.categoryName)} alt="" />
      {!product.imageUrl && <p className="hint">No photo yet. The category picture is shown instead.</p>}
      <label className="button button-outline button-compact file-button">
        <Icon name="upload" /> {uploading ? 'Uploading…' : product.imageUrl ? 'Change photo' : 'Upload photo'}
        <input type="file" accept="image/*" onChange={uploadPhoto} disabled={uploading} />
      </label>
      {errorMessage && <p className="field-error" role="alert">{errorMessage}</p>}
    </section>
  );
}
