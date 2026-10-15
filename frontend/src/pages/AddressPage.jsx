import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuthentication } from '../AuthenticationContext.jsx';
import { callApi } from '../apiClient.js';
import { SelectField, TextField } from '../FormFields.jsx';
import { mapEmbedLink } from './admin/settings/storeLocation.js';
import { LocationCapture, SocietyFields, ZoneTypeSwitch } from './address/AddressFields.jsx';
import { LocalityFields, filledFieldProperties } from './address/LocalityFields.jsx';
import {
  fieldsFromLocation, fillEmptyFields, matchZone, readAddressFromLocation, suggestedValuesOf,
} from './address/readAddressFromLocation.js';
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

// After "Use my current location": look up the address there and fill the empty boxes.
function useFillFromLocation(zones, setFormValues) {
  const [addressLookup, setAddressLookup] = useState(null);
  const [suggestedValues, setSuggestedValues] = useState({});
  async function fillFromLocation(location) {
    setAddressLookup('reading');
    try {
      const parts = await readAddressFromLocation(location);
      const zone = matchZone(zones.filter((candidate) => candidate.type === 'locality'), parts.placeNames);
      setFormValues((previousValues) => fillEmptyFields(previousValues, parts, zone));
      setSuggestedValues(suggestedValuesOf(parts, zone));
      setAddressLookup(parts.street || parts.houseNumber || zone ? 'filled' : 'not-found');
    } catch {
      setAddressLookup('not-found');
    }
  }
  return { addressLookup, suggestedValues, fillFromLocation };
}

function useAddressPageState() {
  const { account } = useAuthentication();
  const { zones, loadError } = useDeliveryZones();
  const [formValues, setFormValues] = useState(() => initialFormValues(account.profile));
  const [chosenZoneType, setChosenZoneType] = useState(account.profile?.zoneType ?? 'society');
  const { addressLookup, suggestedValues, fillFromLocation } = useFillFromLocation(zones, setFormValues);
  const currentLocation = { ...useCurrentLocation(savedLocationOf(account.profile), fillFromLocation), addressLookup };
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
    filledFromLocation: fieldsFromLocation(formValues, suggestedValues),
  };
}

// Computers only, beside the form: the customer's pin on the map, for the rider.
function AddressMap({ location }) {
  return (
    <aside className="card address-map">
      {location
        ? <iframe title="Your location on the map" src={mapEmbedLink(Number(location.latitude), Number(location.longitude))} loading="lazy" />
        : <p className="address-map-empty hint">Tap “Use my current location” to see your pin here.</p>}
      <p className="hint">Your pin helps the rider find you.</p>
    </aside>
  );
}

function ZoneAndAddressFields({ state }) {
  const { zones, zoneType, formValues, fieldErrors, updateField, filledFromLocation } = state;
  const chosenZone = zones.find((zone) => String(zone.id) === formValues.zoneId);
  return (
    <>
      <SelectField
        fieldId="zoneId" label={zoneType === 'society' ? 'Society' : 'Area'} placeholder="Choose" {...filledFieldProperties(filledFromLocation, 'zoneId')}
        value={formValues.zoneId} onChange={(value) => { updateField('zoneId', value); updateField('towerId', ''); }}
        options={zones.filter((zone) => zone.type === zoneType)} errorMessage={fieldErrors.zoneId}
      />
      {zoneType === 'society'
        ? <SocietyFields towers={chosenZone?.towers ?? []} formValues={formValues} updateField={updateField} fieldErrors={fieldErrors} />
        : <LocalityFields formValues={formValues} updateField={updateField} fieldErrors={fieldErrors} filledFromLocation={filledFromLocation} />}
    </>
  );
}

export function AddressPage() {
  const state = useAddressPageState();
  const { zoneType, formValues, fieldErrors, updateField, currentLocation } = state;
  const isLocality = zoneType === 'locality';
  return (
    <main className="app-shell">
      <header className="page-bar"><h1>Where should we deliver?</h1></header>
      <div className={isLocality ? 'page-body address-layout' : 'page-body address-layout address-layout-single'}>
        <form className="card address-form" onSubmit={state.saveAddress} noValidate>
          {state.zoneTypesOffered.size > 1 && <ZoneTypeSwitch zoneType={zoneType} onChange={state.changeZoneType} />}
          {isLocality && (
            <LocationCapture status={currentLocation.status} addressLookup={currentLocation.addressLookup}
              onCapture={currentLocation.captureLocation} errorMessage={fieldErrors.location} />
          )}
          <ZoneAndAddressFields state={state} />
          <ContactFields formValues={formValues} updateField={updateField} fieldErrors={fieldErrors} />
          {state.submitError && <p className="error-text" role="alert">{state.submitError}</p>}
          <button type="submit" className="button button-large" disabled={state.saving}>{state.saving ? 'Saving…' : 'Save & continue'}</button>
        </form>
        {isLocality && <AddressMap location={currentLocation.location} />}
      </div>
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
