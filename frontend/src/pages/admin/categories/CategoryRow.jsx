import { useState } from 'react';
import { callApi } from '../../../apiClient.js';
import { categoryImageFor } from '../../../categoryImages.js';
import { useSaveRequest } from '../../../useSaveRequest.js';
import { Icon } from '../../../Icon.jsx';
import { uploadCategoryPhoto } from './uploadCategoryPhoto.js';

// Tap the picture to upload a new one; a camera shows on hover.
function CategoryPhoto({ category, onSaved }) {
  const { saving, error, save } = useSaveRequest();
  async function uploadPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (await save(() => uploadCategoryPhoto(category.id, file))) onSaved();
  }
  return (
    <>
      <label className={`category-thumb file-button${saving ? ' category-thumb-busy' : ''}`} title="Change photo">
        <img src={category.imageUrl ?? categoryImageFor(category.name)} alt="" />
        <span className="category-thumb-overlay">{saving ? <span className="spinner" /> : <Icon name="camera" size={18} />}</span>
        <input type="file" accept="image/*" onChange={uploadPhoto} disabled={saving} aria-label={`Photo for ${category.name}`} />
      </label>
      {error && <p className="field-error" role="alert">{error}</p>}
    </>
  );
}

function DeleteButton({ category, onDeleted, save, saving }) {
  async function deleteCategory() {
    if (!window.confirm(`Delete ${category.name}?`)) return;
    if (await save(() => callApi(`/api/admin/categories/${category.id}`, { method: 'DELETE' }))) onDeleted();
  }
  const hasProducts = category.productCount > 0;
  return (
    <button type="button" className="icon-button icon-button-danger" disabled={saving || hasProducts} onClick={deleteCategory}
      aria-label={`Delete ${category.name}`} title={hasProducts ? 'Move or delete its products first' : 'Delete'}>
      <Icon name="trash" size={18} />
    </button>
  );
}

export function CategoryRow({ category, onSaved }) {
  const [values, setValues] = useState({ name: category.name, sortOrder: String(category.sortOrder), comingSoon: category.comingSoon });
  const { saving, error, fieldErrors, save } = useSaveRequest();
  const update = (fieldName) => (value) => setValues((previous) => ({ ...previous, [fieldName]: value }));
  const changed = values.name !== category.name || values.sortOrder !== String(category.sortOrder) || values.comingSoon !== category.comingSoon;
  const message = fieldErrors.name ?? fieldErrors.sortOrder ?? error;
  async function saveRow() {
    if (await save(() => callApi(`/api/admin/categories/${category.id}`, { method: 'PUT', body: values }))) onSaved();
  }
  return (
    <tr>
      <td>
        <div className="category-cell">
          <CategoryPhoto category={category} onSaved={onSaved} />
          <input className="input input-quiet" value={values.name} maxLength={60} onChange={(event) => update('name')(event.target.value)} aria-label={`Name of ${category.name}`} />
        </div>
        {message && <p className="field-error" role="alert">{message}</p>}
      </td>
      <td className="number">{category.productCount}</td>
      <td>
        <label className="switch-label">
          <input type="checkbox" className="switch" checked={values.comingSoon} onChange={(event) => update('comingSoon')(event.target.checked)} />
          <span className={values.comingSoon ? 'pill pill-amber' : 'pill pill-green'}>{values.comingSoon ? 'Coming soon' : 'Live'}</span>
        </label>
      </td>
      <td><input className="input input-quiet category-order-input" inputMode="numeric" value={values.sortOrder} onChange={(event) => update('sortOrder')(event.target.value)} aria-label={`Order of ${category.name}`} /></td>
      <td>
        <div className="row-actions">
          {changed && <button type="button" className="button button-compact" disabled={saving} onClick={saveRow}>Save</button>}
          <DeleteButton category={category} onDeleted={onSaved} save={save} saving={saving} />
        </div>
      </td>
    </tr>
  );
}
