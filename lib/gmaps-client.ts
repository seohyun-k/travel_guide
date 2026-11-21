"use client";

/**
 * 브라우저에서 Google Maps JavaScript API 를 직접 사용하는 모드.
 * 서버 API 가 없는 정적 배포(GitHub Pages)에서 장소 검증·검색·경로 계산에 쓴다.
 * 키는 HTTP 리퍼러로 제한된 브라우저용 키(NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)만 사용.
 */
import { MAPS_KEY } from "./env";
import { HK_BOUNDS, inHK } from "./geo";
import { toResolved } from "./places-shared";
import type { LegMode, ResolvedPlace, RouteResult, RouteStep } from "./types";

let loadPromise: Promise<void> | null = null;
export let mapsAuthFailed = false;
export const authListeners = new Set<() => void>();

export function loadMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (!MAPS_KEY) return Promise.reject(new Error("Google Maps API 키가 없습니다"));
  if (typeof (window as { google?: { maps?: { importLibrary?: unknown } } }).google?.maps?.importLibrary === "function") return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = new Promise<void>((resolve, reject) => {
    const w = window as unknown as Record<string, unknown>;
    w.gm_authFailure = () => {
      mapsAuthFailed = true;
      authListeners.forEach((f) => f());
    };
    w.__hkMapsReady = () => resolve();
    const s = document.createElement("script");
    const p = new URLSearchParams({ key: MAPS_KEY, v: "weekly", language: "ko", region: "HK", loading: "async", callback: "__hkMapsReady" });
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

const FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "googleMapsURI",
  "websiteURI",
  "regularOpeningHours",
  "businessStatus",
  "rating",
  "userRatingCount",
  "photos",
];

/** Maps JS Place 객체 → 서버 응답과 같은 형태로 변환 후 공통 검증 로직 적용 */
function placeToRaw(pl: google.maps.places.Place) {
  const photo = pl.photos?.[0];
  let photoUrl: string | undefined;
  try {
    photoUrl = photo?.getURI({ maxWidth: 900 });
  } catch {
    photoUrl = undefined;
  }
  return {
    id: pl.id,
    displayName: { text: pl.displayName ?? undefined },
    formattedAddress: pl.formattedAddress ?? undefined,
    location: pl.location ? { latitude: pl.location.lat(), longitude: pl.location.lng() } : undefined,
    googleMapsUri: pl.googleMapsURI ?? undefined,
    websiteUri: pl.websiteURI ?? undefined,
    regularOpeningHours: pl.regularOpeningHours
      ? {
          periods: pl.regularOpeningHours.periods.map((x) => ({
            open: x.open ? { day: x.open.day, hour: x.open.hour, minute: x.open.minute } : undefined,
            close: x.close ? { day: x.close.day, hour: x.close.hour, minute: x.close.minute } : undefined,
          })),
        }
      : undefined,
    businessStatus: pl.businessStatus ?? undefined,
    rating: pl.rating ?? undefined,
    userRatingCount: pl.userRatingCount ?? undefined,
    photos: photo ? [{ authorAttributions: photo.authorAttributions?.map((a) => ({ displayName: a.displayName })) }] : undefined,
    photoUrl,
  };
}

async function placesLib() {
  await loadMaps();
  return (await google.maps.importLibrary("places")) as google.maps.PlacesLibrary;
}

async function textSearch(textQuery: string, max: number) {
  const { Place } = await placesLib();
  const { places } = await Place.searchByText({
    textQuery,
    fields: FIELDS,
    language: "en",
    region: "hk",
    maxResultCount: max,
    locationBias: { north: HK_BOUNDS.north, south: HK_BOUNDS.south, east: HK_BOUNDS.east, west: HK_BOUNDS.west },
  });
  return places;
}

export async function clientResolve(q: { query?: string; placeId?: string; expectArea?: string[] }): Promise<ResolvedPlace> {
  try {
    if (q.placeId) {
      const { Place } = await placesLib();
      const pl = new Place({ id: q.placeId });
      await pl.fetchFields({ fields: FIELDS });
      return toResolved(placeToRaw(pl), q.expectArea);
    }
    const places = await textSearch(q.query ?? "", 5);
    if (!places.length) return { status: "not_found", message: "Google Places 에서 장소를 찾지 못했습니다", checkedAt: Date.now() };
    const cands = places.map((p) => toResolved(placeToRaw(p), q.expectArea));
    return cands.find((c) => c.status === "ok") ?? cands[0];
  } catch (e) {
    return { status: "error", message: (e as Error).message, checkedAt: Date.now() };
  }
}

export async function clientSearch(q: string): Promise<ResolvedPlace[]> {
  const places = await textSearch(`${q} Hong Kong`, 8);
  return places.map((p) => toResolved(placeToRaw(p))).filter((r) => r.lat != null && r.lng != null && inHK({ lat: r.lat!, lng: r.lng! }));
}

const TM: Record<Exclude<LegMode, "NONE">, string> = { WALK: "WALKING", TRANSIT: "TRANSIT", DRIVE: "DRIVING" };

export async function clientRoute(o: {
  origin: { lat: number; lng: number; placeId?: string };
  destination: { lat: number; lng: number; placeId?: string };
  mode: Exclude<LegMode, "NONE">;
  departureTime?: string;
}): Promise<RouteResult> {
  const mode = o.mode;
  try {
    await loadMaps();
    const { DirectionsService, TravelMode } = (await google.maps.importLibrary("routes")) as google.maps.RoutesLibrary;
    const wp = (p: { lat: number; lng: number; placeId?: string }) => (p.placeId ? { placeId: p.placeId } : { lat: p.lat, lng: p.lng });
    const dep = o.departureTime ? new Date(o.departureTime) : undefined;
    const future = dep && +dep > Date.now() + 60_000 ? dep : undefined;
    const req: google.maps.DirectionsRequest = {
      origin: wp(o.origin),
      destination: wp(o.destination),
      travelMode: TravelMode[TM[mode] as keyof typeof TravelMode],
      region: "hk",
      unitSystem: google.maps.UnitSystem.METRIC,
    };
    if (mode === "TRANSIT" && future) req.transitOptions = { departureTime: future };
    if (mode === "DRIVE" && future) req.drivingOptions = { departureTime: future };
    let res: google.maps.DirectionsResult;
    try {
      res = await new DirectionsService().route(req);
    } catch (e) {
      const code = (e as { code?: string }).code ?? String((e as Error).message);
      if (/ZERO_RESULTS|NOT_FOUND/.test(code)) return { status: "unsupported", mode, message: "Google 이 이 구간의 경로를 제공하지 않습니다", fetchedAt: Date.now() };
      throw e;
    }
    const route = res.routes?.[0];
    const leg = route?.legs?.[0];
    if (!route || !leg) return { status: "unsupported", mode, message: "Google 이 이 구간의 경로를 제공하지 않습니다", fetchedAt: Date.now() };
    const steps: RouteStep[] = leg.steps.map((s) => {
      const step: RouteStep = {
        mode: s.travel_mode === "TRANSIT" ? "TRANSIT" : s.travel_mode === "DRIVING" ? "DRIVE" : "WALK",
        polyline: s.polyline?.points ?? s.encoded_lat_lngs,
        durationSec: s.duration?.value,
        distanceM: s.distance?.value,
        instruction: s.instructions?.replace(/<[^>]+>/g, ""),
      };
      const t = s.transit;
      if (t) {
        step.vehicle = t.line?.vehicle?.type;
        step.lineName = t.line?.short_name || t.line?.name;
        step.lineColor = t.line?.color;
        step.headsign = t.headsign;
        step.departureStop = t.departure_stop?.name;
        step.arrivalStop = t.arrival_stop?.name;
        step.departureTime = t.departure_time?.value ? new Date(t.departure_time.value).toISOString() : undefined;
        step.arrivalTime = t.arrival_time?.value ? new Date(t.arrival_time.value).toISOString() : undefined;
        step.stopCount = t.num_stops;
      }
      return step;
    });
    const poly = route.overview_polyline as unknown as string | { points?: string } | undefined;
    return {
      status: "ok",
      mode,
      durationSec: leg.duration?.value,
      distanceM: leg.distance?.value,
      polyline: typeof poly === "string" ? poly : poly?.points,
      steps,
      fetchedAt: Date.now(),
    };
  } catch (e) {
    return { status: "error", mode, message: (e as Error).message, fetchedAt: Date.now() };
  }
}
