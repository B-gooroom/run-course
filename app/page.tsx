"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import CourseCard from "@/components/course/CourseCard";
import DistancePicker from "@/components/course/DistancePicker";
import RunningMap from "@/components/map/RunningMap";
import type { Coordinate, Course, RunMode } from "@/types/course";

type CourseApiResponse = {
  courses: Course[];
  error?: string;
};

function clampDistance(distanceKm: number) {
  if (!Number.isFinite(distanceKm)) return 5;
  return Math.min(30, Math.max(1, distanceKm));
}

export default function HomePage() {
  const [distanceKm, setDistanceKm] = useState(5);
  const [runMode, setRunMode] = useState<RunMode>("city");
  const [location, setLocation] = useState<Coordinate | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [status, setStatus] = useState("현재 위치를 확인해 주세요.");
  const [isLoading, setIsLoading] = useState(false);
  const [pins, setPins] = useState<Coordinate[]>([]);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId],
  );
  const hasCourses = courses.length > 0;

  const resetGeneratedCourses = useCallback(() => {
    setCourses([]);
    setSelectedCourseId(null);
  }, []);

  const requestLocation = useCallback((options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;

    if (!navigator.geolocation) {
      if (!silent) {
        setStatus("이 브라우저는 위치 정보를 지원하지 않아요.");
      }
      return;
    }

    setStatus(
      silent
        ? "현재 위치를 자동으로 확인 중입니다..."
        : "위치를 확인 중입니다...",
    );
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setLocation(nextLocation);
        setStatus(
          silent
            ? "현재 위치를 자동으로 불러왔어요. 지도에서 원하는 지점을 눌러 핀을 추가해 주세요."
            : "현재 위치 기준으로 지도를 띄웠어요. 지도에서 원하는 지점을 눌러 핀을 추가해 주세요.",
        );
      },
      () => {
        setStatus(
          silent
            ? "현재 위치를 자동으로 가져오지 못했어요. 위치 확인 버튼을 눌러 권한을 확인해 주세요."
            : "위치 권한이 필요해요. 브라우저 권한을 확인해 주세요.",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 9000,
      },
    );
  }, []);

  useEffect(() => {
    requestLocation({ silent: true });
  }, [requestLocation]);

  const fetchCourses = async () => {
    if (!location) {
      setStatus("먼저 현재 위치를 확인해 주세요.");
      return;
    }

    setIsLoading(true);
    setStatus("코스를 생성하고 있어요...");

    try {
      const response = await fetch("/api/course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location,
          waypoints: pins,
          distanceKm: clampDistance(distanceKm),
          paceMinPerKm: 6.5,
          runMode,
        }),
      });

      const data = (await response.json()) as CourseApiResponse;
      if (!response.ok || !data.courses?.length) {
        setStatus(
          data.error ?? "코스를 만들지 못했어요. 잠시 후 다시 시도해 주세요.",
        );
        return;
      }

      setCourses(data.courses);
      setSelectedCourseId(data.courses[0].id);
      setStatus(`${data.courses.length}개의 코스를 추천했어요.`);
    } catch {
      setStatus("네트워크 오류가 발생했어요. 다시 시도해 주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPin = useCallback(
    (coord: Coordinate) => {
      if (!location) {
        setStatus("먼저 위치 확인을 완료해 주세요.");
        return;
      }

      setPins((prev) => {
        if (prev.length >= 6) {
          setStatus("핀은 최대 6개까지 추가할 수 있어요.");
          return prev;
        }

        const next = [...prev, coord];
        resetGeneratedCourses();
        setStatus(
          `핀 ${next.length}개를 지정했어요. 기존 코스를 초기화했어요.`,
        );
        return next;
      });
    },
    [location, resetGeneratedCourses],
  );

  const handleClearPins = () => {
    setPins([]);
    resetGeneratedCourses();
    setStatus("핀을 모두 지워서 기존 코스를 초기화했어요.");
  };

  const handleRemoveLastPin = () => {
    setPins((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.slice(0, -1);
      resetGeneratedCourses();
      setStatus(
        next.length
          ? `핀 ${next.length}개가 남아 있어요. 기존 코스를 초기화했어요.`
          : "핀을 모두 지워서 기존 코스를 초기화했어요.",
      );
      return next;
    });
  };

  const handleResetCourses = () => {
    setCourses([]);
    setSelectedCourseId(null);
    if (pins.length > 0) {
      setStatus(
        "코스를 초기화했어요. 핀은 유지됐습니다. 코스를 다시 생성해 보세요.",
      );
      return;
    }

    if (location) {
      setStatus("코스를 초기화했어요. 코스를 다시 생성해 보세요.");
      return;
    }

    setStatus("코스를 초기화했어요. 먼저 위치를 확인해 주세요.");
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 px-4 py-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Running Course MVP
        </p>
        <h1 className="mt-1 text-2xl font-bold">현재 위치 기반 러닝 코스</h1>
        <p className="mt-2 text-sm text-slate-600">{status}</p>
      </header>

      <RunningMap
        center={location}
        coursePath={selectedCourse?.path ?? null}
        pins={pins}
        onAddPin={handleAddPin}
        onResetCourse={handleResetCourses}
      />

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {/* <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">코스 설정</h2>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              핀 {pins.length}/6
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              추천 {hasCourses ? `${courses.length}개` : "없음"}
            </span>
          </div>
        </div> */}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRunMode("city")}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              runMode === "city"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            시티런
          </button>
          <button
            type="button"
            onClick={() => setRunMode("park")}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              runMode === "park"
                ? "bg-emerald-700 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            파크런
          </button>
        </div>
        {/* <div>
          <p className="mb-2 text-xs font-semibold text-slate-500">
            코스 스타일
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRunMode("city")}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                runMode === "city"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              시티런
            </button>
            <button
              type="button"
              onClick={() => setRunMode("park")}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                runMode === "park"
                  ? "bg-emerald-700 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              파크런
            </button>
          </div>
        </div> */}

        <DistancePicker
          distanceKm={distanceKm}
          onChange={(value) => setDistanceKm(clampDistance(value))}
        />

        <div className="w-full">
          {/* 위치 자동 확인을 사용하므로 수동 위치 확인 버튼은 잠시 비활성화 */}
          {/*
          <button
            type="button"
            onClick={() => requestLocation()}
            className="rounded-xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-300"
          >
            위치 확인
          </button>
          */}
          <button
            type="button"
            disabled={isLoading}
            onClick={fetchCourses}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isLoading ? "생성 중..." : "코스 생성"}
          </button>
        </div>

        {pins.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={handleRemoveLastPin}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              마지막 핀 삭제
            </button>
            <button
              type="button"
              onClick={handleClearPins}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              핀 전체 삭제
            </button>
          </div>
        ) : null}
      </section>

      <section className="space-y-2 pb-6">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-slate-700">추천 코스</h2>
          <span className="text-xs text-slate-500">
            {hasCourses ? `${courses.length}개` : "없음"}
          </span>
        </div>
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            selected={course.id === selectedCourseId}
            onSelect={setSelectedCourseId}
          />
        ))}
        {!hasCourses ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            코스 생성 버튼을 누르면 여기에 추천 결과가 표시됩니다.
          </div>
        ) : null}
      </section>
    </main>
  );
}
