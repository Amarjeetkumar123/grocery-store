import { useEffect, useState } from 'react';
import { callApi } from '../../apiClient.js';

export function useDeliveryZones() {
  const [zones, setZones] = useState([]);
  const [loadError, setLoadError] = useState(null);
  useEffect(() => {
    callApi('/api/zones')
      .then((data) => setZones(data.zones))
      .catch((error) => setLoadError(error.message));
  }, []);
  return { zones, loadError };
}

// Reads the phone's GPS. status: 'idle' | 'finding' | 'saved' | 'failed'.
export function useCurrentLocation(savedLocation) {
  const [location, setLocation] = useState(savedLocation);
  const [status, setStatus] = useState(savedLocation ? 'saved' : 'idle');

  function captureLocation() {
    if (!navigator.geolocation) {
      setStatus('failed');
      return;
    }
    setStatus('finding');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setStatus('saved');
      },
      () => setStatus('failed'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }
  return { location, status, captureLocation };
}

export function initialFormValues(profile) {
  return {
    name: profile?.name ?? '',
    phone: profile?.phone ?? '',
    zoneId: profile?.zoneId ? String(profile.zoneId) : '',
    towerId: profile?.towerId ? String(profile.towerId) : '',
    flatNumber: profile?.flatNumber ?? '',
    houseNumber: profile?.houseNumber ?? '',
    street: profile?.street ?? '',
    landmark: profile?.landmark ?? '',
    floor: profile?.floor ?? '',
  };
}

// Sends only the address fields that belong to the chosen zone type.
export function buildProfileRequest(formValues, zoneType, location) {
  const common = { name: formValues.name, phone: formValues.phone, zoneId: Number(formValues.zoneId) };
  if (zoneType === 'society') {
    return { ...common, towerId: Number(formValues.towerId) || null, flatNumber: formValues.flatNumber };
  }
  return {
    ...common,
    houseNumber: formValues.houseNumber,
    street: formValues.street,
    landmark: formValues.landmark,
    floor: formValues.floor,
    latitude: location?.latitude ?? null,
    longitude: location?.longitude ?? null,
  };
}
