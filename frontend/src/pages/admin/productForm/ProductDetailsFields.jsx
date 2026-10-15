import { useApiData } from '../../../useApiData.js';
import { SelectField, TextField } from '../../../FormFields.jsx';

const descriptionLimit = 1000;

export function ProductDetailsFields({ formValues, updateField, fieldErrors }) {
  const categories = useApiData('/api/categories');
  return (
    <section className="card form-panel">
      <header className="form-panel-heading"><h2>Product details</h2></header>
      <div className="form-panel-body">
        <div className="form-grid form-grid-two">
          <SelectField fieldId="categoryId" label="Category" placeholder="Choose a category"
            value={formValues.categoryId} onChange={(value) => updateField('categoryId', value)}
            options={categories.data?.categories ?? []} errorMessage={fieldErrors.categoryId} />
          <TextField fieldId="name" label="Product name" maxLength={120} placeholder="e.g. Sunflower Oil"
            value={formValues.name} onChange={(value) => updateField('name', value)} errorMessage={fieldErrors.name} />
        </div>
        <div className="form-grid form-grid-three">
          <TextField fieldId="brand" label="Brand (optional)" maxLength={80} placeholder="e.g. Fortune"
            value={formValues.brand} onChange={(value) => updateField('brand', value)} errorMessage={fieldErrors.brand} />
          <TextField fieldId="manufacturer" label="Manufacturer (optional)" maxLength={120} placeholder="e.g. Adani Wilmar"
            value={formValues.manufacturer} onChange={(value) => updateField('manufacturer', value)} errorMessage={fieldErrors.manufacturer} />
          <TextField fieldId="countryOfOrigin" label="Country of origin" maxLength={60}
            value={formValues.countryOfOrigin} onChange={(value) => updateField('countryOfOrigin', value)} errorMessage={fieldErrors.countryOfOrigin} />
        </div>
        <div className="field">
          <label htmlFor="description">Description (optional)</label>
          <textarea id="description" className="input textarea" maxLength={descriptionLimit} rows={3} placeholder="What it is and what it is good for, in a line or two"
            value={formValues.description} onChange={(event) => updateField('description', event.target.value)} />
          <span className="field-counter">{formValues.description.length} / {descriptionLimit}</span>
        </div>
      </div>
    </section>
  );
}
