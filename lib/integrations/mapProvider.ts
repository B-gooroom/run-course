import type { Coordinate } from "@/types/course";

export type RouteQuery = {
  start: Coordinate;
  via: Coordinate[];
  end: Coordinate;
};

export type ProviderRoute = {
  path: Coordinate[];
  source: "provider" | "fallback";
};

type OsrmRouteResponse = {
  code?: string;
  routes?: Array<{
    geometry?: {
      coordinates?: [number, number][];
    };
  }>;
};

const OSRM_FOOT_BASE_URL = "https://router.project-osrm.org/route/v1/foot";

function toCoordinate([lng, lat]: [number, number]): Coordinate {
  return { lat, lng };
}

function toWaypointParam(point: Coordinate) {
  return `${point.lng},${point.lat}`;
}

async function fetchFootRoute(points: Coordinate[]): Promise<Coordinate[]> {
  const waypointParam = points.map(toWaypointParam).join(";");
  const endpoint = `${OSRM_FOOT_BASE_URL}/${waypointParam}?overview=full&geometries=geojson&steps=false`;
  const response = await fetch(endpoint, {
    cache: "no-store",
    signal: AbortSignal.timeout(6000)
  });

  if (!response.ok) {
    throw new Error(`OSRM request failed: ${response.status}`);
  }

  const data = (await response.json()) as OsrmRouteResponse;
  const coordinates = data.routes?.[0]?.geometry?.coordinates;
  if (!coordinates?.length) {
    throw new Error("OSRM route is empty");
  }

  return coordinates.map(toCoordinate);
}

async function getFootRoutePath(points: Coordinate[]): Promise<Coordinate[]> {
  if (points.length < 2) return points;
  return fetchFootRoute(points);
}

export async function getProviderRoute({
  start,
  via,
  end
}: RouteQuery): Promise<ProviderRoute> {
  const points = [start, ...via, end];
  try {
    const path = await getFootRoutePath(points);
    if (path.length > 1) {
      return {
        path,
        source: "provider"
      };
    }
  } catch {
    // 보행 경로 API 실패 시에는 기존 폴백을 사용한다.
  }

  return {
    path: points,
    source: "fallback"
  };
}
