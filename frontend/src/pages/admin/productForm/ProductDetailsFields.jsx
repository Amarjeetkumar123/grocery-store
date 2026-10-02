import { useApiData } from '../../../useApiData.js';
import { SelectField, TextField } from '../../../FormFields.jsx';

export function ProductDetailsFields({ formValues, updateField, fieldErrors }) {
  const categories = useApiData('/api/categories');
  return (
    <section className="card form-section">
      <h2>Product details</h2>
      <div className="field-row">
        <SelectField fieldId="categoryId" label="Category" placeholder="Choose a category"
          value={formValues.categoryId} onChange={(value) => updateField('categoryId', value)}
          options={categories.data?.categories ?? []} errorMessage={fieldErrors.categoryId} />
        <TextField fieldId="name" label="Product name" maxLength={120} placeholder="e.g. Sunflower Oil"
          value={formValues.name} onChange={(value) => updateField('name', value)} errorMessage={fieldErrors.name} />
      </div>
      <div className="field-row">
        <TextField fieldId="brand" label="Brand (optional)" maxLength={80}
          value={formValues.brand} onChange={(value) => updateField('brand', value)} errorMessage={fieldErrors.brand} />
        <TextField fieldId="manufacturer" label="Manufacturer (optional)" maxLength={120}
          value={formValues.manufacturer} onChange={(value) => updateField('manufacturer', value)} errorMessage={fieldErrors.manufacturer} />
        <TextField fieldId="countryOfOrigin" label="Country of origin" maxLength={60}
          value={formValues.countryOfOrigin} onChange={(value) => updateField('countryOfOrigin', value)} errorMessage={fieldErrors.countryOfOrigin} />
      </div>
      <div className="field">
        <label htmlFor="description">Description (optional)</label>
        <textarea id="description" className="input textarea" maxLength={1000} rows={3}
          value={formValues.description} onChange={(event) => updateField('description', event.target.value)} />
      </div>
      <label className="checkbox-label">
        <input type="checkbox" checked={formValues.active} onChange={(event) => updateField('active', event.target.checked)} />
        Show this product in the shop
      </label>
    </section>
  );
}
