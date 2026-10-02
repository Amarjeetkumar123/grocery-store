const earthRadiusInKilometers = 6371;

// Straight-line (great-circle) distance between two points on Earth.
export function distanceInKilometers(from, to) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDifference = toRadians(to.latitude - from.latitude);
  const longitudeDifference = toRadians(to.longitude - from.longitude);
  const haversine = Math.sin(latitudeDifference / 2) ** 2
    + Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(longitudeDifference / 2) ** 2;
  return 2 * earthRadiusInKilometers * Math.asin(Math.sqrt(haversine));
}
