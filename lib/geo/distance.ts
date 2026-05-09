import type { Coordinate } from "@/types/course";

const EARTH_RADIUS_METERS = 6371000;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function toDegrees(value: number) {
  return (value * 180) / Math.PI;
}

export function haversineDistanceMeters(a: Coordinate, b: Coordinate) {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const hav =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(hav));
}

export function pathDistanceMeters(path: Coordinate[]) {
  if (path.length < 2) return 0;

  let total = 0;
  for (let i = 1; i < path.length; i += 1) {
    total += haversineDistanceMeters(path[i - 1], path[i]);
  }
  return total;
}

export function moveCoordinate(
  origin: Coordinate,
  bearingDeg: number,
  distanceMeters: number
) {
  const bearing = toRadians(bearingDeg);
  const lat1 = toRadians(origin.lat);
  const lng1 = toRadians(origin.lng);
  const angularDistance = distanceMeters / EARTH_RADIUS_METERS;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing)
  );

  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    lat: toDegrees(lat2),
    lng: toDegrees(lng2)
  };
}
