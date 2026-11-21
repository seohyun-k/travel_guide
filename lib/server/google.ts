import "server-only";
import { HK_BOUNDS, inHK } from "../geo";
import type { ResolvedPlace } from "../types";

export const serverKey = () => process.env.GOOGLE_MAPS_SERVER_KEY || "";

const PLACE_FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "googleMapsUri",
  "websiteUri",
  "regularOpeningHours",
  "businessStatus",
  "rating",
  "userRatingCount",
  "photos",
  "priceLevel",
];

const WD = ["일", "월", "화", "수", "목", "금", "토"];
const pad = (n: number) => String(n).padStart(2, "0");

interface Period {
  open?: { day: number; hour: number; minute: number };
  close?: { day: number; hour: number; minute: number };
}

/** regularOpeningHours.periods → 한국어 요일별 영업시간 */
export function formatHours(hours?: { periods?: Period[] }): string[] | undefined {
  const periods = hours?.periods;
  if (!periods?.length) return undefined;
  if (periods.length === 1 && periods[0].open && !periods[0].close) return ["매일 24시간 영업"];
  const byDay: Record<number, string[]> = {};
  for (const p of periods) {
    if (!p.open) continue;
    const s = `${pad(p.open.hour ?? 0)}:${pad(p.open.minute ?? 0)}`;
    const e = p.close ? `${pad(p.close.hour ?? 0)}:${pad(p.close.minute ?? 0)}` : "";
    (byDay[p.open.day] ??= []).push(e ? `${s}–${e}` : `${s}~`);
  }
  return [1, 2, 3, 4, 5, 6, 0].map((d) => `${WD[d]}  ${byDay[d]?.join(", ") ?? "휴무"}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toResolved(p: any, expectArea?: string[]): ResolvedPlace {
  const loc = p.location ? { lat: p.location.latitude, lng: p.location.longitude } : undefined;
  const hay = `${p.formattedAddress ?? ""} ${p.displayName?.text ?? ""}`.toLowerCase();
  const areaOk = !expectArea?.length || expectArea.some((a) => hay.includes(a.toLowerCase()));
  const hkOk = loc ? inHK(loc) : false;
  const photo = p.photos?.[0];
  let status: ResolvedPlace["status"] = "ok";
  let message: string | undefined;
  if (!hkOk) {
    status = "mismatch";
    message = "검색 결과가 홍콩 영역 밖입니다";
  } else if (!areaOk) {
    status = "mismatch";
    message = `주소 대조 필요 (예상 지역: ${expectArea?.join(", ")})`;
  }
  if (p.businessStatus === "CLOSED_PERMANENTLY") message = "Google 기준 폐업으로 표시됨";
  if (p.businessStatus === "CLOSED_TEMPORARILY") message = "Google 기준 임시 휴업으로 표시됨";
  return {
    status,
    message,
    placeId: p.id,
    name: p.displayName?.text,
    address: p.formattedAddress,
    lat: loc?.lat,
    lng: loc?.lng,
    googleMapsUri: p.googleMapsUri,
    websiteUri: p.websiteUri,
    openingHours: formatHours(p.regularOpeningHours),
    businessStatus: p.businessStatus,
    rating: p.rating,
    ratingCount: p.userRatingCount,
    photoName: photo?.name,
    photoAttribution: photo?.authorAttributions?.[0]?.displayName,
    priceLevel: p.priceLevel,
    checkedAt: Date.now(),
  };
}

export async function searchText(textQuery: string, max = 5) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": serverKey(),
      "X-Goog-FieldMask": PLACE_FIELDS.map((f) => `places.${f}`).join(","),
    },
    body: JSON.stringify({
      textQuery,
      languageCode: "en",
      regionCode: "HK",
      pageSize: max,
      locationBias: {
        rectangle: {
          low: { latitude: HK_BOUNDS.south, longitude: HK_BOUNDS.west },
          high: { latitude: HK_BOUNDS.north, longitude: HK_BOUNDS.east },
        },
      },
    }),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `Places API 오류 (${res.status})`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (json.places ?? []) as any[];
}

export async function placeDetails(placeId: string) {
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=en`, {
    headers: { "X-Goog-Api-Key": serverKey(), "X-Goog-FieldMask": PLACE_FIELDS.join(",") },
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `Places API 오류 (${res.status})`);
  return json;
}

export const noKey = () =>
  Response.json({ error: "GOOGLE_MAPS_SERVER_KEY 가 설정되지 않았습니다" }, { status: 503 });
