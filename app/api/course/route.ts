import { NextResponse } from "next/server";
import { generateCourses } from "@/lib/course/generateCourse";

type Body = {
  location?: { lat?: number; lng?: number };
  distanceKm?: number;
  paceMinPerKm?: number;
  waypoints?: Array<{ lat?: number; lng?: number }>;
};

function isValidCoord(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const lat = body.location?.lat;
    const lng = body.location?.lng;
    const distanceKm = body.distanceKm;

    if (!isValidCoord(lat) || !isValidCoord(lng) || typeof distanceKm !== "number") {
      return NextResponse.json(
        { error: "유효한 위치와 거리(distanceKm)를 전달해 주세요." },
        { status: 400 }
      );
    }

    const safeLat = lat as number;
    const safeLng = lng as number;
    const waypoints =
      body.waypoints?.filter(
        (point) => isValidCoord(point.lat) && isValidCoord(point.lng)
      ).map((point) => ({ lat: point.lat as number, lng: point.lng as number })) ?? [];

    const courses = await generateCourses({
      location: { lat: safeLat, lng: safeLng },
      distanceKm,
      paceMinPerKm: body.paceMinPerKm,
      waypoints
    });

    return NextResponse.json({ courses });
  } catch {
    return NextResponse.json(
      { error: "코스 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
