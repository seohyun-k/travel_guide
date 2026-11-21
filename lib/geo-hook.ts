"use client";

import { create } from "zustand";

interface GeoState {
  pos: { lat: number; lng: number; accuracy: number } | null;
  error: string | null;
  watching: boolean;
  start: () => void;
  stop: () => void;
}

let watchId: number | null = null;

export const useGeo = create<GeoState>((set, get) => ({
  pos: null,
  error: null,
  watching: false,
  start: () => {
    if (get().watching) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      set({ error: "이 브라우저는 위치 기능을 지원하지 않습니다" });
      return;
    }
    set({ watching: true, error: null });
    watchId = navigator.geolocation.watchPosition(
      (p) => set({ pos: { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }, error: null }),
      (e) => {
        const msg =
          e.code === e.PERMISSION_DENIED
            ? "위치 권한이 거부되었습니다. 브라우저 설정에서 위치 접근을 허용해 주세요."
            : e.code === e.TIMEOUT
              ? "위치 확인 시간이 초과되었습니다. 다시 시도해 주세요."
              : "현재 위치를 확인할 수 없습니다.";
        set({ error: msg, watching: e.code !== e.PERMISSION_DENIED && get().watching });
        if (e.code === e.PERMISSION_DENIED && watchId != null) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
        }
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 },
    );
  },
  stop: () => {
    if (watchId != null) navigator.geolocation.clearWatch(watchId);
    watchId = null;
    set({ watching: false });
  },
}));
