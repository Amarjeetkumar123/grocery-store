import { useState } from 'react';
import { callApi } from '../../apiClient.js';
import { useApiData } from '../../useApiData.js';
import { useDebouncedValue } from '../../useDebouncedValue.js';
import { useSaveRequest } from '../../useSaveRequest.js';
import { TextField } from '../../FormFields.jsx';
import { Icon } from '../../Icon.jsx';
import { LoadingOrError } from '../../components/LoadingOrError.jsx';
import { AdminPageHeader } from './AdminLayout.jsx';
import { locationErrorMessage, mapEmbedLink, mapLink, readCoordinatePair } from './settings/storeLocation.js';

const toText = (value) => (value === null || value === undefined ? '' : String(value));
const toNumberOrNull = (text) => (text.trim() === '' ? null : Number(text));

function toFormValues(settings) {
  return Object.fromEntries(Object.entries(settings).map(([fieldName, value]) => [fieldName, toText(value)]));
}

function toRequestBody(values) {
  return {
    ...values,
    latitude: toNumberOrNull(values.latitude),
    longitude: toNumberOrNull(values.longitude),
    maximumDeliveryDistanceKilometers: toNumberOrNull(values.maximumDeliveryDistanceKilometers),
  };
}

// Reads the device location. On phones this is GPS; many computers have no location at all.
function useFindLocation(onFound) {
  const [finding, setFinding] = useState(false);
  const [locationError, setLocationError] = useState(null);
  function findLocation() {
    setLocationError(null);
    if (!navigator.geolocation) return setLocationError(locationErrorMessage(2));
    setFinding(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setFinding(false); onFound({ latitude: coords.latitude.toFixed(6), longitude: coords.longitude.toFixed(6) }); },
      (positionError) => { setFinding(false); setLocationError(locationErrorMessage(positionError.code)); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }
  return { finding, locationError, findLocation };
}

// The pin follows the numbers as they are typed (after a short pause), so a wrong number is easy to spot.
function StoreMap({ latitude, longitude, distance }) {
  const debounced = useDebouncedValue(`${latitude},${longitude}`, 600);
  const [mapLatitude, mapLongitude] = debounced.split(',').map(Number);
  if (!readCoordinatePair(debounced)) return <div className="store-map store-map-empty"><Icon name="pin" /> Add the shop's latitude and longitude to see it on the map.</div>;
  return (
    <div className="store-map">
      <iframe src={mapEmbedLink(mapLatitude, mapLongitude)} title="The shop on the map" loading="lazy" />
      {distance && <span className="store-map-label">Delivers up to {distance} km from here</span>}
    </div>
  );
}

// Stand inside the shop and tap "Use my current location", or paste the numbers from Google Maps.
function StoreLocationFields({ values, update, fieldErrors }) {
  const fillBoth = (pair) => { update('latitude')(pair.latitude); update('longitude')(pair.longitude); };
  const { finding, locationError, findLocation } = useFindLocation(fillBoth);
  function handlePaste(event) {
    const pair = readCoordinatePair(event.clipboardData.getData('text'));
    if (!pair) return;
    event.preventDefault();
    fillBoth(pair);
  }
  const hasLocation = values.latitude.trim() !== '' && values.longitude.trim() !== '';
  return (
    <>
      <StoreMap latitude={values.latitude} longitude={values.longitude} distance={values.maximumDeliveryDistanceKilometers} />
      <div className="field-row">
        <TextField fieldId="latitude" label="Latitude" inputMode="decimal" value={values.latitude} onChange={update('latitude')} onPaste={handlePaste} />
        <TextField fieldId="longitude" label="Longitude" inputMode="decimal" value={values.longitude} onChange={update('longitude')} onPaste={handlePaste} />
      </div>
      <p className="field-hint">Stand inside the shop and tap Use my current location. On a computer, paste the numbers from Google Maps into either box.</p>
      {(locationError || fieldErrors.location) && <p className="field-error" role="alert">{locationError ?? fieldErrors.location}</p>}
      <div className="button-row">
        <button type="button" className="button button-compact button-outline" onClick={findLocation} disabled={finding}>
          {finding ? <><span className="spinner spinner-dark" aria-hidden="true" /> Finding your location…</> : <><Icon name="pin" /> Use my current location</>}
        </button>
        {hasLocation && <a className="button button-compact button-outline" href={mapLink(values.latitude, values.longitude)} target="_blank" rel="noreferrer">Check on Google Maps</a>}
      </div>
    </>
  );
}

function StoreDetailsCard({ values, update, fieldErrors }) {
  return (
    <section className="card settings-card">
      <div className="card-heading panel-heading"><h2>Store details</h2></div>
      <div className="panel-body">
        <TextField fieldId="storeName" label="Store name" value={values.storeName} onChange={update('storeName')} errorMessage={fieldErrors.storeName} maxLength={60}
          hint="Shown at the top of the shop and on WhatsApp messages." />
        <TextField fieldId="whatsappNumber" label="Store WhatsApp number" prefix="+91" inputMode="tel" value={values.whatsappNumber} onChange={update('whatsappNumber')}
          errorMessage={fieldErrors.whatsappNumber} hint="Customers and riders message this number." />
        <TextField fieldId="upiId" label="Store UPI ID" placeholder="yourstore@okhdfcbank" value={values.upiId} onChange={update('upiId')}
          errorMessage={fieldErrors.upiId} hint="Customers pay to this UPI ID when the rider shows the QR code." />
      </div>
    </section>
  );
}

function LocationCard({ values, update, fieldErrors }) {
  return (
    <section className="card settings-card">
      <div className="card-heading panel-heading"><h2>Location &amp; delivery</h2></div>
      <div className="panel-body">
        <StoreLocationFields values={values} update={update} fieldErrors={fieldErrors} />
        <div className="panel-divider" />
        <TextField fieldId="maximumDeliveryDistanceKilometers" label="Maximum delivery distance" suffix="km" inputMode="decimal" className="distance-field"
          value={values.maximumDeliveryDistanceKilometers} onChange={update('maximumDeliveryDistanceKilometers')}
          errorMessage={fieldErrors.maximumDeliveryDistanceKilometers} hint="Addresses farther than this cannot order." />
      </div>
    </section>
  );
}

function SaveStatus({ saving, savedMessage, changed }) {
  if (savedMessage && !changed) return <span className="saved-note" role="status"><Icon name="check" size={15} /> {savedMessage}</span>;
  return (
    <button type="submit" form="store-settings-form" className="button button-compact" disabled={saving || !changed}>
      {saving ? 'Saving…' : 'Save settings'}
    </button>
  );
}

// Two cards across the page; Save sits in the page heading and says when everything is saved.
function StoreSettingsForm({ settings }) {
  const [savedValues, setSavedValues] = useState(() => toFormValues(settings));
  const [values, setValues] = useState(savedValues);
  const [savedMessage, setSavedMessage] = useState('All changes saved');
  const { saving, error, fieldErrors, save } = useSaveRequest();
  const update = (fieldName) => (value) => setValues((previous) => ({ ...previous, [fieldName]: value }));
  const changed = JSON.stringify(values) !== JSON.stringify(savedValues);

  async function handleSubmit(event) {
    event.preventDefault();
    const result = await save(() => callApi('/api/admin/store-settings', { method: 'PUT', body: toRequestBody(values) }));
    if (!result) return;
    const saved = toFormValues(result.settings);
    setSavedValues(saved);
    setValues(saved);
    setSavedMessage('Settings saved');
  }

  return (
    <>
      <AdminPageHeader title="Store settings" subtitle="Your shop's name, payments and where you deliver">
        <SaveStatus saving={saving} savedMessage={savedMessage} changed={changed} />
      </AdminPageHeader>
      {error && <p className="error-text" role="alert">{error}</p>}
      <form id="store-settings-form" className="settings-grid" onSubmit={handleSubmit}>
        <StoreDetailsCard values={values} update={update} fieldErrors={fieldErrors} />
        <LocationCard values={values} update={update} fieldErrors={fieldErrors} />
      </form>
    </>
  );
}

export function AdminStoreSettingsPage() {
  const { data, error, loading, reload } = useApiData('/api/admin/store-settings');
  if (data) return <StoreSettingsForm settings={data.settings} />;
  return (
    <>
      <AdminPageHeader title="Store settings" />
      <LoadingOrError loading={loading} error={error} onRetry={reload} />
    </>
  );
}
