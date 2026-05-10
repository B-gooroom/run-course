"use client";

import type { Course } from "@/types/course";

type CourseCardProps = {
  course: Course;
  selected: boolean;
  onSelect: (id: string) => void;
};

const TYPE_LABEL: Record<Course["type"], string> = {
  "out-and-back": "왕복형",
  loop: "루프형"
};

function getElevationLevel(course: Course) {
  const gain = course.summary.elevationGainM;
  if (gain === null || course.summary.estimatedDistanceKm <= 0) return 0;
  const gainPerKm = gain / course.summary.estimatedDistanceKm;
  if (gainPerKm < 15) return 1;
  if (gainPerKm < 30) return 2;
  if (gainPerKm < 45) return 3;
  if (gainPerKm < 60) return 4;
  return 5;
}

function getElevationLabel(level: number) {
  if (level <= 1) return "완만";
  if (level <= 3) return "보통";
  return "업힐";
}

export default function CourseCard({ course, selected, onSelect }: CourseCardProps) {
  const elevationLevel = getElevationLevel(course);
  const elevationLabel = getElevationLabel(elevationLevel);

  return (
    <button
      type="button"
      onClick={() => onSelect(course.id)}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        selected
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-900 hover:border-slate-400"
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">{course.name}</h3>
        <span className={`text-xs ${selected ? "text-slate-200" : "text-slate-500"}`}>
          {TYPE_LABEL[course.type]}
        </span>
      </div>
      <p className={`mt-2 text-sm ${selected ? "text-slate-100" : "text-slate-600"}`}>
        예상 거리 {course.summary.estimatedDistanceKm}km · 누적 상승고도{" "}
        {course.summary.elevationGainM === null ? "정보 없음" : `${course.summary.elevationGainM}m`} · 회전{" "}
        {course.summary.turnCount}회
      </p>
      {course.summary.elevationGainM !== null ? (
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={`text-xs ${selected ? "text-slate-200" : "text-slate-500"}`}>고도 난이도</span>
            <span className={`text-xs font-semibold ${selected ? "text-slate-100" : "text-slate-700"}`}>
              {elevationLabel}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, idx) => {
              const active = idx < elevationLevel;
              return (
                <span
                  key={`elevation-${course.id}-${idx}`}
                  className={`h-1.5 w-4 rounded-full ${
                    active
                      ? selected
                        ? "bg-emerald-300"
                        : "bg-emerald-500"
                      : selected
                        ? "bg-slate-700"
                        : "bg-slate-200"
                  }`}
                />
              );
            })}
          </div>
        </div>
      ) : null}
    </button>
  );
}
