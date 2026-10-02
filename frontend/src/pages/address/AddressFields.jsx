import { Icon } from '../../Icon.jsx';
import { SelectField, TextField } from '../../FormFields.jsx';

export function ZoneTypeSwitch({ zoneType, onChange }) {
  return (
    <div className="segmented" role="group" aria-label="Where do you live?">
      <button type="button" aria-pressed={zoneType === 'society'} onClick={() => onChange('society')}>
        <Icon name="building" size={16} /> Society
      </button>
      <button type="button" aria-pressed={zoneType === 'locality'} onClick={() => onChange('locality')}>
        <Icon name="home" size={16} /> Local area
      </button>
    </div>
  );
}

export function SocietyFields({ towers, formValues, updateField, fieldErrors }) {
  return (
    <div className="field-row">
      <SelectField
        fieldId="towerId" label="Tower / Block" placeholder="Choose"
        value={formValues.towerId} onChange={(value) => updateField('towerId', value)}
        options={towers} errorMessage={fieldErrors.towerId}
      />
      <TextField
        fieldId="flatNumber" label="Flat number" maxLength={20}
        value={formValues.flatNumber} onChange={(value) => updateField('flatNumber', value)}
        errorMessage={fieldErrors.flatNumber}
      />
    </div>
  );
}

const locationMessages = {
  finding: 'Finding your location…',
  saved: 'Location saved',
  failed: 'Could not get your location. Please allow location access, or skip this step.',
};

export function LocationCapture({ status, onCapture, errorMessage }) {
  const message = errorMessage ?? locationMessages[status];
  return (
    <div className="field">
      <button type="button" className="button button-outline" onClick={onCapture} disabled={status === 'finding'}>
        <Icon name="pin" /> {status === 'saved' ? 'Update my location' : 'Use my current location'}
      </button>
      {message && (
        <p className={status === 'saved' && !errorMessage ? 'notice notice-success' : 'field-error'} role="status">
          {status === 'saved' && !errorMessage && <Icon name="check" size={16} />} {message}
        </p>
      )}
    </div>
  );
}
