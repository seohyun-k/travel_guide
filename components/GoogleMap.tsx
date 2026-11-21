"use client";

import { useEffect, useRef, useState } from "react";
import { decodePolyline, fmtDistance, gmapsDirUrl } from "@/lib/geo";
import { useGeo } from "@/lib/geo-hook";
import type { MapMarker, MapSegment } from "@/lib/mapdata";
import { CATEGORY, LEG_MODE, vehicleMeta } from "@/lib/meta";
import { fmtDuration } from "@/lib/time";
import { MAP_ID, MAPS_KEY } from "@/lib/trip";
import type { RouteStep } from "@/lib/types";

/* ── Maps JavaScript API 로더 ── */
let loadPromise: Promise<void> | null = null;
let authFailed = false;
const authListeners = new Set<() => void>();

function loadMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (typeof (window as { google?: { maps?: { importLibrary?: unknown } } }).google?.maps?.importLibrary === "function") return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = new Promise<void>((resolve, reject) => {
    const w = window as unknown as Record<string, unknown>;
    w.gm_authFailure = () => {
      authFailed = true;
      authListeners.forEach((f) => f());
    };
    w.__hkMapsReady = () => resolve();
    const s = document.createElement("script");
    const p = new URLSearchParams({
      key: MAPS_KEY,
      v: "weekly",
      language: "ko",
      region: "HK",
      loading: "async",
      callback: "__hkMapsReady",
    });
    s.src = `https://maps.googleapis.com/maps/api/js?${p}`;
    s.async = true;
    s.onerror = () => {
      loadPromise = null;
      reject(new Error("Google Maps 스크립트를 불러오지 못했습니다 (네트워크 확인)"));
    };
    document.head.appendChild(s);
  });
  return loadPromise;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function pinEl(m: MapMarker, active: boolean, dim: boolean, overview: boolean) {
  const el = document.createElement("div");
  const cat = CATEGORY[m.category];
  el.className = `hk-pin${active ? " active" : ""}${m.pos.verified ? "" : " unverified"}`;
  el.style.background = m.category === "hotel" ? "#1F2430" : m.color;
  el.style.opacity = dim ? "0.35" : "1";
  const label = m.category === "hotel" ? "H" : overview ? `${m.dayIndex + 1}` : m.nums.slice(0, 2).join("·");
  el.innerHTML = `<span>${esc(label)}</span><i class="hk-pin-emoji" style="font-style:normal">${cat.icon}</i>`;
  el.title = m.name;
  return el;
}

function segmentInfoHtml(seg: MapSegment) {
  const r = seg.route;
  const mode = LEG_MODE[seg.leg.mode];
  const link = gmapsDirUrl({
    origin: { lat: seg.leg.from?.lat, lng: seg.leg.from?.lng, placeId: seg.leg.from?.placeId },
    dest: { lat: seg.leg.to?.lat, lng: seg.leg.to?.lng, placeId: seg.leg.to?.placeId },
    mode: mode.gmaps,
  });
  const lines =
    r?.steps
      ?.filter((s) => s.mode === "TRANSIT")
      .map((s) => {
        const v = vehicleMeta(s.vehicle);
        return `<div style="margin-top:4px">${v.icon} <b>${esc(s.lineName ?? v.label)}</b> ${esc(s.departureStop ?? "")} → ${esc(s.arrivalStop ?? "")}${
          s.stopCount ? ` (${s.stopCount}정거장)` : ""
        }</div>`;
      })
      .join("") ?? "";
  return `<div style="font-family:inherit;min-width:200px;max-width:260px;font-size:13px;line-height:1.45;color:#1F2430">
    <div style="font-weight:700;font-size:14px">${esc(seg.fromName)} → ${esc(seg.toName)}</div>
    <div style="margin-top:4px;color:#4A5162">${mode.icon} ${mode.label} · <b>${fmtDuration(r?.durationSec)}</b> · ${fmtDistance(r?.distanceM)}</div>
    ${lines}
    <div style="margin-top:4px;color:#8A90A0;font-size:11px">출발 ${seg.leg.departAt} · Google Routes API 기준</div>
    <a href="${link}" target="_blank" rel="noopener" style="display:inline-block;margin-top:6px;color:#3B6FBC;font-weight:600">Google Maps 길찾기 ↗</a>
  </div>`;
}

