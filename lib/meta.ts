import type { Category, ExpenseCategory, LegMode } from "./types";

export const CATEGORY: Record<Category, { label: string; icon: string; color: string; bg: string }> = {
  hotel: { label: "숙소", icon: "🏨", color: "#5A6B8C", bg: "#E8ECF4" },
  airport: { label: "공항", icon: "✈️", color: "#4C6EA8", bg: "#E3EBF8" },
  sight: { label: "관광지", icon: "🏛️", color: "#3B7FBF", bg: "#E1EEFA" },
  food: { label: "맛집", icon: "🍜", color: "#D9785B", bg: "#FBEAE3" },
  cafe: { label: "카페", icon: "☕", color: "#A9825A", bg: "#F4ECE2" },
  shopping: { label: "쇼핑", icon: "🛍️", color: "#B46FA8", bg: "#F5E8F3" },
  photo: { label: "사진 명소", icon: "📸", color: "#4D9C94", bg: "#E1F2F0" },
  transport: { label: "교통", icon: "🚉", color: "#6B7488", bg: "#ECEEF2" },
  theme: { label: "테마파크", icon: "🏰", color: "#7C6CC9", bg: "#ECE9FA" },
  event: { label: "일정", icon: "📌", color: "#5089D8", bg: "#E2EDFB" },
};

export const LEG_MODE: Record<LegMode, { label: string; icon: string; gmaps?: "walking" | "transit" | "driving" }> = {
  WALK: { label: "도보", icon: "🚶", gmaps: "walking" },
  TRANSIT: { label: "대중교통", icon: "🚇", gmaps: "transit" },
  DRIVE: { label: "택시·자동차", icon: "🚕", gmaps: "driving" },
  NONE: { label: "이동 없음", icon: "•" },
};

export const VEHICLE: Record<string, { label: string; icon: string; color: string }> = {
  SUBWAY: { label: "MTR", icon: "🚇", color: "#C8102E" },
  METRO_RAIL: { label: "MTR", icon: "🚇", color: "#C8102E" },
  HEAVY_RAIL: { label: "철도", icon: "🚆", color: "#00888A" },
  COMMUTER_TRAIN: { label: "철도", icon: "🚆", color: "#00888A" },
  HIGH_SPEED_TRAIN: { label: "고속철", icon: "🚄", color: "#00888A" },
  RAIL: { label: "철도", icon: "🚆", color: "#00888A" },
  BUS: { label: "버스", icon: "🚌", color: "#E28A1F" },
  INTERCITY_BUS: { label: "버스", icon: "🚌", color: "#E28A1F" },
  TROLLEYBUS: { label: "버스", icon: "🚌", color: "#E28A1F" },
  SHARE_TAXI: { label: "미니버스", icon: "🚐", color: "#2E9E5B" },
  FERRY: { label: "페리", icon: "⛴️", color: "#1E7BC4" },
  TRAM: { label: "트램", icon: "🚋", color: "#2E8B57" },
  LIGHT_RAIL: { label: "경전철", icon: "🚈", color: "#D9A400" },
  FUNICULAR: { label: "피크트램", icon: "🚠", color: "#8B3A3A" },
  CABLE_CAR: { label: "케이블카", icon: "🚡", color: "#8B3A3A" },
  GONDOLA_LIFT: { label: "케이블카", icon: "🚡", color: "#8B3A3A" },
  MONORAIL: { label: "모노레일", icon: "🚝", color: "#C8102E" },
};
export const vehicleMeta = (v?: string) => VEHICLE[v ?? ""] ?? { label: "대중교통", icon: "🚍", color: "#5089D8" };

export const DAY_COLORS = ["#5089D8", "#E07A5F", "#3D9A8B", "#8E6CC9", "#D9A43B"];

export const EXPENSE_CAT: Record<ExpenseCategory, { label: string; icon: string }> = {
  food: { label: "식비", icon: "🍜" },
  transport: { label: "교통비", icon: "🚇" },
  ticket: { label: "입장료", icon: "🎟️" },
  shopping: { label: "쇼핑비", icon: "🛍️" },
  hotel: { label: "숙박", icon: "🏨" },
  etc: { label: "기타", icon: "💡" },
};
