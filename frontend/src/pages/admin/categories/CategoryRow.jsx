import { useState } from 'react';
import { callApi } from '../../../apiClient.js';
import { categoryImageFor } from '../../../categoryImages.js';
import { useSaveRequest } from '../../../useSaveRequest.js';
import { uploadCategoryPhoto } from './uploadCategoryPhoto.js';

// Photo cell: tap the picture to upload a new one.
function CategoryPhotoCell({ category, onSaved }) {
  const { saving, error, save } = useSaveRequest();
  async function uploadPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (await save(() => uploadCategoryPhoto(category.id, file))) onSaved();
  }
  return (
    <td>
      <label className="category-photo-upload file-button" title="Change photo">
        <img src={category.imageUrl ?? categoryImageFor(category.name)} alt="" />
        <span>{saving ? 'Uploading…' : category.imageUrl ? 'Change' : 'Add photo'}</span>
        <input type="file" accept="image/*" onChange={uploadPhoto} disabled={saving} aria-label={`Photo for ${category.name}`} />
      </label>
      {error && <p className="field-error" role="alert">{error}</p>}
    </td>
  );
}

function DeleteButton({ category, onDeleted }) {
  const { saving, error, save } = useSaveRequest();
  async function deleteCategory() {
    if (!window.confirm(`Delete ${category.name}?`)) return;
    if (await save(() => callApi(`/api/admin/categories/${category.id}`, { method: 'DELETE' }))) onDeleted();
  }
  const hasProducts = category.productCount > 0;
  return (
    <>
      <button type="button" className="text-button danger-text" disabled={saving || hasProducts} onClick={deleteCategory}
        title={hasProducts ? 'Move or delete its products first' : undefined}>Delete</button>
      {error && <p className="field-error" role="alert">{error}</p>}
    </>
  );
}

export function CategoryRow({ category, onSaved }) {
  const [values, setValues] = useState({ name: category.name, sortOrder: String(category.sortOrder), comingSoon: category.comingSoon });
  const { saving, error, fieldErrors, save } = useSaveRequest();
  const update = (fieldName) => (value) => setValues((previous) => ({ ...previous, [fieldName]: value }));
  const changed = values.name !== category.name || values.sortOrder !== String(category.sortOrder) || values.comingSoon !== category.comingSoon;
  async function saveRow() {
    if (await save(() => callApi(`/api/admin/categories/${category.id}`, { method: 'PUT', body: values }))) onSaved();
  }
  return (
    <tr>
      <CategoryPhotoCell category={category} onSaved={onSaved} />
      <td><input className="input input-small" value={values.name} maxLength={60} onChange={(event) => update('name')(event.target.value)} aria-label={`Name of ${category.name}`} /></td>
      <td><input className="input input-small category-order-input" inputMode="numeric" value={values.sortOrder} onChange={(event) => update('sortOrder')(event.target.value)} aria-label={`Order of ${category.name}`} /></td>
      <td><label className="checkbox-label"><input type="checkbox" checked={values.comingSoon} onChange={(event) => update('comingSoon')(event.target.checked)} /> Coming soon</label></td>
      <td className="number">{category.productCount}</td>
      <td className="no-wrap">
        <button type="button" className="button button-compact" disabled={!changed || saving} onClick={saveRow}>Save</button>
        <DeleteButton category={category} onDeleted={onSaved} />
        {(error || fieldErrors.name || fieldErrors.sortOrder) && <p className="field-error" role="alert">{fieldErrors.name ?? fieldErrors.sortOrder ?? error}</p>}
      </td>
    </tr>
  );
}
