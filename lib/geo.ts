export interface LatLng {
  lat: number;
  lng: number;
}

/** Google Encoded Polyline 디코더 */
export function decodePolyline(str: string): LatLng[] {
  let index = 0, lat = 0, lng = 0;
  const out: LatLng[] = [];
  while (index < str.length) {
    let b, shift = 0, result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    out.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return out;
}

export function haversine(a: LatLng, b: LatLng) {
  const R = 6371000;
  const r = (x: number) => (x * Math.PI) / 180;
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function fmtDistance(m?: number) {
  if (m == null) return "확인 필요";
  return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)}km`;
}

type GTravel = "walking" | "transit" | "driving";

/** Google Maps 길찾기 URL (Maps URLs API). origin 생략 시 현재 위치에서 출발 */
export function gmapsDirUrl(opts: {
  dest: { lat?: number; lng?: number; query?: string; placeId?: string };
  origin?: { lat?: number; lng?: number; query?: string; placeId?: string };
  mode?: GTravel;
}) {
  const p = new URLSearchParams({ api: "1" });
  const fmt = (x: { lat?: number; lng?: number; query?: string }) =>
    x.lat != null && x.lng != null ? `${x.lat},${x.lng}` : x.query ?? "";
  p.set("destination", fmt(opts.dest));
  if (opts.dest.placeId) p.set("destination_place_id", opts.dest.placeId);
  if (opts.origin) {
    p.set("origin", fmt(opts.origin));
    if (opts.origin.placeId) p.set("origin_place_id", opts.origin.placeId);
  }
  if (opts.mode) p.set("travelmode", opts.mode);
  return `https://www.google.com/maps/dir/?${p.toString()}`;
}

export function gmapsSearchUrl(q: { lat?: number; lng?: number; query?: string; placeId?: string }) {
  const p = new URLSearchParams({ api: "1" });
  p.set("query", q.query ?? (q.lat != null ? `${q.lat},${q.lng}` : ""));
  if (q.placeId) p.set("query_place_id", q.placeId);
  return `https://www.google.com/maps/search/?${p.toString()}`;
}

/** 홍콩 영역 (검증용 대략적 경계) */
export const HK_BOUNDS = { south: 22.13, north: 22.58, west: 113.82, east: 114.45 };
export const inHK = (p: LatLng) =>
  p.lat > HK_BOUNDS.south && p.lat < HK_BOUNDS.north && p.lng > HK_BOUNDS.west && p.lng < HK_BOUNDS.east;
