import { Icon } from '../../../Icon.jsx';

function PackSizeCell({ packSize, index, fieldName, label, fieldErrors, onChange, ...inputProperties }) {
  const errorMessage = fieldErrors[`packSizes.${index}.${fieldName}`];
  return (
    <td>
      <input className={errorMessage ? 'input input-small input-invalid' : 'input input-small'}
        value={packSize[fieldName]} onChange={(event) => onChange(packSize.rowKey, fieldName, event.target.value)}
        aria-label={`${label}, pack ${index + 1}`} aria-invalid={Boolean(errorMessage)} {...inputProperties} />
      {errorMessage && <p className="field-error">{errorMessage}</p>}
    </td>
  );
}

function PackSizeRow({ packSize, index, fieldErrors, updatePackSize, removePackSize }) {
  const cellProperties = { packSize, index, fieldErrors, onChange: updatePackSize };
  return (
    <tr>
      <PackSizeCell {...cellProperties} fieldName="label" label="Pack size" placeholder="e.g. 5 L" maxLength={30} />
      <PackSizeCell {...cellProperties} fieldName="maximumRetailPrice" label="MRP" inputMode="decimal" placeholder="₹" />
      <PackSizeCell {...cellProperties} fieldName="price" label="Selling price" inputMode="decimal" placeholder="₹" />
      {packSize.id
        ? <td className="stock-note"><strong>{packSize.stock}</strong><span className="hint">Use Stock page</span></td>
        : <PackSizeCell {...cellProperties} fieldName="stock" label="Opening stock" inputMode="numeric" />}
      <PackSizeCell {...cellProperties} fieldName="lowStockLevel" label="Low stock alert" inputMode="numeric" />
      <PackSizeCell {...cellProperties} fieldName="bestBefore" label="Best before" type="date" />
      <td>
        {packSize.id ? (
          <label className="checkbox-label">
            <input type="checkbox" checked={packSize.active}
              onChange={(event) => updatePackSize(packSize.rowKey, 'active', event.target.checked)} /> Show
          </label>
        ) : (
          <button type="button" className="icon-button" onClick={() => removePackSize(packSize.rowKey)} aria-label={`Remove pack ${index + 1}`}>
            <Icon name="minus" />
          </button>
        )}
      </td>
    </tr>
  );
}

export function PackSizeEditor({ formValues, fieldErrors, updatePackSize, addPackSize, removePackSize }) {
  return (
    <section className="card form-section">
      <h2>Pack sizes and prices</h2>
      {fieldErrors.packSizes && <p className="field-error">{fieldErrors.packSizes}</p>}
      <div className="table-box">
        <table className="admin-table pack-size-table">
          <thead><tr><th>Pack size</th><th>MRP (₹)</th><th>Price (₹)</th><th>Stock</th><th>Low stock alert</th><th>Best before</th><th /></tr></thead>
          <tbody>
            {formValues.packSizes.map((packSize, index) => (
              <PackSizeRow key={packSize.rowKey} packSize={packSize} index={index} fieldErrors={fieldErrors}
                updatePackSize={updatePackSize} removePackSize={removePackSize} />
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="text-button align-start" onClick={addPackSize}><Icon name="plus" /> Add pack size</button>
    </section>
  );
}
