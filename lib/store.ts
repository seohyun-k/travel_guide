"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { buildInitialDays, INITIAL_CHECKLIST } from "./data/itinerary";
import { PLACES } from "./data/places";
import { toHHMM, toMin } from "./time";
import type { ChecklistItem, DayPlan, Expense, ItineraryItem, Place, ResolvedPlace, RouteResult } from "./types";

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export interface TripState {
  days: DayPlan[];
  /** 사용자가 검색으로 추가한 장소 */
  customPlaces: Record<string, Place>;
  /** Places API 검증 결과 캐시 (key → 결과) */
  resolved: Record<string, ResolvedPlace>;
  /** 경로 캐시 */
  routes: Record<string, RouteResult>;
  favorites: string[];
  checklist: ChecklistItem[];
  expenses: Expense[];
  rateKRW: number;
  rateUpdatedAt?: number;
  rateSource?: string;

  // UI (저장 안 함)
  selectedDay: number;
  selectedItemId: string | null;
  overview: boolean;

  setSelectedDay: (i: number) => void;
  selectItem: (id: string | null) => void;
  setOverview: (v: boolean) => void;

  updateItem: (day: number, id: string, patch: Partial<ItineraryItem>) => void;
  addItem: (day: number, item: Omit<ItineraryItem, "id">, index?: number) => void;
  removeItem: (day: number, id: string) => void;
  reorder: (day: number, from: number, to: number) => void;
  moveItemToDay: (from: number, id: string, to: number) => void;
  swapDays: (a: number, b: number) => void;
  shiftAfter: (day: number, id: string, minutes: number, inclusive?: boolean) => void;
  sortByTime: (day: number) => void;
  setDayTheme: (day: number, theme: string) => void;
  resetDay: (day: number) => void;
  resetAll: () => void;

  addCustomPlace: (p: Place, r?: ResolvedPlace) => void;
  setResolved: (key: string, r: ResolvedPlace) => void;
  clearResolved: () => void;
  setRoute: (key: string, r: RouteResult) => void;
  clearRoutes: () => void;

  toggleFavorite: (key: string) => void;
  toggleCheck: (id: string) => void;
  addCheck: (label: string) => void;
  removeCheck: (id: string) => void;
  addExpense: (e: Omit<Expense, "id">) => void;
  updateExpense: (id: string, patch: Partial<Expense>) => void;
  removeExpense: (id: string) => void;
  setRate: (rate: number, source?: string) => void;

  importData: (json: unknown) => void;
}

const initialData = () => ({
  days: buildInitialDays(),
  customPlaces: {} as Record<string, Place>,
  favorites: [] as string[],
  checklist: INITIAL_CHECKLIST.map((label) => ({ id: uid(), label, done: false })),
  expenses: [] as Expense[],
  // 기본 환율은 참고용 기본값 — 설정에서 직접 수정하거나 최신 환율을 불러올 것
  rateKRW: 185,
  rateSource: "기본값(직접 수정 필요)",
});

const mapDay = (days: DayPlan[], i: number, fn: (d: DayPlan) => DayPlan) => days.map((d, k) => (k === i ? fn(d) : d));

