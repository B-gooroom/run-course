import type { Coordinate } from "@/types/course";

type ElevationResponse = {
  elevation?: number[];
};

const ELEVATION_API = "https://api.open-meteo.com/v1/elevation";
const MAX_SAMPLES = 40;

function samplePath(path: Coordinate[]): Coordinate[] {
  if (path.length <= MAX_SAMPLES) return path;
  const sampled: Coordinate[] = [];
  const step = (path.length - 1) / (MAX_SAMPLES - 1);
  for (let i = 0; i < MAX_SAMPLES; i += 1) {
    const idx = Math.round(i * step);
    sampled.push(path[Math.min(path.length - 1, idx)]);
  }
  return sampled;
}

export async function getElevationGainMeters(path: Coordinate[]): Promise<number | null> {
  if (path.length < 2) return 0;
  const sampled = samplePath(path);
  const latitude = sampled.map((p) => p.lat.toFixed(6)).join(",");
  const longitude = sampled.map((p) => p.lng.toFixed(6)).join(",");

  try {
    const response = await fetch(`${ELEVATION_API}?latitude=${latitude}&longitude=${longitude}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000)
    });
    if (!response.ok) return null;

    const data = (await response.json()) as ElevationResponse;
    const elevations = data.elevation;
    if (!elevations || elevations.length < 2) return null;

    let gain = 0;
    for (let i = 1; i < elevations.length; i += 1) {
      const diff = elevations[i] - elevations[i - 1];
      if (diff > 0) gain += diff;
    }
    return Math.round(gain);
  } catch {
    return null;
  }
}
