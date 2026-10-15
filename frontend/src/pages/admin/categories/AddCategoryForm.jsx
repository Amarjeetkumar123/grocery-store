import { useEffect, useMemo, useState } from 'react';
import { callApi } from '../../../apiClient.js';
import { useSaveRequest } from '../../../useSaveRequest.js';
import { TextField } from '../../../FormFields.jsx';
import { Icon } from '../../../Icon.jsx';
import { uploadCategoryPhoto } from './uploadCategoryPhoto.js';

const blankCategory = { name: '', sortOrder: '0', comingSoon: false };

function PhotoPicker({ file, onChoose }) {
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl]);
  return (
    <div className="field">
      <span className="field-label">Photo (optional)</span>
      <label className="category-photo-upload category-photo-upload-large file-button">
        {previewUrl ? <img src={previewUrl} alt="" /> : <span className="category-photo-empty"><Icon name="upload" /></span>}
        <span>{file ? 'Change photo' : 'Choose photo'}</span>
        <input type="file" accept="image/*" onChange={(event) => onChoose(event.target.files?.[0] ?? null)} aria-label="Category photo" />
      </label>
    </div>
  );
}

// Saves the category first, then uploads its photo (the photo needs the new id).
export function AddCategoryForm({ onAdded }) {
  const [values, setValues] = useState(blankCategory);
  const [photoFile, setPhotoFile] = useState(null);
  const categoryRequest = useSaveRequest();
  const photoRequest = useSaveRequest();
  const saving = categoryRequest.saving || photoRequest.saving;
  const update = (fieldName) => (value) => setValues((previous) => ({ ...previous, [fieldName]: value }));

  async function handleSubmit(event) {
    event.preventDefault();
    const created = await categoryRequest.save(() => callApi('/api/admin/categories', { method: 'POST', body: values }));
    if (!created) return;
    setValues(blankCategory);
    setPhotoFile(null);
    if (photoFile) await photoRequest.save(() => uploadCategoryPhoto(created.categoryId, photoFile));
    onAdded();
  }
  return (
    <form className="card form-section" onSubmit={handleSubmit}>
      <h2>Add a category</h2>
      <div className="field-row">
        <PhotoPicker file={photoFile} onChoose={setPhotoFile} />
        <TextField fieldId="categoryName" label="Name" value={values.name} onChange={update('name')} errorMessage={categoryRequest.fieldErrors.name} maxLength={60} required />
        <TextField fieldId="categoryOrder" label="Order (smaller shows first)" inputMode="numeric" value={values.sortOrder} onChange={update('sortOrder')} errorMessage={categoryRequest.fieldErrors.sortOrder} />
      </div>
      <label className="checkbox-label"><input type="checkbox" checked={values.comingSoon} onChange={(event) => update('comingSoon')(event.target.checked)} /> Coming soon (customers can ask to be told when it opens)</label>
      {categoryRequest.error && <p className="error-text" role="alert">{categoryRequest.error}</p>}
      {photoRequest.error && <p className="error-text" role="alert">Category added, but its photo did not upload: {photoRequest.error} Add it again from the list below.</p>}
      <div className="form-actions"><button type="submit" className="button button-compact" disabled={saving}>{saving ? 'Adding…' : 'Add'}</button></div>
    </form>
  );
}