export const useTrip = create<TripState>()(
  persist(
    (set, get) => ({
      ...initialData(),
      resolved: {},
      routes: {},
      selectedDay: 0,
      selectedItemId: null,
      overview: false,

      setSelectedDay: (i) => set({ selectedDay: i, selectedItemId: null, overview: false }),
      selectItem: (id) => set({ selectedItemId: id }),
      setOverview: (v) => set({ overview: v, selectedItemId: null }),

      updateItem: (day, id, patch) =>
        set((s) => ({ days: mapDay(s.days, day, (d) => ({ ...d, items: d.items.map((x) => (x.id === id ? { ...x, ...patch } : x)) })) })),
      addItem: (day, item, index) =>
        set((s) => ({
          days: mapDay(s.days, day, (d) => {
            const items = [...d.items];
            const newItem = { ...item, id: uid() };
            if (index == null) {
              // 시간 순서에 맞게 삽입
              const pos = items.findIndex((x) => toMin(x.time) > toMin(item.time));
              items.splice(pos < 0 ? items.length : pos, 0, newItem);
            } else items.splice(index, 0, newItem);
            return { ...d, items };
          }),
        })),
      removeItem: (day, id) =>
        set((s) => ({
          days: mapDay(s.days, day, (d) => ({ ...d, items: d.items.filter((x) => x.id !== id) })),
          selectedItemId: s.selectedItemId === id ? null : s.selectedItemId,
        })),
      reorder: (day, from, to) =>
        set((s) => ({
          days: mapDay(s.days, day, (d) => {
            const items = [...d.items];
            const [m] = items.splice(from, 1);
            items.splice(to, 0, m);
            // 순서 변경 시 시간 슬롯은 유지: 고정되지 않은 일정에 기존 시각을 순서대로 다시 배정
            const slots = d.items.filter((x) => !x.fixed).map((x) => x.time);
            let k = 0;
            const retimed = items.map((x) => (x.fixed ? x : { ...x, time: slots[k++] }));
            return { ...d, items: retimed };
          }),
        })),
      moveItemToDay: (from, id, to) =>
        set((s) => {
          const item = s.days[from].items.find((x) => x.id === id);
          if (!item) return {};
          let days = mapDay(s.days, from, (d) => ({ ...d, items: d.items.filter((x) => x.id !== id) }));
          days = mapDay(days, to, (d) => {
            const items = [...d.items];
            const pos = items.findIndex((x) => toMin(x.time) > toMin(item.time));
            items.splice(pos < 0 ? items.length : pos, 0, item);
            return { ...d, items };
          });
          return { days, selectedItemId: null };
        }),
      swapDays: (a, b) =>
        set((s) => {
          const days = [...s.days];
          const A = days[a], B = days[b];
          // 날짜·DAY 번호는 그대로, 내용(테마·일정)만 교환
          days[a] = { ...A, theme: B.theme, items: B.items };
          days[b] = { ...B, theme: A.theme, items: A.items };
          return { days };
        }),
      shiftAfter: (day, id, minutes, inclusive = true) =>
        set((s) => ({
          days: mapDay(s.days, day, (d) => {
            const idx = d.items.findIndex((x) => x.id === id);
            return {
              ...d,
              items: d.items.map((x, i) =>
                (inclusive ? i >= idx : i > idx) && !x.fixed ? { ...x, time: toHHMM(toMin(x.time) + minutes) } : x,
              ),
            };
          }),
        })),
      sortByTime: (day) =>
        set((s) => ({ days: mapDay(s.days, day, (d) => ({ ...d, items: [...d.items].sort((a, b) => toMin(a.time) - toMin(b.time)) })) })),
      setDayTheme: (day, theme) => set((s) => ({ days: mapDay(s.days, day, (d) => ({ ...d, theme })) })),
      resetDay: (day) => set((s) => ({ days: mapDay(s.days, day, () => buildInitialDays()[day]) })),
      resetAll: () => set({ ...initialData(), selectedDay: 0, selectedItemId: null, overview: false, routes: get().routes, resolved: get().resolved }),

      addCustomPlace: (p, r) =>
        set((s) => ({ customPlaces: { ...s.customPlaces, [p.key]: p }, resolved: r ? { ...s.resolved, [p.key]: r } : s.resolved })),
      setResolved: (key, r) => set((s) => ({ resolved: { ...s.resolved, [key]: r } })),
      clearResolved: () => set({ resolved: {} }),
      setRoute: (key, r) => set((s) => ({ routes: { ...s.routes, [key]: r } })),
      clearRoutes: () => set({ routes: {} }),

      toggleFavorite: (key) =>
        set((s) => ({ favorites: s.favorites.includes(key) ? s.favorites.filter((k) => k !== key) : [...s.favorites, key] })),
      toggleCheck: (id) => set((s) => ({ checklist: s.checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c)) })),
      addCheck: (label) => set((s) => ({ checklist: [...s.checklist, { id: uid(), label, done: false }] })),
      removeCheck: (id) => set((s) => ({ checklist: s.checklist.filter((c) => c.id !== id) })),
      addExpense: (e) => set((s) => ({ expenses: [...s.expenses, { ...e, id: uid() }] })),
      updateExpense: (id, patch) => set((s) => ({ expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      removeExpense: (id) => set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),
      setRate: (rate, source) => set({ rateKRW: rate, rateUpdatedAt: Date.now(), rateSource: source ?? "직접 입력" }),

      importData: (json) => {
        const d = json as Partial<TripState> & { app?: string };
        if (!d || !Array.isArray(d.days) || d.days.length !== 5) throw new Error("올바른 여행 데이터 파일이 아닙니다");
        for (const day of d.days) {
          if (typeof day.date !== "string" || !Array.isArray(day.items)) throw new Error("일정 형식이 올바르지 않습니다");
        }
        set({
          days: d.days,
          customPlaces: d.customPlaces ?? {},
          favorites: d.favorites ?? [],
          checklist: d.checklist ?? get().checklist,
          expenses: d.expenses ?? [],
          rateKRW: d.rateKRW ?? get().rateKRW,
          resolved: { ...get().resolved, ...(d.resolved ?? {}) },
          selectedDay: 0,
          selectedItemId: null,
        });
      },
    }),
    {
      name: "hk-trip-2026",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        days: s.days,
        customPlaces: s.customPlaces,
        resolved: s.resolved,
        routes: s.routes,
        favorites: s.favorites,
        checklist: s.checklist,
        expenses: s.expenses,
        rateKRW: s.rateKRW,
        rateUpdatedAt: s.rateUpdatedAt,
        rateSource: s.rateSource,
        selectedDay: s.selectedDay,
      }),
    },
  ),
);

export function exportData() {
  const s = useTrip.getState();
  return {
    app: "hk-trip-2026",
    exportedAt: new Date().toISOString(),
    days: s.days,
    customPlaces: s.customPlaces,
    resolved: s.resolved,
    favorites: s.favorites,
    checklist: s.checklist,
    expenses: s.expenses,
    rateKRW: s.rateKRW,
  };
}

/** 장소 조회 (기본 카탈로그 + 사용자 추가) */
export function getPlace(key: string | null | undefined, custom: Record<string, Place>): Place | undefined {
  if (!key) return undefined;
  return custom[key] ?? PLACES[key];
}

export { uid };
