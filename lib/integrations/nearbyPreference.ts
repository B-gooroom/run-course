import { haversineDistanceMeters } from "@/lib/geo/distance";
import type { Coordinate } from "@/types/course";

type NearbyAnchor = {
  point: Coordinate;
  label: "공원" | "수변";
};

type OverpassElement = {
  lat?: number;
  lon?: number;
  center?: {
    lat?: number;
    lon?: number;
  };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements?: OverpassElement[];
};

const OVERPASS_API = "https://overpass-api.de/api/interpreter";
const SEARCH_RADIUS_METERS = 2200;

function pickPoint(element: OverpassElement): Coordinate | null {
  const lat = element.lat ?? element.center?.lat;
  const lng = element.lon ?? element.center?.lon;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  return { lat, lng };
}

function pickLabel(tags: Record<string, string> | undefined): NearbyAnchor["label"] | null {
  if (!tags) return null;
  if (tags.leisure === "park") return "공원";
  if (tags.natural === "water" || tags.waterway === "riverbank") return "수변";
  return null;
}

export async function getNearbyRunningAnchor(origin: Coordinate): Promise<NearbyAnchor | null> {
  const query = `
[out:json][timeout:8];
(
  nwr(around:${SEARCH_RADIUS_METERS},${origin.lat},${origin.lng})[leisure=park];
  nwr(around:${SEARCH_RADIUS_METERS},${origin.lat},${origin.lng})[natural=water];
  nwr(around:${SEARCH_RADIUS_METERS},${origin.lat},${origin.lng})[waterway=riverbank];
);
out center qt 30;
`;

  try {
    const response = await fetch(OVERPASS_API, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: query,
      cache: "no-store",
      signal: AbortSignal.timeout(2200)
    });

    if (!response.ok) return null;
    const data = (await response.json()) as OverpassResponse;
    const candidates =
      data.elements
        ?.map((element) => {
          const point = pickPoint(element);
          const label = pickLabel(element.tags);
          if (!point || !label) return null;
          return {
            point,
            label,
            distance: haversineDistanceMeters(origin, point)
          };
        })
        .filter((value): value is { point: Coordinate; label: NearbyAnchor["label"]; distance: number } => Boolean(value))
        .sort((a, b) => a.distance - b.distance) ?? [];

    if (candidates.length === 0) return null;

    // 파크런에서는 수변(강/호수) 우선 탐색이 러닝 체감 품질이 높다.
    const nearestWater = candidates.find((candidate) => candidate.label === "수변");
    const chosen = nearestWater ?? candidates[0];
    return { point: chosen.point, label: chosen.label };
  } catch {
    return null;
  }
}
