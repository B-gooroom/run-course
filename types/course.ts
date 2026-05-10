export type Coordinate = {
  lat: number;
  lng: number;
};

export type CourseType = "out-and-back" | "loop";
export type RunMode = "city" | "park";

export type CourseSummary = {
  estimatedDistanceKm: number;
  elevationGainM: number | null;
  turnCount: number;
};

export type Course = {
  id: string;
  name: string;
  type: CourseType;
  path: Coordinate[];
  summary: CourseSummary;
  score: number;
};

export type CourseRequest = {
  location: Coordinate;
  distanceKm: number;
  paceMinPerKm?: number;
  waypoints?: Coordinate[];
  runMode?: RunMode;
};
