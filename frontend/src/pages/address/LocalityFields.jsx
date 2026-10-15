import { TextField } from '../../FormFields.jsx';

// filledFromLocation: names of boxes the location filled in; they are tinted and labelled so the customer checks them.
export function filledFieldProperties(filledFromLocation, fieldName) {
  return filledFromLocation.has(fieldName) ? { className: 'field-filled', hint: 'Filled from your location' } : {};
}

export function LocalityFields({ formValues, updateField, fieldErrors, filledFromLocation }) {
  const filled = (fieldName) => filledFieldProperties(filledFromLocation, fieldName);
  return (
    <>
      <div className="field-row">
        <TextField
          fieldId="houseNumber" label="House / Shop no." maxLength={30} {...filled('houseNumber')}
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
        fieldId="street" label="Street" maxLength={80} {...filled('street')}
        value={formValues.street} onChange={(value) => updateField('street', value)}
        errorMessage={fieldErrors.street}
      />
      <TextField
        fieldId="landmark" label="Landmark" maxLength={80} placeholder="e.g. Near Shiv Mandir" {...filled('landmark')}
        value={formValues.landmark} onChange={(value) => updateField('landmark', value)}
        errorMessage={fieldErrors.landmark}
      />
    </>
  );
}
