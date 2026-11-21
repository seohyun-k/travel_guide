"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { MapMarker } from "@/lib/mapdata";
import { DAY_COLORS } from "@/lib/meta";
import { useTrip } from "@/lib/store";
import { analyzeDay, useLegs } from "@/lib/trip";
import { fmtDate, shortDate, toMin, weekday } from "@/lib/time";
import type { ItineraryItem } from "@/lib/types";
import BottomSheet from "./BottomSheet";
import ItemEditor from "./ItemEditor";
import MapPanel from "./MapPanel";
import PlaceDetail from "./PlaceDetail";
import Timeline from "./Timeline";
import { Button, Modal, cn, inputCls } from "./ui";
import { toast } from "./toast";

const MQ = "(min-width: 768px)";
function useDesktop() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(MQ);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(MQ).matches,
    () => false,
  );
}

export function DayTabs({ className }: { className?: string }) {
  const days = useTrip((s) => s.days);
  const sel = useTrip((s) => s.selectedDay);
  const overview = useTrip((s) => s.overview);
  const setSelectedDay = useTrip((s) => s.setSelectedDay);
  const setOverview = useTrip((s) => s.setOverview);
  return (
    <div className={cn("no-scrollbar flex gap-1.5 overflow-x-auto", className)}>
      {days.map((d, i) => {
        const active = !overview && sel === i;
        return (
          <button
            key={d.date}
            onClick={() => setSelectedDay(i)}
            className={cn(
              "flex min-w-[58px] shrink-0 flex-col items-center rounded-2xl px-2.5 py-1.5 transition",
              active ? "text-white shadow-lift" : "bg-white/95 text-ink-soft shadow-soft",
            )}
            style={active ? { background: DAY_COLORS[i] } : undefined}
          >
            <span className="text-[14px] font-bold leading-tight tabular-nums">{shortDate(d.date)}</span>
            <span className={cn("text-[10px] leading-tight", active ? "text-white/85" : "text-ink-mute")}>
              {weekday(d.date)} · D{i + 1}
            </span>
          </button>
        );
      })}
      <button
        onClick={() => setOverview(!overview)}
        className={cn(
          "flex shrink-0 flex-col items-center justify-center rounded-2xl px-3 py-1.5 text-[12px] font-bold",
          overview ? "bg-ink text-white shadow-lift" : "bg-white/95 text-ink-soft shadow-soft",
        )}
      >
        🗺️ 전체
      </button>
    </div>
  );
}

function ConferenceControl({ dayIndex }: { dayIndex: number }) {
  const day = useTrip((s) => s.days[dayIndex]);
  const shiftAfter = useTrip((s) => s.shiftAfter);
  const updateItem = useTrip((s) => s.updateItem);
  const endItem = day.items.find((x) => x.activity.includes("학회 종료"));
  const conf = day.items.find((x) => x.activity.includes("학회 참석"));
  const [val, setVal] = useState(endItem?.time ?? "16:30");
  useEffect(() => setVal(endItem?.time ?? "16:30"), [endItem?.time]);
  if (!endItem) return null;
  const apply = () => {
    const delta = toMin(val) - toMin(endItem.time);
    if (!delta) return;
    shiftAfter(dayIndex, endItem.id, delta, true);
    if (conf) updateItem(dayIndex, conf.id, { stay: Math.max(0, toMin(val) - toMin(conf.time)) });
    toast(`학회 종료 ${val} 기준으로 이후 일정을 ${delta > 0 ? "+" : ""}${delta}분 이동했습니다`);
  };
  return (
    <div className="mb-3 rounded-3xl bg-gradient-to-br from-sky-50 to-white p-3.5 shadow-soft">
      <div className="text-[13px] font-bold text-ink">🎓 학회 종료 시간</div>
      <div className="mt-0.5 text-[12px] text-ink-mute">종료 시간을 바꾸면 이후 관광 일정이 함께 이동합니다.</div>
      <div className="mt-2 flex gap-2">
        <input type="time" value={val} onChange={(e) => setVal(e.target.value)} className={cn(inputCls, "flex-1")} />
        <Button variant="primary" onClick={apply}>
          적용
        </Button>
      </div>
    </div>
  );
}

