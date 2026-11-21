import type { MetadataRoute } from "next";

const B = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hong Kong Trip 2026 · 홍콩 여행 플래너",
    short_name: "HK Trip",
    description: "홍콩 4박 5일 일정·지도·경로 플래너",
    start_url: `${B}/`,
    scope: `${B}/`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#FBF8F2",
    theme_color: "#FBF8F2",
    lang: "ko",
    icons: [
      { src: B + "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: B + "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: B + "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
