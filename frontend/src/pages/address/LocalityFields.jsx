import { TextField } from '../../FormFields.jsx';
import { LocationCapture } from './AddressFields.jsx';

export function LocalityFields({ formValues, updateField, fieldErrors, currentLocation }) {
  return (
    <>
      <div className="field-row">
        <TextField
          fieldId="houseNumber" label="House / Shop no." maxLength={30}
          value={formValues.houseNumber} onChange={(value) => updateField('houseNumber', value)}
          errorMessage={fieldErrors.houseNumber}
        />
        <TextField
          fieldId="floor" label="Floor (optional)" maxLength={20}
          value={formValues.floor} onChange={(value) => updateField('floor', value)}
          errorMessage={fieldErrors.floor}
        />
      </div>
      <TextField
        fieldId="street" label="Street" maxLength={80}
        value={formValues.street} onChange={(value) => updateField('street', value)}
        errorMessage={fieldErrors.street}
      />
      <TextField
        fieldId="landmark" label="Landmark" maxLength={80} placeholder="e.g. Near Shiv Mandir"
        value={formValues.landmark} onChange={(value) => updateField('landmark', value)}
        errorMessage={fieldErrors.landmark}
      />
      <LocationCapture
        status={currentLocation.status}
        onCapture={currentLocation.captureLocation}
        errorMessage={fieldErrors.location}
      />
    </>
  );
}
