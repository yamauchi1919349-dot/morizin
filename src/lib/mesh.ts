export function calculateThirdMeshNumber(latitude: number, longitude: number) {
  const latMinutes = latitude * 60;
  const firstLat = Math.floor(latMinutes / 40);
  const firstLon = Math.floor(longitude) - 100;

  const latRemainder = latMinutes - firstLat * 40;
  const lonRemainder = longitude - Math.floor(longitude);

  const secondLat = Math.min(7, Math.max(0, Math.floor(latRemainder / 5)));
  const secondLon = Math.min(7, Math.max(0, Math.floor(lonRemainder * 8)));

  const thirdLat = Math.min(9, Math.max(0, Math.floor((latRemainder - secondLat * 5) / 0.5)));
  const thirdLon = Math.min(9, Math.max(0, Math.floor((lonRemainder * 8 - secondLon) * 10)));

  return `${String(firstLat).padStart(2, "0")}${String(firstLon).padStart(2, "0")}${secondLat}${secondLon}${thirdLat}${thirdLon}`;
}
