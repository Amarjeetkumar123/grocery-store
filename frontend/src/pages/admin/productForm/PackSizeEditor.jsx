import { Link } from 'react-router';
import { percentOff } from '../../../formatting.js';
import { Icon } from '../../../Icon.jsx';

function PackSizeCell({ packSize, index, fieldName, label, fieldErrors, onChange, prefix, ...inputProperties }) {
  const errorMessage = fieldErrors[`packSizes.${index}.${fieldName}`];
  const input = (
    <input className={errorMessage ? 'input input-small input-invalid' : 'input input-small'}
      value={packSize[fieldName]} onChange={(event) => onChange(packSize.rowKey, fieldName, event.target.value)}
      aria-label={`${label}, pack ${index + 1}`} aria-invalid={Boolean(errorMessage)} {...inputProperties} />
  );
  return (
    <td>
      {prefix ? <div className="input-affix"><span className="input-prefix">{prefix}</span>{input}</div> : input}
      {errorMessage && <p className="field-error">{errorMessage}</p>}
    </td>
  );
}

// "10% off" once both prices are filled in.
function DiscountCell({ packSize }) {
  const discount = percentOff(Number(packSize.maximumRetailPrice), Number(packSize.price));
  return <td>{discount > 0 ? <span className="discount-chip">{discount}% off</span> : <span className="hint">—</span>}</td>;
}

// Saved packs: stock is read-only (changes go through the Stock page, which logs them) and they can be hidden.
function PackSizeTools({ packSize, index, updatePackSize, removePackSize }) {
  if (!packSize.id) {
    return (
      <button type="button" className="icon-button icon-button-danger" onClick={() => removePackSize(packSize.rowKey)} aria-label={`Remove pack ${index + 1}`}>
        <Icon name="trash" size={16} />
      </button>
    );
  }
  return (
    <input type="checkbox" className="switch switch-green" role="switch" checked={packSize.active} title={packSize.active ? 'Shown in the shop' : 'Hidden'}
      onChange={(event) => updatePackSize(packSize.rowKey, 'active', event.target.checked)} aria-label={`Show pack ${index + 1} in the shop`} />
  );
}

function PackSizeRow({ packSize, index, fieldErrors, updatePackSize, removePackSize }) {
  const cellProperties = { packSize, index, fieldErrors, onChange: updatePackSize };
  return (
    <tr className={packSize.active ? '' : 'row-hidden'}>
      <PackSizeCell {...cellProperties} fieldName="label" label="Pack size" placeholder="e.g. 1 kg" maxLength={30} />
      <PackSizeCell {...cellProperties} fieldName="maximumRetailPrice" label="MRP" inputMode="decimal" placeholder="0" prefix="₹" />
      <PackSizeCell {...cellProperties} fieldName="price" label="Selling price" inputMode="decimal" placeholder="0" prefix="₹" />
      <DiscountCell packSize={packSize} />
      {packSize.id
        ? <td className="stock-read"><strong>{packSize.stock}</strong><Link to="/admin/stock">Adjust in Stock</Link></td>
        : <PackSizeCell {...cellProperties} fieldName="stock" label="Opening stock" inputMode="numeric" />}
      <PackSizeCell {...cellProperties} fieldName="lowStockLevel" label="Low stock alert" inputMode="numeric" />
      <PackSizeCell {...cellProperties} fieldName="bestBefore" label="Best before" type="date" />
      <td className="pack-tools"><PackSizeTools packSize={packSize} index={index} updatePackSize={updatePackSize} removePackSize={removePackSize} /></td>
    </tr>
  );
}

export function PackSizeEditor({ formValues, fieldErrors, updatePackSize, addPackSize, removePackSize, editing }) {
  return (
    <section className="card form-panel">
      <header className="form-panel-heading">
        <h2>Pack sizes and prices <span className="count-badge">{formValues.packSizes.length}</span></h2>
        <p className="hint">{editing ? 'Stock changes go through the Stock page, so every change is logged.' : 'Stock is how many you have now; later changes go through the Stock page.'}</p>
      </header>
      {fieldErrors.packSizes && <p className="field-error form-panel-error">{fieldErrors.packSizes}</p>}
      <div className="table-scroll">
        <table className="admin-table pack-size-table">
          <thead><tr><th>Pack size</th><th>MRP</th><th>Price</th><th>Discount</th><th>Stock</th><th>Low stock alert</th><th>Best before</th><th /></tr></thead>
          <tbody>
            {formValues.packSizes.map((packSize, index) => (
              <PackSizeRow key={packSize.rowKey} packSize={packSize} index={index} fieldErrors={fieldErrors}
                updatePackSize={updatePackSize} removePackSize={removePackSize} />
            ))}
          </tbody>
        </table>
      </div>
      <footer className="form-panel-footer">
        <button type="button" className="text-button" onClick={addPackSize}><Icon name="plus" size={16} /> Add pack size</button>
      </footer>
    </section>
  );
}
