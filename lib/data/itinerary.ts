import type { DayPlan, ItineraryItem } from "../types";

let n = 0;
const it = (p: Omit<ItineraryItem, "id">): ItineraryItem => ({ id: `seed-${++n}`, ...p });

export const TRIP = {
  title: "Hong Kong Trip 2026",
  start: "2026-12-01",
  end: "2026-12-05",
  nights: 4,
  days: 5,
  hotelKey: "hotel",
  flights: {
    outbound: { label: "입국", depart: "08:55 (서울 출발)", arrive: "12/1 12:05 홍콩 국제공항 도착" },
    inbound: { label: "귀국", depart: "12/5 16:40 홍콩 국제공항 출발", arrive: "21:05 서울 도착" },
  },
  /** 귀국일 공항 도착 목표 시각 */
  airportDeadline: { date: "2026-12-05", time: "13:30" },
};

export function buildInitialDays(): DayPlan[] {
  n = 0;
  return [
    {
      date: "2026-12-01",
      title: "DAY 1",
      theme: "홍콩 도착 및 완차이·코즈웨이베이 관광",
      items: [
        it({ time: "12:05", stay: 85, activity: "도착 · 입국 심사", placeKey: "hkia", legMode: "NONE", fixed: true }),
        it({ time: "13:30", stay: 0, activity: "입국 후 시내 이동", placeKey: "hkia", legMode: "TRANSIT", legNote: "A11 공항버스" }),
        it({ time: "14:30", stay: 30, activity: "체크인 및 짐 보관", placeKey: "hotel", legMode: "WALK" }),
        it({ time: "15:00", stay: 50, activity: "홍콩식 식사", placeKey: "wasoCafe", legMode: "WALK" }),
        it({ time: "16:00", stay: 30, activity: "사진 촬영", placeKey: "blueHouse", legMode: "WALK" }),
        it({ time: "16:40", stay: 40, activity: "거리 관광", placeKey: "leeTung", legMode: "WALK" }),
        it({ time: "17:30", stay: 50, activity: "쇼핑", placeKey: "timesSquare", legMode: "WALK" }),
        it({ time: "18:30", stay: 50, activity: "저녁 식사", placeKey: "causewayBay", legMode: "WALK" }),
        it({ time: "19:30", stay: 50, activity: "거리 구경", placeKey: "sogo", legMode: "TRANSIT", legNote: "트램 또는 도보" }),
        it({ time: "20:30", stay: 0, activity: "호텔 복귀", placeKey: "hotel", legMode: "NONE" }),
      ],
    },
    {
      date: "2026-12-02",
      title: "DAY 2",
      theme: "센트럴 관광과 빅토리아 피크 야경",
      items: [
        it({ time: "09:30", stay: 0, activity: "출발", placeKey: "hotel", legMode: "TRANSIT", legNote: "MTR" }),
        it({ time: "10:00", stay: 30, activity: "사진 촬영", placeKey: "pottinger", legMode: "WALK" }),
        it({ time: "10:40", stay: 40, activity: "에스컬레이터 관광", placeKey: "escalator", legMode: "WALK" }),
        it({ time: "11:30", stay: 50, activity: "점심 — 완탕면", placeKey: "maksNoodle", legMode: "WALK" }),
        it({ time: "12:30", stay: 80, activity: "관광", placeKey: "taiKwun", legMode: "WALK" }),
        it({ time: "14:00", stay: 50, activity: "쇼핑 및 구경", placeKey: "pmq", legMode: "WALK" }),
        it({ time: "15:00", stay: 45, activity: "카페", placeKey: "soho", legMode: "WALK" }),
        it({ time: "16:00", stay: 20, activity: "피크트램 탑승", placeKey: "peakTramLower", legMode: "TRANSIT", legNote: "피크트램" }),
        it({ time: "17:00", stay: 130, activity: "일몰·야경", placeKey: "victoriaPeak", legMode: "TRANSIT", legNote: "피크트램 또는 버스" }),
        it({ time: "19:30", stay: 75, activity: "저녁 식사", placeKey: "central", legMode: "TRANSIT", legNote: "MTR" }),
        it({ time: "21:00", stay: 0, activity: "호텔 복귀", placeKey: "hotel", legMode: "NONE" }),
      ],
    },
    {
      date: "2026-12-03",
      title: "DAY 3",
      theme: "학회 및 침사추이 야경",
      items: [
        it({ time: "09:00", stay: 450, activity: "학회 참석", placeKey: "hotel", legMode: "NONE", timeNote: "학회 종료 예상 16:00~17:00" }),
        it({ time: "16:30", stay: 20, activity: "학회 종료 및 휴식", placeKey: "hotel", legMode: "WALK", timeNote: "학회 종료 시간에 맞춰 이후 일정 일괄 이동 가능" }),
        it({ time: "17:00", stay: 20, activity: "선착장 이동", placeKey: "wanChaiPier", legMode: "TRANSIT", legNote: "스타페리 (침사추이행)", timeNote: "페리 시간표 공식 확인" }),
        it({ time: "17:45", stay: 20, activity: "사진 촬영", placeKey: "clockTower", legMode: "WALK" }),
        it({ time: "18:10", stay: 45, activity: "하버 야경", placeKey: "avenueOfStars", legMode: "WALK" }),
        it({ time: "19:00", stay: 55, activity: "저녁 식사", placeKey: "tst", legMode: "WALK" }),
        it({ time: "20:00", stay: 50, activity: "구경", placeKey: "k11", legMode: "WALK" }),
        it({ time: "21:00", stay: 5, activity: "페리로 복귀", placeKey: "tstPier", legMode: "TRANSIT", legNote: "스타페리 또는 MTR" }),
        it({ time: "21:30", stay: 0, activity: "호텔 도착", placeKey: "hotel", legMode: "NONE" }),
      ],
    },
    {
      date: "2026-12-04",
      title: "DAY 4",
      theme: "홍콩 디즈니랜드",
      items: [
        it({ time: "08:30", stay: 0, activity: "출발", placeKey: "hotel", legMode: "TRANSIT", legNote: "완차이 → 센트럴/홍콩역 → 써니베이 → 디즈니랜드 리조트" }),
        it({ time: "09:30", stay: 15, activity: "도착", placeKey: "disneyStation", legMode: "WALK" }),
        it({ time: "10:00", stay: 140, activity: "겨울왕국 — 개장 직후 방문", placeKey: "worldOfFrozen", legMode: "WALK", timeNote: "실제 개장 시간 공식 확인 후 수정" }),
        it({ time: "12:30", stay: 60, activity: "점심", placeKey: "disneyland", legMode: "WALK" }),
        it({ time: "13:30", stay: 120, activity: "놀이기구", placeKey: "mysticManor", legMode: "WALK" }),
        it({ time: "16:00", stay: 90, activity: "사진 촬영", placeKey: "castle", legMode: "WALK" }),
        it({ time: "18:00", stay: 90, activity: "저녁 및 쇼핑", placeKey: "disneyland", legMode: "WALK" }),
        it({ time: "20:00", stay: 30, activity: "야간 공연", placeKey: "castle", legMode: "TRANSIT", timeNote: "공연 시간 공식 확인 후 수정" }),
        it({ time: "21:00", stay: 0, activity: "공연 후 호텔 복귀", placeKey: "hotel", legMode: "NONE", timeNote: "공연 종료 시각에 따라 조정" }),
      ],
    },
    {
      date: "2026-12-05",
      title: "DAY 5",
      theme: "마지막 아침 및 귀국",
      items: [
        it({ time: "09:00", stay: 50, activity: "아침 식사", placeKey: "wanChai", legMode: "WALK" }),
        it({ time: "10:00", stay: 80, activity: "기념품 쇼핑", placeKey: "wanChai", legMode: "WALK" }),
        it({ time: "11:30", stay: 20, activity: "짐 찾기", placeKey: "hotel", legMode: "NONE" }),
        it({ time: "12:00", stay: 0, activity: "공항 출발", placeKey: "hotel", legMode: "TRANSIT", legNote: "A11 공항버스 또는 공항철도(AEL)" }),
        it({ time: "13:30", stay: 180, activity: "체크인 (공항 도착 목표)", placeKey: "hkia", legMode: "NONE", deadline: true, fixed: true }),
        it({ time: "16:40", stay: 0, activity: "출국", placeKey: "hkia", legMode: "NONE", fixed: true }),
        it({ time: "21:05", stay: 0, activity: "서울 도착", placeKey: "seoul", legMode: "NONE", fixed: true }),
      ],
    },
  ];
}

export const INITIAL_CHECKLIST = [
  "여권",
  "항공권",
  "숙소 예약",
  "디즈니랜드 티켓",
  "옥토퍼스 카드",
  "eSIM",
  "보조배터리",
  "환전",
];
