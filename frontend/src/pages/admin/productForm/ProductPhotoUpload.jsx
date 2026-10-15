import { useState } from 'react';
import { callApi } from '../../../apiClient.js';
import { shrinkImage } from '../../../imageResizing.js';
import { Icon } from '../../../Icon.jsx';

export async function uploadProductPhoto(productId, image) {
  const result = await callApi(`/api/admin/products/${productId}/image`, { method: 'POST', rawBody: image, contentType: image.type });
  return result.product;
}

// The photo, or the category picture the shop shows when there is none.
function PhotoPreview({ imageUrl, fallbackUrl }) {
  return (
    <div className="photo-current">
      {!imageUrl && <span className="photo-tag">Category picture</span>}
      <img src={imageUrl ?? fallbackUrl} alt="" />
    </div>
  );
}

// photo: { imageUrl, fallbackUrl, hasPhoto }. onPhotoChosen(image) gets the shrunk photo, ready to upload.
export function ProductPhotoCard({ photo, onPhotoChosen }) {
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  async function choosePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      await onPhotoChosen(await shrinkImage(file));
    } catch (error) {
      setErrorMessage(error.message ?? 'This photo could not be read. Try a JPG or PNG.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card form-panel">
      <header className="form-panel-heading"><h2>Photo</h2></header>
      <div className="form-panel-body">
        <PhotoPreview imageUrl={photo.imageUrl} fallbackUrl={photo.fallbackUrl} />
        <p className="hint">{photo.hasPhoto ? 'Square photos look best.' : 'Optional. Without one, the shop shows the category picture.'}</p>
        <label className="button button-outline button-compact file-button align-start">
          <Icon name="upload" /> {busy ? 'Working…' : photo.hasPhoto ? 'Change photo' : 'Choose photo'}
          <input type="file" accept="image/*" onChange={choosePhoto} disabled={busy} />
        </label>
        {errorMessage && <p className="field-error" role="alert">{errorMessage}</p>}
      </div>
    </section>
  );
}
