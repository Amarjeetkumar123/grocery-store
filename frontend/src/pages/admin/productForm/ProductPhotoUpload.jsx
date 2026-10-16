import { useState } from 'react';
import { callApi } from '../../../apiClient.js';
import { Icon } from '../../../Icon.jsx';
import { PhotoCropper } from './PhotoCropper.jsx';

export async function uploadProductPhoto(productId, image) {
  const result = await callApi(`/api/admin/products/${productId}/image`, { method: 'POST', rawBody: image, contentType: image.type });
  return result.product;
}

// The photo, or the category picture the shop shows when there is none.
function PhotoPreview({ imageUrl, fallbackUrl }) {
  return (
    <div className={`photo-current${imageUrl ? ' is-photo' : ''}`}>
      {!imageUrl && <span className="photo-tag">Category picture</span>}
      <img src={imageUrl ?? fallbackUrl} alt="" />
    </div>
  );
}

// The photo picked but not yet cropped: { url, fromFile }. A file's address is freed afterwards.
function useCropSource() {
  const [cropSource, setCropSource] = useState(null);
  function closeCropper() {
    if (cropSource?.fromFile) URL.revokeObjectURL(cropSource.url);
    setCropSource(null);
  }
  return { cropSource, setCropSource, closeCropper };
}

// photo: { imageUrl, fallbackUrl, hasPhoto }. A chosen photo opens in the square crop
// first; onPhotoChosen(image) gets the cropped picture, ready to upload.
export function ProductPhotoCard({ photo, onPhotoChosen }) {
  const { cropSource, setCropSource, closeCropper } = useCropSource();
  function choosePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) setCropSource({ url: URL.createObjectURL(file), fromFile: true });
  }
  async function saveCroppedPhoto(image) {
    await onPhotoChosen(image);
    closeCropper();
  }
  return (
    <section className="card form-panel">
      <header className="form-panel-heading"><h2>Photo</h2></header>
      <div className="form-panel-body">
        {cropSource ? <PhotoCropper sourceUrl={cropSource.url} onCancel={closeCropper} onDone={saveCroppedPhoto} /> : (
          <>
            <PhotoPreview imageUrl={photo.imageUrl} fallbackUrl={photo.fallbackUrl} />
            <p className="hint">{photo.hasPhoto ? 'Square photos look best.' : 'Optional. Without one, the shop shows the category picture.'}</p>
            <div className="photo-buttons">
              <label className="button button-outline button-compact file-button">
                <Icon name="upload" /> {photo.hasPhoto ? 'Change photo' : 'Choose photo'}
                <input type="file" accept="image/*" onChange={choosePhoto} />
              </label>
              {photo.hasPhoto && <button type="button" className="button button-outline button-compact" onClick={() => setCropSource({ url: photo.imageUrl })}>Crop</button>}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
