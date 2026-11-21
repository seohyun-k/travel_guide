export const dynamic = "force-dynamic";
export function GET() {
  const server = !!process.env.GOOGLE_MAPS_SERVER_KEY;
  return Response.json({ places: server, routes: server });
}
