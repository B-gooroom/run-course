"use client";

import { useEffect, useRef, useState } from "react";
import type { Coordinate } from "@/types/course";

type RunningMapProps = {
  center: Coordinate | null;
  coursePath: Coordinate[] | null;
  pins?: Coordinate[];
  onAddPin?: (coord: Coordinate) => void;
};

const SCRIPT_ID = "kakao-map-sdk";
const DEFAULT_CENTER: Coordinate = {
  lat: 37.5665,
  lng: 126.978
};

function toLatLng(coord: Coordinate) {
  return new window.kakao!.maps.LatLng(coord.lat, coord.lng);
}

export default function RunningMap({ center, coursePath, pins = [], onAddPin }: RunningMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<KakaoMapInstance | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const jsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? "";

  useEffect(() => {
    if (!jsKey) {
      setMapError("NEXT_PUBLIC_KAKAO_JS_KEY 값이 없습니다.");
      return;
    }

    const renderMap = () => {
      if (!window.kakao?.maps || !mapRef.current) return;

      const kakaoMaps = window.kakao.maps;
      const mapCenter = pins.length > 0 ? pins[pins.length - 1] : (center ?? DEFAULT_CENTER);
      const map = new kakaoMaps.Map(mapRef.current, {
        center: toLatLng(mapCenter),
        level: 4
      });
      mapInstanceRef.current = map;

      pins.forEach((pin) => {
        const pinMarker = new kakaoMaps.Marker({
          position: toLatLng(pin)
        });
        pinMarker.setMap(map);
      });

      if (coursePath && coursePath.length > 1) {
        const polyline = new kakaoMaps.Polyline({
          path: coursePath.map(toLatLng),
          strokeWeight: 5,
          strokeColor: "#0f172a",
          strokeOpacity: 0.9,
          strokeStyle: "solid"
        });
        polyline.setMap(map);
      }

      const focusPoints = coursePath && coursePath.length > 1 ? coursePath : pins;
      if (focusPoints.length > 1) {
        const bounds = new kakaoMaps.LatLngBounds();
        focusPoints.forEach((point) => bounds.extend(toLatLng(point)));
        map.setBounds(bounds, 40, 40, 40, 40);
      } else if (focusPoints.length === 1) {
        map.setCenter(toLatLng(focusPoints[0]));
      }

      if (onAddPin) {
        kakaoMaps.event.addListener(map, "click", (mouseEvent) => {
          onAddPin({
            lat: mouseEvent.latLng.getLat(),
            lng: mouseEvent.latLng.getLng()
          });
        });
      }

      setMapError(null);
    };

    if (window.kakao?.maps) {
      window.kakao.maps.load(renderMap);
      return;
    }

    const onLoad = () => {
      if (!window.kakao?.maps) {
        setMapError("카카오 SDK는 로드됐지만 맵 객체를 찾지 못했습니다. 도메인/키 설정을 확인해 주세요.");
        return;
      }
      window.kakao.maps.load(renderMap);
    };

    const onError = () => {
      setMapError("카카오 지도 SDK 로드에 실패했습니다. JavaScript 키/웹 도메인 등록을 확인해 주세요.");
    };

    const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    const script =
      existingScript ??
      (() => {
        const nextScript = document.createElement("script");
        nextScript.id = SCRIPT_ID;
        nextScript.src = `https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&appkey=${jsKey}`;
        nextScript.async = true;
        document.head.appendChild(nextScript);
        return nextScript;
      })();

    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);

    return () => {
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
    };
  }, [center, coursePath, jsKey, onAddPin, pins]);

  const handleZoomIn = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const nextLevel = Math.max(1, map.getLevel() - 1);
    map.setLevel(nextLevel);
  };

  const handleZoomOut = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const nextLevel = Math.min(14, map.getLevel() + 1);
    map.setLevel(nextLevel);
  };

  return (
    <div className="relative h-[46vh] min-h-[320px] w-full overflow-hidden rounded-2xl border border-slate-200">
      <div ref={mapRef} className="h-full w-full bg-slate-100" />
      <div className="absolute bottom-3 right-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={handleZoomIn}
          className="h-9 w-9 rounded-lg border border-slate-300 bg-white text-lg font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          aria-label="지도 확대"
        >
          +
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="h-9 w-9 rounded-lg border border-slate-300 bg-white text-lg font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          aria-label="지도 축소"
        >
          -
        </button>
      </div>
      {mapError ? (
        <div className="absolute inset-x-3 top-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {mapError}
        </div>
      ) : null}
    </div>
  );
}