function DayToolbar({ dayIndex, onAdd }: { dayIndex: number; onAdd: () => void }) {
  const days = useTrip((s) => s.days);
  const { sortByTime, swapDays, resetDay, shiftAfter, setDayTheme } = useTrip.getState();
  const [swapOpen, setSwapOpen] = useState(false);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [shift, setShift] = useState(30);
  const day = days[dayIndex];
  return (
    <div className="mb-3 rounded-3xl bg-white p-3 shadow-soft">
      <input className={cn(inputCls, "mb-2 py-2 text-[14px] font-semibold")} value={day.theme} onChange={(e) => setDayTheme(dayIndex, e.target.value)} aria-label="테마" />
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant="primary" onClick={onAdd}>
          ＋ 일정 추가
        </Button>
        <Button size="sm" onClick={() => (sortByTime(dayIndex), toast("시간순으로 정렬했습니다"))}>
          ⏱ 시간순 정렬
        </Button>
        <Button size="sm" onClick={() => setShiftOpen(true)}>
          ⇅ 전체 시간 이동
        </Button>
        <Button size="sm" onClick={() => setSwapOpen(true)}>
          ⇄ 다른 날과 교환
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            if (confirm(`${day.title} 일정을 초기 추천 일정으로 되돌릴까요?`)) {
              resetDay(dayIndex);
              toast("초기 추천 일정으로 되돌렸습니다");
            }
          }}
        >
          ↺ 이 날 초기화
        </Button>
      </div>
      <Modal open={swapOpen} onClose={() => setSwapOpen(false)} title="하루 일정 이동">
        <p className="mb-3 text-[13px] text-ink-soft">{day.title}의 일정 전체를 선택한 날짜와 맞바꿉니다. 고정 일정(항공편)도 함께 이동하니 확인하세요.</p>
        <div className="space-y-2">
          {days.map((d, i) =>
            i === dayIndex ? null : (
              <button
                key={d.date}
                onClick={() => {
                  swapDays(dayIndex, i);
                  setSwapOpen(false);
                  toast(`${day.title} ↔ ${d.title} 일정을 교환했습니다`);
                }}
                className="w-full rounded-2xl bg-white p-3 text-left shadow-soft"
              >
                <div className="text-[14px] font-bold">
                  {d.title} · {fmtDate(d.date)}
                </div>
                <div className="text-[12px] text-ink-mute">{d.theme}</div>
              </button>
            ),
          )}
        </div>
      </Modal>
      <Modal open={shiftOpen} onClose={() => setShiftOpen(false)} title="전체 일정 시간 이동">
        <p className="mb-3 text-[13px] text-ink-soft">이 날의 모든 일정(고정 일정 제외)을 같은 시간만큼 앞당기거나 미룹니다.</p>
        <div className="flex items-center gap-2">
          <input type="number" step={5} className={inputCls} value={shift} onChange={(e) => setShift(Number(e.target.value))} />
          <span className="shrink-0 text-[13px] text-ink-soft">분</span>
        </div>
        <div className="mt-3 flex gap-2">
          {[-30, -15, 15, 30, 60].map((v) => (
            <button key={v} onClick={() => setShift(v)} className="flex-1 rounded-xl bg-ivory-100 py-1.5 text-[12px] font-semibold">
              {v > 0 ? `+${v}` : v}
            </button>
          ))}
        </div>
        <Button
          variant="primary"
          className="mt-4 w-full"
          onClick={() => {
            if (day.items[0]) shiftAfter(dayIndex, day.items[0].id, shift, true);
            setShiftOpen(false);
            toast(`${shift > 0 ? "+" : ""}${shift}분 이동했습니다`);
          }}
        >
          적용
        </Button>
      </Modal>
    </div>
  );
}

function SheetHeader({ dayIndex, editing, setEditing }: { dayIndex: number; editing: boolean; setEditing: (v: boolean) => void }) {
  const day = useTrip((s) => s.days[dayIndex]);
  const overview = useTrip((s) => s.overview);
  const routes = useTrip((s) => s.routes);
  const legs = useLegs(dayIndex);
  const conflicts = useMemo(() => analyzeDay(day, legs, routes), [day, legs, routes]);
  const totalMove = legs.reduce((a, l) => {
    const r = l.routeKey ? routes[l.routeKey] : undefined;
    return a + (r?.status === "ok" ? r.durationSec ?? 0 : 0);
  }, 0);
  return (
    <div className="flex items-end justify-between gap-2 px-5 pb-3 pt-1">
      <div className="min-w-0">
        <div className="text-[12px] font-semibold" style={{ color: DAY_COLORS[dayIndex] }}>
          {overview ? "전체 일정 보기" : `${day.title} · ${fmtDate(day.date)}`}
        </div>
        <div className="truncate text-[17px] font-bold text-ink">{overview ? "4박 5일 홍콩 전체 동선" : day.theme}</div>
        {!overview && (
          <div className="text-[12px] text-ink-mute">
            {day.items.length}개 일정{totalMove > 0 && ` · 총 이동 약 ${Math.round(totalMove / 60)}분`}
            {conflicts.length > 0 && <span className="text-red-600"> · 확인 필요 {conflicts.length}건</span>}
          </div>
        )}
      </div>
      {!overview && (
        <Button size="sm" variant={editing ? "primary" : "soft"} onClick={() => setEditing(!editing)}>
          {editing ? "✓ 완료" : "✏️ 편집"}
        </Button>
      )}
    </div>
  );
}

