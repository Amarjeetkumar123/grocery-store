import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuthentication } from '../AuthenticationContext.jsx';
import { callApi } from '../apiClient.js';
import { SelectField, TextField } from '../FormFields.jsx';
import { SocietyFields, ZoneTypeSwitch } from './address/AddressFields.jsx';
import { LocalityFields } from './address/LocalityFields.jsx';
import {
  buildProfileRequest, initialFormValues, useCurrentLocation, useDeliveryZones,
} from './address/useAddressForm.js';

function savedLocationOf(profile) {
  return profile?.latitude ? { latitude: profile.latitude, longitude: profile.longitude } : null;
}

// Sends the address to the API, then returns to the home page.
function useSaveAddress() {
  const { refreshAccount } = useAuthentication();
  const navigate = useNavigate();
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function saveProfile(profileRequest) {
    setSaving(true);
    try {
      await callApi('/api/account/profile', { method: 'PUT', body: profileRequest });
      await refreshAccount();
      navigate('/', { replace: true });
    } catch (error) {
      setFieldErrors(error.fieldErrors ?? {});
      setSubmitError(error.message);
      setSaving(false);
    }
  }
  return { saveProfile, fieldErrors, submitError, saving };
}

function useAddressPageState() {
  const { account } = useAuthentication();
  const { zones, loadError } = useDeliveryZones();
  const [formValues, setFormValues] = useState(() => initialFormValues(account.profile));
  const [chosenZoneType, setChosenZoneType] = useState(account.profile?.zoneType ?? 'society');
  const currentLocation = useCurrentLocation(savedLocationOf(account.profile));
  const { saveProfile, fieldErrors, submitError, saving } = useSaveAddress();

  const zoneTypesOffered = new Set(zones.map((zone) => zone.type));
  const zoneType = zoneTypesOffered.size === 1 ? [...zoneTypesOffered][0] : chosenZoneType;

  function updateField(fieldName, value) {
    setFormValues((previousValues) => ({ ...previousValues, [fieldName]: value }));
  }
  function changeZoneType(newZoneType) {
    setChosenZoneType(newZoneType);
    setFormValues((previousValues) => ({ ...previousValues, zoneId: '', towerId: '' }));
  }
  function saveAddress(event) {
    event.preventDefault();
    saveProfile(buildProfileRequest(formValues, zoneType, currentLocation.location));
  }
  return {
    zones, zoneTypesOffered, zoneType, formValues, fieldErrors, submitError: submitError ?? loadError,
    saving, currentLocation, updateField, changeZoneType, saveAddress,
  };
}

export function AddressPage() {
  const state = useAddressPageState();
  const { zones, zoneType, formValues, fieldErrors, updateField } = state;
  const zonesOfType = zones.filter((zone) => zone.type === zoneType);
  const chosenZone = zones.find((zone) => String(zone.id) === formValues.zoneId);

  return (
    <main className="app-shell">
      <header className="page-bar"><h1>Where should we deliver?</h1></header>
      <form className="page-body" onSubmit={state.saveAddress} noValidate>
        {state.zoneTypesOffered.size > 1 && <ZoneTypeSwitch zoneType={zoneType} onChange={state.changeZoneType} />}
        <SelectField
          fieldId="zoneId" label={zoneType === 'society' ? 'Society' : 'Area'} placeholder="Choose"
          value={formValues.zoneId} onChange={(value) => { updateField('zoneId', value); updateField('towerId', ''); }}
          options={zonesOfType} errorMessage={fieldErrors.zoneId}
        />
        {zoneType === 'society'
          ? <SocietyFields towers={chosenZone?.towers ?? []} formValues={formValues} updateField={updateField} fieldErrors={fieldErrors} />
          : <LocalityFields formValues={formValues} updateField={updateField} fieldErrors={fieldErrors} currentLocation={state.currentLocation} />}
        <ContactFields formValues={formValues} updateField={updateField} fieldErrors={fieldErrors} />
        {state.submitError && <p className="error-text" role="alert">{state.submitError}</p>}
        <button type="submit" className="button button-large" disabled={state.saving}>
          {state.saving ? 'Saving…' : 'Save & continue'}
        </button>
      </form>
    </main>
  );
}

function ContactFields({ formValues, updateField, fieldErrors }) {
  return (
    <>
      <TextField
        fieldId="name" label="Your name" autoComplete="name" maxLength={80}
        value={formValues.name} onChange={(value) => updateField('name', value)} errorMessage={fieldErrors.name}
      />
      <TextField
        fieldId="phone" label="Mobile number" type="tel" inputMode="tel" autoComplete="tel" placeholder="10-digit number"
        value={formValues.phone} onChange={(value) => updateField('phone', value)} errorMessage={fieldErrors.phone}
      />
      <p className="hint">We call or WhatsApp you only about your orders.</p>
    </>
  );
}
