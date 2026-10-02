import { useState } from 'react';
import { callApi } from '../../apiClient.js';
import { useApiData } from '../../useApiData.js';
import { useSaveRequest } from '../../useSaveRequest.js';
import { TextField } from '../../FormFields.jsx';
import { Icon } from '../../Icon.jsx';
import { LoadingOrError } from '../../components/LoadingOrError.jsx';
import { AdminPageHeader } from './AdminLayout.jsx';

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

// Stand inside the shop and tap "Use my current location".
function StoreLocationFields({ values, update, fieldErrors }) {
  const [locationError, setLocationError] = useState(null);
  function fillCurrentLocation() {
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { update('latitude')(coords.latitude.toFixed(6)); update('longitude')(coords.longitude.toFixed(6)); },
      () => setLocationError('Could not read your location. Allow location access and try again.'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }
  return (
    <>
      <div className="field-row">
        <TextField fieldId="latitude" label="Store latitude" inputMode="decimal" value={values.latitude} onChange={update('latitude')} />
        <TextField fieldId="longitude" label="Store longitude" inputMode="decimal" value={values.longitude} onChange={update('longitude')} />
      </div>
      {(locationError || fieldErrors.location) && <p className="field-error">{locationError ?? fieldErrors.location}</p>}
      <button type="button" className="button button-compact button-outline align-start" onClick={fillCurrentLocation}>
        <Icon name="pin" /> Use my current location
      </button>
    </>
  );
}

function StoreSettingsForm({ settings }) {
  const [values, setValues] = useState(() => toFormValues(settings));
  const [savedMessage, setSavedMessage] = useState(null);
  const { saving, error, fieldErrors, save } = useSaveRequest();
  const update = (fieldName) => (value) => { setSavedMessage(null); setValues((previous) => ({ ...previous, [fieldName]: value })); };

  async function handleSubmit(event) {
    event.preventDefault();
    const result = await save(() => callApi('/api/admin/store-settings', { method: 'PUT', body: toRequestBody(values) }));
    if (result) {
      setValues(toFormValues(result.settings));
      setSavedMessage('Settings saved.');
    }
  }

  return (
    <form className="card form-section settings-form" onSubmit={handleSubmit}>
      <TextField fieldId="storeName" label="Store name" value={values.storeName} onChange={update('storeName')} errorMessage={fieldErrors.storeName} maxLength={60} />
      <StoreLocationFields values={values} update={update} fieldErrors={fieldErrors} />
      <TextField fieldId="maximumDeliveryDistanceKilometers" label="Maximum delivery distance (km)" inputMode="decimal"
        value={values.maximumDeliveryDistanceKilometers} onChange={update('maximumDeliveryDistanceKilometers')} errorMessage={fieldErrors.maximumDeliveryDistanceKilometers} />
      <TextField fieldId="upiId" label="Store UPI ID" placeholder="yourstore@okhdfcbank" value={values.upiId} onChange={update('upiId')} errorMessage={fieldErrors.upiId} />
      <TextField fieldId="whatsappNumber" label="Store WhatsApp number" inputMode="tel" value={values.whatsappNumber} onChange={update('whatsappNumber')} errorMessage={fieldErrors.whatsappNumber} />
      {error && <p className="error-text" role="alert">{error}</p>}
      {savedMessage && <p className="notice notice-success" role="status"><Icon name="check" size={16} /> {savedMessage}</p>}
      <div className="form-actions">
        <button type="submit" className="button button-compact" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button>
      </div>
    </form>
  );
}

export function AdminStoreSettingsPage() {
  const { data, error, loading, reload } = useApiData('/api/admin/store-settings');
  return (
    <>
      <AdminPageHeader title="Store settings" />
      <LoadingOrError loading={loading} error={error} onRetry={reload} />
      {data && <StoreSettingsForm settings={data.settings} />}
    </>
  );
}
