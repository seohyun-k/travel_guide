export type Category =
  | "hotel"
  | "airport"
  | "sight"
  | "food"
  | "cafe"
  | "shopping"
  | "photo"
  | "transport"
  | "theme"
  | "event";

/** 다음 장소까지의 이동수단. NONE = 같은 장소 / 이동 없음 */
export type LegMode = "WALK" | "TRANSIT" | "DRIVE" | "NONE";

/** 정적 가이드 정보 (Google API로 검증되지 않는 큐레이션 콘텐츠) */
export interface PlaceGuide {
  highlights?: string[];
  photoSpots?: string[];
  menu?: string[];
  mealCost?: string;
  cost?: string;
  bestTime?: string;
  recommendedStay?: string;
  tips?: string[];
  officialUrl?: string;
}

export interface Place {
  /** 앱 내부 고유 키 */
  key: string;
  nameKo: string;
  nameEn: string;
  category: Category;
  /** Google Places Text Search 에 사용할 검색어 */
  query?: string;
  /** 주소 대조용 지역 키워드 (예: "Wan Chai") */
  expectArea?: string[];
  /** 사용자가 알려준 주소 등 참고 주소 (검증 전) */
  refAddress?: string;
  /** 근사 좌표 — API 키 없을 때 샘플 지도용. Google 검증 좌표가 아님 */
  approx?: { lat: number; lng: number };
  /** 지역(동네) 단위 장소인 경우 true — 특정 식당/가게가 아님 */
  isArea?: boolean;
  /** 지도에 표시하지 않는 장소 (예: 서울 도착) */
  noMap?: boolean;
  /** 사용자가 검색으로 추가한 장소인 경우 Places에서 받은 Place ID */
  placeId?: string;
  guide?: PlaceGuide;
  description?: string;
}

/** Google Places API 로 확인된 정보 */
export interface ResolvedPlace {
  status: "ok" | "not_found" | "mismatch" | "error";
  placeId?: string;
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
  googleMapsUri?: string;
  websiteUri?: string;
  openingHours?: string[];
  businessStatus?: string;
  rating?: number;
  ratingCount?: number;
  photoName?: string;
  photoAttribution?: string;
  priceLevel?: string;
  message?: string;
  checkedAt: number;
}

export interface ItineraryItem {
  id: string;
  /** "HH:MM" 홍콩 현지시간 */
  time: string;
  /** 체류 시간(분) */
  stay: number;
  /** 활동 설명 */
  activity: string;
  placeKey: string | null;
  /** 다음 일정까지 이동수단 */
  legMode: LegMode;
  /** 이동 설명 (예: "A11 공항버스") — 실제 경로는 API 결과 사용 */
  legNote?: string;
  /** 시간이 확정되지 않은 경우 안내 (예: "개장 시간 공식 확인 필요") */
  timeNote?: string;
  /** 고정 시각 (예: 항공편) — 일괄 시간 이동 시 움직이지 않음 */
  fixed?: boolean;
  /** 마감 기한 (예: 공항 도착 목표) */
  deadline?: boolean;
  memo?: string;
}

export interface DayPlan {
  date: string; // YYYY-MM-DD
  title: string;
  theme: string;
  items: ItineraryItem[];
}

export type RouteStatus = "ok" | "unsupported" | "error" | "nokey";

export interface RouteStep {
  mode: "WALK" | "TRANSIT" | "DRIVE";
  polyline?: string;
  durationSec?: number;
  distanceM?: number;
  vehicle?: string; // SUBWAY, BUS, FERRY, TRAM, FUNICULAR ...
  lineName?: string;
  lineColor?: string;
  headsign?: string;
  departureStop?: string;
  arrivalStop?: string;
  departureTime?: string;
  arrivalTime?: string;
  stopCount?: number;
  instruction?: string;
}

export interface RouteResult {
  status: RouteStatus;
  mode: LegMode;
  durationSec?: number;
  distanceM?: number;
  polyline?: string;
  steps?: RouteStep[];
  message?: string;
  fetchedAt: number;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export type ExpenseCategory = "food" | "transport" | "ticket" | "shopping" | "hotel" | "etc";

export interface Expense {
  id: string;
  date: string;
  title: string;
  category: ExpenseCategory;
  amountHKD: number;
  kind: "planned" | "actual";
}
