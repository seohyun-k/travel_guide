export const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
export const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";
/** 정적 배포(GitHub Pages 등) 빌드 여부 — 서버 API 없음 */
export const STATIC_BUILD = process.env.NEXT_PUBLIC_STATIC === "1";
/** 하위 경로 배포 시 경로 접두사 (예: /travel_guide) */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
