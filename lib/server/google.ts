import "server-only";
import { HK_BOUNDS } from "../geo";
export { toResolved, formatHours } from "../places-shared";

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
