"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { create } from "zustand";
import { TRIP } from "./data/itinerary";
import { PLACES } from "./data/places";
import { haversine, type LatLng } from "./geo";
import { getPlace, useTrip } from "./store";
import { hkIso, toHHMM, toMin } from "./time";
import type { DayPlan, ItineraryItem, LegMode, Place, ResolvedPlace, RouteResult } from "./types";

/* ───────────── API 설정 상태 ───────────── */

export const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
export const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

interface ApiState {
  server: boolean | null; // null = 확인 중
  checked: boolean;
  setServer: (v: boolean) => void;
}
export const useApi = create<ApiState>((set) => ({
  server: null,
  checked: false,
  setServer: (v) => set({ server: v, checked: true }),
}));

export function useApiBootstrap() {
  const setServer = useApi((s) => s.setServer);
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((j) => setServer(!!j.routes))
      .catch(() => setServer(false));
  }, [setServer]);
}

/* ───────────── 온라인 상태 ───────────── */

const subOnline = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};
export const useOnline = () => useSyncExternalStore(subOnline, () => navigator.onLine, () => true);

/* ───────────── 장소 좌표 ───────────── */

export interface PlacePos extends LatLng {
  verified: boolean; // Google Places 로 확인된 좌표
  placeId?: string;
}

export function placePos(p: Place | undefined, r: ResolvedPlace | undefined): PlacePos | undefined {
  if (!p || p.noMap) return undefined;
  if (r && (r.status === "ok" || r.status === "mismatch") && r.lat != null && r.lng != null) {
    return { lat: r.lat, lng: r.lng, verified: r.status === "ok", placeId: r.placeId };
  }
  if (p.approx) return { ...p.approx, verified: false, placeId: p.placeId };
  return undefined;
}

export function usePlace(key: string | null | undefined) {
  const custom = useTrip((s) => s.customPlaces);
  const resolved = useTrip((s) => (key ? s.resolved[key] : undefined));
  const place = getPlace(key, custom);
  return { place, resolved, pos: placePos(place, resolved) };
}

/* ───────────── Places 검증 (배치) ───────────── */

const inflight = new Set<string>();

export async function resolvePlace(key: string, force = false) {
  const st = useTrip.getState();
  const p = getPlace(key, st.customPlaces);
  if (!p || p.noMap || (!p.query && !p.placeId)) return;
  if (!force && st.resolved[key]) return;
  if (inflight.has(key)) return;
  inflight.add(key);
  try {
    const res = await fetch("/api/places/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: p.query, placeId: p.placeId, expectArea: p.expectArea }),
    });
    if (res.status === 503) return;
    const r = (await res.json()) as ResolvedPlace;
    if (r && r.status) useTrip.getState().setResolved(key, r);
  } catch {
    /* 오프라인 등 — 다음 기회에 재시도 */
  } finally {
    inflight.delete(key);
  }
}

