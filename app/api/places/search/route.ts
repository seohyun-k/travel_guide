import { noKey, searchText, serverKey, toResolved } from "@/lib/server/google";
import { inHK } from "@/lib/geo";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!serverKey()) return noKey();
  const q = new URL(req.url).searchParams.get("q")?.slice(0, 200).trim();
  if (!q) return Response.json({ results: [] });
  try {
    const places = await searchText(`${q} Hong Kong`, 8);
    const results = places
      .map((p) => toResolved(p))
      .filter((r) => r.lat != null && r.lng != null && inHK({ lat: r.lat!, lng: r.lng! }));
    return Response.json({ results });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
