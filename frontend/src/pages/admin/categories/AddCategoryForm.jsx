import { useEffect, useMemo, useState } from 'react';
import { callApi } from '../../../apiClient.js';
import { useSaveRequest } from '../../../useSaveRequest.js';
import { TextField } from '../../../FormFields.jsx';
import { Icon } from '../../../Icon.jsx';
import { useToast } from '../../../components/ToastProvider.jsx';
import { uploadCategoryPhoto } from './uploadCategoryPhoto.js';

const blankCategory = { name: '', sortOrder: '0', comingSoon: false };

function PhotoPicker({ file, onChoose }) {
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl]);
  return (
    <div className="field">
      <span className="field-label">Photo</span>
      <label className="category-thumb file-button" title={file ? 'Change photo' : 'Choose photo'}>
        {previewUrl ? <img src={previewUrl} alt="" /> : <Icon name="camera" />}
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
  const showToast = useToast();
  const saving = categoryRequest.saving || photoRequest.saving;
  const { fieldErrors } = categoryRequest;
  const update = (fieldName) => (value) => setValues((previous) => ({ ...previous, [fieldName]: value }));

  async function handleSubmit(event) {
    event.preventDefault();
    const created = await categoryRequest.save(() => callApi('/api/admin/categories', { method: 'POST', body: values }));
    if (!created) return;
    setValues(blankCategory);
    setPhotoFile(null);
    if (photoFile) await photoRequest.save(() => uploadCategoryPhoto(created.categoryId, photoFile));
    showToast(`${values.name.trim()} added`);
    onAdded();
  }
  return (
    <form className="card category-add" onSubmit={handleSubmit}>
      <h2>Add a category</h2>
      <div className="category-add-row">
        <PhotoPicker file={photoFile} onChoose={setPhotoFile} />
        <TextField fieldId="categoryName" className="category-add-name" label="Name" placeholder="e.g. Snacks & Namkeen" value={values.name} onChange={update('name')} errorMessage={fieldErrors.name} maxLength={60} required />
        <TextField fieldId="categoryOrder" className="category-add-order" label="Order" inputMode="numeric" value={values.sortOrder} onChange={update('sortOrder')} errorMessage={fieldErrors.sortOrder} />
        <label className="switch-label category-add-switch">
          <input type="checkbox" className="switch" checked={values.comingSoon} onChange={(event) => update('comingSoon')(event.target.checked)} /> Coming soon
        </label>
        <button type="submit" className="button button-compact category-add-button" disabled={saving}><Icon name="plus" /> {saving ? 'Adding…' : 'Add'}</button>
      </div>
      {categoryRequest.error && !fieldErrors.name && !fieldErrors.sortOrder && <p className="error-text" role="alert">{categoryRequest.error}</p>}
      {photoRequest.error && <p className="error-text" role="alert">Category added, but its photo did not upload: {photoRequest.error} Add it again from the list below.</p>}
    </form>
  );
}