/** 일정·즐겨찾기에 쓰인 모든 장소를 Places API 로 검증 */
export function useResolveAll() {
  const server = useApi((s) => s.server);
  const days = useTrip((s) => s.days);
  const favorites = useTrip((s) => s.favorites);
  const resolved = useTrip((s) => s.resolved);
  const online = useOnline();
  useEffect(() => {
    if (!server || !online) return;
    const keys = new Set<string>();
    days.forEach((d) => d.items.forEach((i) => i.placeKey && keys.add(i.placeKey)));
    favorites.forEach((k) => keys.add(k));
    const todo = [...keys].filter((k) => !resolved[k] || resolved[k].status === "error");
    let cancelled = false;
    (async () => {
      for (let i = 0; i < todo.length && !cancelled; i += 4) {
        await Promise.all(todo.slice(i, i + 4).map((k) => resolvePlace(k, true)));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server, online, days, favorites]);
}

/* ───────────── 구간(leg) 계산 ───────────── */

export interface Leg {
  fromId: string;
  toId: string;
  fromKey: string;
  toKey: string;
  mode: LegMode;
  note?: string;
  routeKey?: string;
  from?: PlacePos;
  to?: PlacePos;
  departAt: string; // HH:MM
  /** 같은 장소 또는 이동 없음 */
  none: boolean;
  /** 좌표 미확인으로 경로 계산 불가 */
  missing: boolean;
  straightM?: number;
}

export const routeKeyOf = (fromKey: string, toKey: string, mode: LegMode, date: string, time: string, f?: PlacePos, t?: PlacePos) =>
  `${fromKey}@${f ? `${f.lat.toFixed(5)},${f.lng.toFixed(5)}` : "?"}>${toKey}@${t ? `${t.lat.toFixed(5)},${t.lng.toFixed(5)}` : "?"}|${mode}|${
    mode === "WALK" ? "" : `${date}T${time}`
  }`;

export function computeLegs(day: DayPlan, custom: Record<string, Place>, resolved: Record<string, ResolvedPlace>): Leg[] {
  const legs: Leg[] = [];
  for (let i = 0; i < day.items.length - 1; i++) {
    const a = day.items[i], b = day.items[i + 1];
    const pa = getPlace(a.placeKey, custom), pb = getPlace(b.placeKey, custom);
    const fa = placePos(pa, a.placeKey ? resolved[a.placeKey] : undefined);
    const fb = placePos(pb, b.placeKey ? resolved[b.placeKey] : undefined);
    const departAt = toHHMM(toMin(a.time) + (a.stay || 0));
    const same = a.placeKey === b.placeKey;
    const none = a.legMode === "NONE" || same || !a.placeKey || !b.placeKey || !!pa?.noMap || !!pb?.noMap;
    const missing = !none && (!fa || !fb);
    legs.push({
      fromId: a.id,
      toId: b.id,
      fromKey: a.placeKey ?? "",
      toKey: b.placeKey ?? "",
      mode: a.legMode,
      note: a.legNote,
      from: fa,
      to: fb,
      departAt,
      none,
      missing,
      straightM: fa && fb ? haversine(fa, fb) : undefined,
      routeKey: !none && fa && fb ? routeKeyOf(a.placeKey!, b.placeKey!, a.legMode, day.date, departAt, fa, fb) : undefined,
    });
  }
  return legs;
}

export function useLegs(dayIndex: number) {
  const day = useTrip((s) => s.days[dayIndex]);
  const custom = useTrip((s) => s.customPlaces);
  const resolved = useTrip((s) => s.resolved);
  return useMemo(() => (day ? computeLegs(day, custom, resolved) : []), [day, custom, resolved]);
}

const routeInflight = new Set<string>();

export async function fetchRoute(leg: Leg, date: string): Promise<RouteResult | undefined> {
  if (!leg.routeKey || !leg.from || !leg.to || leg.mode === "NONE") return;
  const key = leg.routeKey;
  if (routeInflight.has(key)) return;
  routeInflight.add(key);
  try {
    const res = await fetch("/api/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin: { lat: leg.from.lat, lng: leg.from.lng, placeId: leg.from.verified ? leg.from.placeId : undefined },
        destination: { lat: leg.to.lat, lng: leg.to.lng, placeId: leg.to.verified ? leg.to.placeId : undefined },
        mode: leg.mode,
        departureTime: hkIso(date, leg.departAt),
      }),
    });
    if (res.status === 503) return;
    const r = (await res.json()) as RouteResult;
    if (r?.status) {
      useTrip.getState().setRoute(key, r);
      return r;
    }
  } catch {
    /* 오프라인 */
  } finally {
    routeInflight.delete(key);
  }
}

