declare global {
  type KakaoLatLng = {
    getLat: () => number;
    getLng: () => number;
  };

  type KakaoMapMouseEvent = {
    latLng: KakaoLatLng;
  };

  type KakaoMapBounds = {
    extend: (latLng: KakaoLatLng) => void;
  };

  type KakaoMapInstance = {
    setBounds: (bounds: KakaoMapBounds, paddingTop?: number, paddingRight?: number, paddingBottom?: number, paddingLeft?: number) => void;
    setLevel: (level: number) => void;
    getLevel: () => number;
    setCenter: (latLng: KakaoLatLng) => void;
  };

  interface Window {
    kakao?: {
      maps: {
        load: (cb: () => void) => void;
        LatLng: new (lat: number, lng: number) => KakaoLatLng;
        LatLngBounds: new () => KakaoMapBounds;
        Map: new (container: HTMLElement, options: Record<string, unknown>) => KakaoMapInstance;
        Marker: new (options: Record<string, unknown>) => { setMap: (map: unknown) => void };
        Polyline: new (options: Record<string, unknown>) => { setMap: (map: unknown) => void };
        event: {
          addListener: (
            target: KakaoMapInstance,
            type: "click",
            handler: (event: KakaoMapMouseEvent) => void
          ) => void;
        };
      };
    };
  }
}

export {};
