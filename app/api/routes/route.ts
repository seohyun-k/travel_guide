import { noKey, serverKey } from "@/lib/server/google";
import { inHK } from "@/lib/geo";
import type { RouteResult, RouteStep } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Pt { lat: number; lng: number; placeId?: string }

const FIELD_MASK = [
  "routes.duration",
  "routes.distanceMeters",
  "routes.polyline.encodedPolyline",
  "routes.legs.steps.travelMode",
  "routes.legs.steps.polyline.encodedPolyline",
  "routes.legs.steps.staticDuration",
  "routes.legs.steps.distanceMeters",
  "routes.legs.steps.transitDetails",
  "routes.legs.steps.navigationInstruction.instructions",
].join(",");

const sec = (d?: string) => (d ? Number(String(d).replace("s", "")) : undefined);

const wp = (p: Pt) =>
  p.placeId ? { placeId: p.placeId } : { location: { latLng: { latitude: p.lat, longitude: p.lng } } };

export async function POST(req: Request) {
  if (!serverKey()) return noKey();
  const body = (await req.json().catch(() => ({}))) as {
    origin?: Pt; destination?: Pt; mode?: "WALK" | "TRANSIT" | "DRIVE"; departureTime?: string;
  };
  const { origin, destination, mode } = body;
  if (!origin || !destination || !mode || !["WALK", "TRANSIT", "DRIVE"].includes(mode)) {
    return Response.json({ error: "origin, destination, mode 필요" }, { status: 400 });
  }
  // 홍콩 내 요청만 허용 (서버 키 남용 방지)
  if (!inHK(origin) || !inHK(destination)) {
    return Response.json({ error: "홍콩 영역 밖 좌표" }, { status: 400 });
  }

  const reqBody: Record<string, unknown> = {
    origin: wp(origin),
    destination: wp(destination),
    travelMode: mode,
    languageCode: "ko",
    regionCode: "HK",
    units: "METRIC",
  };
  if (mode === "DRIVE") reqBody.routingPreference = "TRAFFIC_UNAWARE";
  if (body.departureTime && mode !== "WALK") {
    const t = new Date(body.departureTime);
    // 과거 시각은 API 가 거부할 수 있으므로 현재 시각 기준으로 계산
    if (!isNaN(+t) && +t > Date.now() + 60_000) reqBody.departureTime = t.toISOString();
  }

  try {
    const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": serverKey(), "X-Goog-FieldMask": FIELD_MASK },
      body: JSON.stringify(reqBody),
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) {
      const r: RouteResult = { status: "error", mode, message: json?.error?.message || `Routes API 오류 (${res.status})`, fetchedAt: Date.now() };
      return Response.json(r, { status: 502 });
    }
    const route = json.routes?.[0];
    if (!route) {
      const r: RouteResult = { status: "unsupported", mode, message: "Google 이 이 구간의 경로를 제공하지 않습니다", fetchedAt: Date.now() };
      return Response.json(r);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const steps: RouteStep[] = (route.legs?.[0]?.steps ?? []).map((s: any) => {
      const td = s.transitDetails;
      const step: RouteStep = {
        mode: s.travelMode === "TRANSIT" ? "TRANSIT" : s.travelMode === "DRIVE" ? "DRIVE" : "WALK",
        polyline: s.polyline?.encodedPolyline,
        durationSec: sec(s.staticDuration),
        distanceM: s.distanceMeters,
        instruction: s.navigationInstruction?.instructions,
      };
      if (td) {
        step.vehicle = td.transitLine?.vehicle?.type;
        step.lineName = td.transitLine?.nameShort || td.transitLine?.name;
        step.lineColor = td.transitLine?.color;
        step.headsign = td.headsign;
        step.departureStop = td.stopDetails?.departureStop?.name;
        step.arrivalStop = td.stopDetails?.arrivalStop?.name;
        step.departureTime = td.stopDetails?.departureTime;
        step.arrivalTime = td.stopDetails?.arrivalTime;
        step.stopCount = td.stopCount;
      }
      return step;
    });
    const r: RouteResult = {
      status: "ok",
      mode,
      durationSec: sec(route.duration),
      distanceM: route.distanceMeters,
      polyline: route.polyline?.encodedPolyline,
      steps,
      fetchedAt: Date.now(),
    };
    return Response.json(r);
  } catch (e) {
    const r: RouteResult = { status: "error", mode, message: (e as Error).message, fetchedAt: Date.now() };
    return Response.json(r, { status: 502 });
  }
}