/** 선택한 날짜(들)의 경로를 Routes API 로 계산하고 캐시 */
export function useRoutesFor(dayIndexes: number[]) {
  const server = useApi((s) => s.server);
  const days = useTrip((s) => s.days);
  const custom = useTrip((s) => s.customPlaces);
  const resolved = useTrip((s) => s.resolved);
  const routes = useTrip((s) => s.routes);
  const online = useOnline();
  const [loading, setLoading] = useState(false);
  const idxKey = dayIndexes.join(",");

  const legsByDay = useMemo(
    () => dayIndexes.map((i) => (days[i] ? computeLegs(days[i], custom, resolved) : [])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [idxKey, days, custom, resolved],
  );

  useEffect(() => {
    if (!server || !online) return;
    const todo: { leg: Leg; date: string }[] = [];
    legsByDay.forEach((legs, k) => {
      const date = days[dayIndexes[k]]?.date;
      legs.forEach((leg) => {
        if (!leg.routeKey) return;
        // 검증되지 않은 근사 좌표로는 경로를 요청하지 않음
        if (!leg.from?.placeId || !leg.to?.placeId) return;
        const c = routes[leg.routeKey];
        if (!c || c.status === "error") todo.push({ leg, date });
      });
    });
    if (!todo.length) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      for (let i = 0; i < todo.length && !cancelled; i += 3) {
        await Promise.all(todo.slice(i, i + 3).map((t) => fetchRoute(t.leg, t.date)));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
      setLoading(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server, online, legsByDay]);

  return { legsByDay, routes, loading };
}

/* ───────────── 일정 충돌 분석 ───────────── */

export interface Conflict {
  itemId: string;
  level: "warn" | "error";
  message: string;
}

export function analyzeDay(day: DayPlan, legs: Leg[], routes: Record<string, RouteResult>): Conflict[] {
  const out: Conflict[] = [];
  day.items.forEach((it, i) => {
    const next = day.items[i + 1];
    if (!next) return;
    const leg = legs[i];
    const r = leg?.routeKey ? routes[leg.routeKey] : undefined;
    const travelMin = r?.status === "ok" && r.durationSec != null ? Math.ceil(r.durationSec / 60) : 0;
    const arrive = toMin(it.time) + (it.stay || 0) + travelMin;
    const gap = toMin(next.time) - arrive;
    if (toMin(next.time) < toMin(it.time)) {
      out.push({ itemId: next.id, level: "error", message: "이전 일정보다 시각이 빠릅니다 (순서 또는 시간 확인)" });
    } else if (gap < 0) {
      out.push({
        itemId: next.id,
        level: next.deadline ? "error" : "warn",
        message: `${travelMin ? `이동 ${travelMin}분 포함 시 ` : "체류 시간 기준 "}약 ${-gap}분 늦게 도착 (${toHHMM(arrive)} 예상)`,
      });
    }
  });

  // 귀국일 공항 도착 목표 시각 검증 (누적 지연 반영)
  if (day.date === TRIP.airportDeadline.date) {
    const dl = day.items.find((x) => x.deadline);
    const deadline = toMin(TRIP.airportDeadline.time);
    if (dl) {
      let t = day.items.length ? toMin(day.items[0].time) : 0;
      for (let i = 0; i < day.items.length; i++) {
        const it = day.items[i];
        t = Math.max(t, toMin(it.time));
        if (it.id === dl.id) break;
        const leg = legs[i];
        const r = leg?.routeKey ? routes[leg.routeKey] : undefined;
        t += (it.stay || 0) + (r?.status === "ok" && r.durationSec ? Math.ceil(r.durationSec / 60) : 0);
      }
      if (toMin(dl.time) > deadline) {
        out.push({ itemId: dl.id, level: "error", message: `공항 도착 목표(${TRIP.airportDeadline.time})보다 늦은 시각으로 설정됨` });
      } else if (t > deadline) {
        out.push({
          itemId: dl.id,
          level: "error",
          message: `앞선 일정 기준 공항 도착 예상 ${toHHMM(t)} — 목표 ${TRIP.airportDeadline.time}보다 ${t - deadline}분 늦음`,
        });
      }
    }
  }
  return out;
}

/* ───────────── 기타 ───────────── */

export function allPlaceKeys(days: DayPlan[]) {
  const s = new Set<string>();
  days.forEach((d) => d.items.forEach((i) => i.placeKey && s.add(i.placeKey)));
  return [...s];
}

export const catalogKeys = () => Object.keys(PLACES);

export function itemIndex(day: DayPlan, id: string) {
  return day.items.findIndex((x) => x.id === id);
}

export type { ItineraryItem };
