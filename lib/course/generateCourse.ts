import {
  haversineDistanceMeters,
  moveCoordinate,
  pathDistanceMeters
} from "@/lib/geo/distance";
import { getProviderRoute } from "@/lib/integrations/mapProvider";
import type { Coordinate, Course, CourseRequest } from "@/types/course";

const MIN_DISTANCE_KM = 1;
const MAX_DISTANCE_KM = 30;
const DEFAULT_PACE_MIN_PER_KM = 6.5;

type Candidate = {
  id: string;
  name: string;
  type: Course["type"];
  controlPoints: Coordinate[];
  pinned?: boolean;
};

function sanitizeDistance(distanceKm: number) {
  if (!Number.isFinite(distanceKm)) return 5;
  return Math.max(MIN_DISTANCE_KM, Math.min(MAX_DISTANCE_KM, distanceKm));
}

function buildOutAndBack(origin: Coordinate, distanceKm: number, bearingDeg: number): Candidate {
  const oneWayMeters = (distanceKm * 1000) / 2;
  const farPoint = moveCoordinate(origin, bearingDeg, oneWayMeters);

  return {
    id: `out-${bearingDeg}`,
    name: `왕복 코스 ${Math.round(bearingDeg)}°`,
    type: "out-and-back",
    controlPoints: [origin, farPoint, origin]
  };
}

function buildLoop(origin: Coordinate, distanceKm: number, startBearingDeg: number): Candidate {
  const legMeters = (distanceKm * 1000) / 4;
  const p1 = moveCoordinate(origin, startBearingDeg, legMeters);
  const p2 = moveCoordinate(p1, startBearingDeg + 95, legMeters);
  const p3 = moveCoordinate(p2, startBearingDeg + 185, legMeters);

  return {
    id: `loop-${startBearingDeg}`,
    name: `루프 코스 ${Math.round(startBearingDeg)}°`,
    type: "loop",
    controlPoints: [origin, p1, p2, p3, origin]
  };
}

function turnCount(path: Coordinate[]) {
  if (path.length < 3) return 0;

  const sampled: Coordinate[] = [path[0]];
  for (let i = 1; i < path.length - 1; i += 12) {
    if (haversineDistanceMeters(sampled[sampled.length - 1], path[i]) >= 45) {
      sampled.push(path[i]);
    }
  }
  sampled.push(path[path.length - 1]);

  const bearing = (a: Coordinate, b: Coordinate) => {
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return (Math.atan2(y, x) * 180) / Math.PI;
  };

  let turns = 0;
  let prev = bearing(sampled[0], sampled[1]);

  for (let i = 2; i < sampled.length; i += 1) {
    const next = bearing(sampled[i - 1], sampled[i]);
    let delta = Math.abs(next - prev);
    if (delta > 180) delta = 360 - delta;
    if (delta >= 35) turns += 1;
    prev = next;
  }

  return turns;
}

function calcScore(path: Coordinate[], targetMeters: number) {
  const actualMeters = pathDistanceMeters(path);
  const distanceErrorRatio = Math.abs(actualMeters - targetMeters) / targetMeters;
  const turnPenalty = turnCount(path) * 0.01;
  const loopPenalty = 0;
  return distanceErrorRatio + turnPenalty + loopPenalty;
}

function selectDiverseCourses(courses: Course[], count: number) {
  const sorted = [...courses].sort((a, b) => a.score - b.score);
  const selected: Course[] = [];
  const seen = new Set<string>();

  const bestOutAndBack = sorted.find((course) => course.type === "out-and-back");
  const bestLoop = sorted.find((course) => course.type === "loop");

  if (bestOutAndBack) {
    selected.push(bestOutAndBack);
    seen.add(bestOutAndBack.id);
  }
  if (bestLoop && !seen.has(bestLoop.id)) {
    selected.push(bestLoop);
    seen.add(bestLoop.id);
  }

  for (const course of sorted) {
    if (selected.length >= count) break;
    if (seen.has(course.id)) continue;
    selected.push(course);
    seen.add(course.id);
  }

  return selected.slice(0, count);
}

export async function generateCourses(input: CourseRequest): Promise<Course[]> {
  const distanceKm = sanitizeDistance(input.distanceKm);
  const paceMinPerKm = input.paceMinPerKm ?? DEFAULT_PACE_MIN_PER_KM;
  const targetMeters = distanceKm * 1000;
  const origin = input.location;
  const waypoints = input.waypoints?.slice(0, 6) ?? [];
  const basePoint = waypoints[0] ?? origin;
  const distanceVariants = waypoints.length > 0 ? [0.78, 0.9, 1].map((r) => distanceKm * r) : [distanceKm];

  const autoCandidates: Candidate[] = distanceVariants.flatMap((candidateDistanceKm, index) => [
    {
      ...buildOutAndBack(basePoint, candidateDistanceKm, 20),
      id: `out-20-v${index}`
    },
    {
      ...buildOutAndBack(basePoint, candidateDistanceKm, 120),
      id: `out-120-v${index}`
    },
    {
      ...buildLoop(basePoint, candidateDistanceKm, 40),
      id: `loop-40-v${index}`
    },
    {
      ...buildLoop(basePoint, candidateDistanceKm, 200),
      id: `loop-200-v${index}`
    }
  ]);
  const pinnedCandidates: Candidate[] = [];

  if (waypoints.length >= 2) {
    const [startPin, ...restPins] = waypoints;
    pinnedCandidates.push({
      id: "pinned-forward",
      name: "핀 지정 코스",
      type: "loop",
      controlPoints: [startPin, ...restPins, startPin],
      pinned: true
    });

    if (waypoints.length > 2) {
      pinnedCandidates.push({
        id: "pinned-reverse",
        name: "핀 역순 코스",
        type: "loop",
        controlPoints: [startPin, ...restPins.slice().reverse(), startPin],
        pinned: true
      });
    }
  }

  const candidates = [...pinnedCandidates, ...autoCandidates];

  const resolved = await Promise.all(
    candidates.map(async (candidate) => {
      const [start, ...rest] = candidate.controlPoints;
      const end = rest[rest.length - 1];
      const via = rest.slice(0, -1);
      const providerRoute = await getProviderRoute({ start, via, end });
      const actualMeters = pathDistanceMeters(providerRoute.path);
      const score = calcScore(providerRoute.path, targetMeters);
      const estimatedDurationMin = Math.round((actualMeters / 1000) * paceMinPerKm);

      return {
        id: candidate.id,
        name: candidate.name,
        type: candidate.type,
        path: providerRoute.path,
        summary: {
          estimatedDistanceKm: Number((actualMeters / 1000).toFixed(2)),
          estimatedDurationMin,
          turnCount: turnCount(providerRoute.path)
        },
        score
      } satisfies Course;
    })
  );

  const pinnedResolved = resolved.filter((course) => course.id.startsWith("pinned-"));
  const autoResolved = resolved.filter((course) => !course.id.startsWith("pinned-"));

  if (pinnedResolved.length > 0) {
    const bestPinned = [...pinnedResolved].sort((a, b) => a.score - b.score)[0];
    const bestAuto = selectDiverseCourses(autoResolved, 2);
    return [bestPinned, ...bestAuto];
  }

  return selectDiverseCourses(autoResolved, 3);
}