function OverviewList() {
  const days = useTrip((s) => s.days);
  const setSelectedDay = useTrip((s) => s.setSelectedDay);
  return (
    <div className="space-y-2.5">
      {days.map((d, i) => (
        <button key={d.date} onClick={() => setSelectedDay(i)} className="flex w-full items-center gap-3 rounded-3xl bg-white p-3.5 text-left shadow-soft">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-[13px] font-bold text-white" style={{ background: DAY_COLORS[i] }}>
            D{i + 1}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] text-ink-mute">{fmtDate(d.date)}</div>
            <div className="truncate text-[15px] font-bold text-ink">{d.theme}</div>
            <div className="text-[12px] text-ink-mute">
              {d.items.length}개 일정 · {d.items[0]?.time ?? "-"} ~ {d.items[d.items.length - 1]?.time ?? "-"}
            </div>
          </div>
          <span className="text-ink-mute">›</span>
        </button>
      ))}
    </div>
  );
}

export default function Planner() {
  const dayIndex = useTrip((s) => s.selectedDay);
  const overview = useTrip((s) => s.overview);
  const days = useTrip((s) => s.days);
  const selectItem = useTrip((s) => s.selectItem);
  const setSelectedDay = useTrip((s) => s.setSelectedDay);
  const [snap, setSnap] = useState(1);
  const desktop = useDesktop();
  const [editing, setEditing] = useState(false);
  const [detail, setDetail] = useState<{ key: string; item?: ItineraryItem } | null>(null);
  const [editor, setEditor] = useState<{ item: ItineraryItem | null } | null>(null);

  const dayIndexes = useMemo(() => (overview ? days.map((_, i) => i) : [dayIndex]), [overview, days, dayIndex]);
  const safeDay = Math.min(dayIndex, days.length - 1);

  const onMarker = (m: MapMarker) => {
    if (overview) {
      setSelectedDay(m.dayIndex);
      setTimeout(() => useTrip.getState().selectItem(m.itemIds[0]), 0);
    } else selectItem(m.itemIds[0]);
    setSnap((s) => (s === 0 ? 1 : s));
  };
  const onFocus = (item: ItineraryItem) => {
    selectItem(item.id);
    if (!desktop) setSnap(0);
  };

  const content = (
    <>
      {overview ? (
        <OverviewList />
      ) : (
        <>
          {days[safeDay].date === "2026-12-03" && <ConferenceControl dayIndex={safeDay} />}
          {editing && <DayToolbar dayIndex={safeDay} onAdd={() => setEditor({ item: null })} />}
          <Timeline
            dayIndex={safeDay}
            editing={editing}
            onOpen={(item) => item.placeKey && setDetail({ key: item.placeKey, item })}
            onEdit={(item) => setEditor({ item })}
            onFocus={onFocus}
          />
          {!editing && (
            <div className="mt-3 flex gap-2">
              <Button className="flex-1" onClick={() => setEditor({ item: null })}>
                ＋ 일정 추가
              </Button>
              <Button className="flex-1" variant="outline" onClick={() => setEditing(true)}>
                ✏️ 순서·시간 편집
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden">
      {/* 데스크톱: 좌측 일정 / 우측 지도 */}
      {desktop ? (
      <div className="flex h-full">
        <aside className="flex h-full w-[430px] shrink-0 flex-col border-r border-ivory-200 bg-ivory-50 lg:w-[470px]">
          <div className="px-4 pb-2 pt-4">
            <DayTabs />
          </div>
          <SheetHeader dayIndex={safeDay} editing={editing} setEditing={setEditing} />
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-24">{content}</div>
        </aside>
        <div className="relative min-w-0 flex-1">
          <MapPanel dayIndexes={dayIndexes} overview={overview} onSelectMarker={onMarker} />
        </div>
      </div>

      ) : (
      /* 모바일: 상단 날짜 / 지도 / 하단 시트 */
      <div className="absolute inset-0">
        <MapPanel dayIndexes={dayIndexes} overview={overview} onSelectMarker={onMarker} topOffset={76} />
        <div className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-ivory-50/95 via-ivory-50/70 to-transparent px-3 pb-3 pt-[max(10px,env(safe-area-inset-top))]">
          <DayTabs />
        </div>
        <BottomSheet snap={snap} onSnap={setSnap} header={<SheetHeader dayIndex={safeDay} editing={editing} setEditing={setEditing} />}>
          {content}
        </BottomSheet>
      </div>
      )}

      {detail && (
        <PlaceDetail
          placeKey={detail.key}
          item={detail.item}
          onClose={() => setDetail(null)}
          onShowOnMap={() => {
            if (detail.item) onFocus(detail.item);
            setDetail(null);
          }}
        />
      )}
      {editor && <ItemEditor dayIndex={safeDay} item={editor.item} onClose={() => setEditor(null)} />}
    </div>
  );
}
