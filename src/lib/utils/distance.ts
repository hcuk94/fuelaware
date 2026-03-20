const earthRadiusKm = 6371;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function distanceKm(
  originLat: number,
  originLng: number,
  targetLat: number,
  targetLng: number
) {
  const deltaLat = toRadians(targetLat - originLat);
  const deltaLng = toRadians(targetLng - originLng);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(originLat)) * Math.cos(toRadians(targetLat)) * Math.sin(deltaLng / 2) ** 2;

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
