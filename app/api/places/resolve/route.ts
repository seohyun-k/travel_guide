import { noKey, placeDetails, searchText, serverKey, toResolved } from "@/lib/server/google";
import type { ResolvedPlace } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!serverKey()) return noKey();
  const body = (await req.json().catch(() => ({}))) as { query?: string; placeId?: string; expectArea?: string[] };
  const query = (body.query ?? "").slice(0, 200);
  try {
    if (body.placeId) {
      if (!/^[A-Za-z0-9_-]{10,300}$/.test(body.placeId)) return Response.json({ error: "잘못된 Place ID" }, { status: 400 });
      return Response.json(toResolved(await placeDetails(body.placeId), body.expectArea));
    }
    if (!query) return Response.json({ error: "query 필요" }, { status: 400 });
    const places = await searchText(query, 5);
    if (!places.length) {
      const r: ResolvedPlace = { status: "not_found", message: "Google Places 에서 장소를 찾지 못했습니다", checkedAt: Date.now() };
      return Response.json(r);
    }
    // 홍콩 영역 + 예상 지역이 일치하는 결과 우선
    const candidates = places.map((p) => toResolved(p, body.expectArea));
    const best = candidates.find((c) => c.status === "ok") ?? candidates[0];
    return Response.json(best);
  } catch (e) {
    const r: ResolvedPlace = { status: "error", message: (e as Error).message, checkedAt: Date.now() };
    return Response.json(r, { status: 502 });
  }
}