export interface GoogleMapProps {
  markers: MapMarker[];
  segments: MapSegment[];
  selectedItemId: string | null;
  overview: boolean;
  activeDay?: number;
  onSelectMarker: (m: MapMarker) => void;
  fitSignal: number;
  interactive?: boolean;
  onFail: (msg: string) => void;
}

export default function GoogleMap({ markers, segments, selectedItemId, overview, activeDay, onSelectMarker, fitSignal, interactive = true, onFail }: GoogleMapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const libs = useRef<{ AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement } | null>(null);
  const markerObjs = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const lineObjs = useRef<google.maps.Polyline[]>([]);
  const meMarker = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const meCircle = useRef<google.maps.Circle | null>(null);
  const info = useRef<google.maps.InfoWindow | null>(null);
  const [ready, setReady] = useState(false);
  const geo = useGeo();
  const onSelectRef = useRef(onSelectMarker);
  onSelectRef.current = onSelectMarker;

  /* 초기화 */
  useEffect(() => {
    let cancelled = false;
    const onAuth = () => onFail("Google Maps API 키 인증에 실패했습니다 (키 제한·결제 설정 확인)");
    authListeners.add(onAuth);
    if (authFailed) onAuth();
    loadMaps()
      .then(async () => {
        if (cancelled || !ref.current) return;
        const { Map, InfoWindow } = (await google.maps.importLibrary("maps")) as google.maps.MapsLibrary;
        const { AdvancedMarkerElement } = (await google.maps.importLibrary("marker")) as google.maps.MarkerLibrary;
        if (cancelled || !ref.current) return;
        libs.current = { AdvancedMarkerElement };
        mapRef.current = new Map(ref.current, {
          center: { lat: 22.2855, lng: 114.158 },
          zoom: 13,
          mapId: MAP_ID,
          disableDefaultUI: true,
          zoomControl: interactive,
          clickableIcons: false,
          gestureHandling: interactive ? "greedy" : "none",
          keyboardShortcuts: interactive,
        });
        info.current = new InfoWindow();
        setReady(true);
      })
      .catch((e) => onFail((e as Error).message));
    return () => {
      cancelled = true;
      authListeners.delete(onAuth);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 마커 */
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !libs.current) return;
    markerObjs.current.forEach((m) => (m.map = null));
    markerObjs.current = markers.map((m) => {
      const active = !!selectedItemId && m.itemIds.includes(selectedItemId);
      const dim = overview && activeDay != null && m.dayIndex !== activeDay;
      const mk = new libs.current!.AdvancedMarkerElement({
        map,
        position: m.pos,
        content: pinEl(m, active, dim, overview),
        title: m.name,
        zIndex: active ? 1000 : m.category === "hotel" ? 1 : 10,
        gmpClickable: true,
      });
      mk.addListener("click", () => onSelectRef.current(m));
      return mk;
    });
  }, [ready, markers, selectedItemId, overview, activeDay]);

  /* 경로 폴리라인 — API 가 반환한 실제 경로만 그림 (직선 연결 없음) */
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    lineObjs.current.forEach((l) => l.setMap(null));
    lineObjs.current = [];
    for (const seg of segments) {
      const r = seg.route;
      if (!r || r.status !== "ok") continue;
      const parts: RouteStep[] = r.steps?.length ? r.steps : [{ mode: r.mode === "DRIVE" ? "DRIVE" : "WALK", polyline: r.polyline }];
      for (const st of parts) {
        if (!st.polyline) continue;
        const path = decodePolyline(st.polyline);
        let opts: google.maps.PolylineOptions;
        if (st.mode === "WALK") {
          opts = {
            strokeOpacity: 0,
            icons: [{ icon: { path: google.maps.SymbolPath.CIRCLE, scale: 2.6, fillOpacity: 1, fillColor: seg.color, strokeOpacity: 0 }, offset: "0", repeat: "9px" }],
          };
        } else if (st.mode === "TRANSIT") {
          const v = vehicleMeta(st.vehicle);
          const color = st.lineColor || v.color;
          opts = { strokeColor: color, strokeWeight: 6, strokeOpacity: 0.9 };
          if (st.vehicle === "FERRY") {
            opts = {
              strokeOpacity: 0,
              icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, strokeColor: color, strokeWeight: 4, scale: 3 }, offset: "0", repeat: "14px" }],
            };
          }
        } else {
          opts = { strokeColor: "#2F3A4F", strokeWeight: 5, strokeOpacity: 0.8 };
        }
        const dim = overview && activeDay != null && seg.dayIndex !== activeDay;
        if (dim) opts = { ...opts, strokeOpacity: opts.strokeOpacity ? 0.25 : 0 };
        const line = new google.maps.Polyline({ ...opts, path, map, clickable: true, zIndex: st.mode === "TRANSIT" ? 5 : 4 });
        // 클릭 영역 확보용 투명 라인
        const hit = new google.maps.Polyline({ path, map, strokeOpacity: 0.01, strokeWeight: 18, clickable: true, zIndex: 6 });
        const open = (e: google.maps.PolyMouseEvent) => {
          info.current?.setContent(segmentInfoHtml(seg));
          info.current?.setPosition(e.latLng);
          info.current?.open({ map });
        };
        line.addListener("click", open);
        hit.addListener("click", open);
        lineObjs.current.push(line, hit);
      }
    }
  }, [ready, segments, overview, activeDay]);

  /* 전체 경로 맞춤 */
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !markers.length) return;
    const b = new google.maps.LatLngBounds();
    markers.forEach((m) => b.extend(m.pos));
    segments.forEach((s) => s.route?.polyline && decodePolyline(s.route.polyline).forEach((p) => b.extend(p)));
    if (markers.length === 1) {
      map.setCenter(markers[0].pos);
      map.setZoom(16);
    } else map.fitBounds(b, { top: 70, bottom: interactive ? 140 : 20, left: 30, right: 30 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, fitSignal]);

  /* 선택된 일정으로 이동 */
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !selectedItemId) return;
    const m = markers.find((x) => x.itemIds.includes(selectedItemId));
    if (m) {
      map.panTo(m.pos);
      if ((map.getZoom() ?? 0) < 15) map.setZoom(16);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, selectedItemId]);

  /* 현재 위치 */
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !libs.current) return;
    if (!geo.pos) {
      if (meMarker.current) meMarker.current.map = null;
      meCircle.current?.setMap(null);
      return;
    }
    if (!meMarker.current) {
      const el = document.createElement("div");
      el.className = "hk-me";
      meMarker.current = new libs.current.AdvancedMarkerElement({ content: el, zIndex: 2000, title: "현재 위치" });
      meCircle.current = new google.maps.Circle({ strokeOpacity: 0, fillColor: "#3b82f6", fillOpacity: 0.12, clickable: false });
    }
    meMarker.current.map = map;
    meMarker.current.position = geo.pos;
    meCircle.current!.setMap(map);
    meCircle.current!.setCenter(geo.pos);
    meCircle.current!.setRadius(geo.pos.accuracy);
  }, [ready, geo.pos]);

  // 현재 위치 버튼으로 시작하면 한 번 이동
  const centeredOnce = useRef(false);
  useEffect(() => {
    if (!geo.watching) centeredOnce.current = false;
    if (ready && geo.pos && geo.watching && !centeredOnce.current && mapRef.current) {
      centeredOnce.current = true;
      mapRef.current.panTo(geo.pos);
      mapRef.current.setZoom(16);
    }
  }, [ready, geo.pos, geo.watching]);

  return <div ref={ref} className="h-full w-full bg-[#eef2f6]" />;
}
