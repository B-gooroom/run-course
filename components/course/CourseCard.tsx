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

export default function CourseCard({ course, selected, onSelect }: CourseCardProps) {
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
        예상 거리 {course.summary.estimatedDistanceKm}km · 예상 시간 {course.summary.estimatedDurationMin}
        분 · 회전 {course.summary.turnCount}회
      </p>
    </button>
  );
}
