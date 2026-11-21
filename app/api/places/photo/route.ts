import { noKey, serverKey } from "@/lib/server/google";

export const dynamic = "force-dynamic";

/** Places 사진 프록시 — 서버 키를 노출하지 않고 사진 URL 로 리다이렉트 */
export async function GET(req: Request) {
  if (!serverKey()) return noKey();
  const sp = new URL(req.url).searchParams;
  const name = sp.get("name") ?? "";
  const w = Math.min(1200, Math.max(100, Number(sp.get("w")) || 600));
  if (!/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(name)) {
    return Response.json({ error: "잘못된 사진 이름" }, { status: 400 });
  }
  const res = await fetch(
    `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${w}&skipHttpRedirect=true&key=${serverKey()}`,
    { cache: "no-store" },
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.photoUri) return Response.json({ error: "사진을 가져올 수 없습니다" }, { status: 502 });
  return new Response(null, {
    status: 302,
    headers: { Location: json.photoUri, "Cache-Control": "public, max-age=86400" },
  });
}
