"use client";

import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useMemo, useRef } from "react";
import { gmapsDirUrl } from "@/lib/geo";
import { CATEGORY } from "@/lib/meta";
import { getPlace, useTrip } from "@/lib/store";
import { analyzeDay, placePos, useLegs, type Conflict } from "@/lib/trip";
import { fmtMinutes, toHHMM, toMin } from "@/lib/time";
import type { ItineraryItem } from "@/lib/types";
import LegInfo from "./LegInfo";
import PlacePhoto from "./PlacePhoto";
import { VerifyBadge } from "./PlaceDetail";
import { Badge, cn } from "./ui";

function ItemCard({
  item,
  index,
  conflicts,
  active,
  editing,
  onOpen,
  onEdit,
  onFocus,
  dragHandle,
}: {
  item: ItineraryItem;
  index: number;
  conflicts: Conflict[];
  active: boolean;
  editing: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onFocus: () => void;
  dragHandle?: React.ReactNode;
}) {
  const custom = useTrip((s) => s.customPlaces);
  const resolved = useTrip((s) => (item.placeKey ? s.resolved[item.placeKey] : undefined));
  const place = getPlace(item.placeKey, custom);
  const cat = CATEGORY[place?.category ?? "event"];
  const pos = placePos(place, resolved);
  const endTime = item.stay ? toHHMM(toMin(item.time) + item.stay) : null;

  return (
    <div className="relative flex gap-3" data-item={item.id}>
      {/* 시간 + 번호 */}
      <div className="flex w-[46px] shrink-0 flex-col items-center pt-1">
        <div className="text-[13px] font-bold tabular-nums text-ink">{item.time}</div>
        <div
          className="mt-1 grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold text-white"
          style={{ background: place?.category === "hotel" ? "#1F2430" : cat.color }}
        >
          {index + 1}
        </div>
      </div>

      <div
        onClick={editing ? undefined : onFocus}
        className={cn(
          "min-w-0 flex-1 cursor-pointer rounded-3xl bg-white p-3 shadow-soft transition",
          active && "ring-2 ring-sky-300 shadow-lift",
          conflicts.some((c) => c.level === "error") && "ring-2 ring-red-200",
        )}
      >
        <div className="flex gap-3">
          {place && !place.noMap && (
            <PlacePhoto place={place} resolved={resolved} width={200} className="h-[68px] w-[68px] shrink-0 rounded-2xl" />
          )}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-1">
              <Badge color={cat.color} bg={cat.bg}>
                {cat.icon} {cat.label}
              </Badge>
              {item.placeKey && <VerifyBadge placeKey={item.placeKey} />}
              {item.fixed && <Badge color="#4A5162" bg="#ECEEF2">🔒 고정</Badge>}
              {item.deadline && <Badge color="#C0392B" bg="#FBE7E4">⏰ 마감</Badge>}
            </div>
            <div className="truncate text-[15px] font-bold leading-snug text-ink">{place?.nameKo ?? "장소 미지정"}</div>
            <div className="truncate text-[13px] text-ink-soft">{item.activity}</div>
            <div className="mt-0.5 text-[11px] text-ink-mute">
              {item.stay > 0 ? `체류 ${fmtMinutes(item.stay)}${endTime ? ` (~${endTime})` : ""}` : "체류 없음"}
              {item.timeNote && <span className="text-amber-700"> · {item.timeNote}</span>}
            </div>
          </div>
          {dragHandle}
        </div>

        {conflicts.map((c, i) => (
          <div
            key={i}
            className={cn("mt-2 rounded-xl px-2.5 py-1.5 text-[12px]", c.level === "error" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800")}
          >
            {c.level === "error" ? "⛔" : "⚠️"} {c.message}
          </div>
        ))}

        {!editing ? (
          place &&
          !place.noMap && (
            <div className="mt-2.5 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
              <button onClick={onFocus} className="h-8 rounded-xl bg-ivory-100 px-2.5 text-[12px] font-semibold text-ink-soft">
                📍 지도
              </button>
              <a
                href={gmapsDirUrl({ dest: { lat: pos?.lat, lng: pos?.lng, placeId: pos?.placeId, query: place.query ?? place.nameEn }, mode: "transit" })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center rounded-xl bg-ivory-100 px-2.5 text-[12px] font-semibold text-ink-soft"
              >
                🧭 길찾기
              </a>
              <button onClick={onOpen} className="ml-auto h-8 rounded-xl bg-sky-50 px-2.5 text-[12px] font-semibold text-sky-700">
                상세정보 ›
              </button>
            </div>
          )
        ) : (
          <div className="mt-2.5 flex gap-1.5">
            <button onClick={onEdit} className="h-8 flex-1 rounded-xl bg-sky-50 text-[12px] font-semibold text-sky-700">
              ✏️ 수정
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SortableRow(props: Parameters<typeof ItemCard>[0]) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.item.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : undefined }}
      className={cn("py-1.5", isDragging && "opacity-90")}
    >
      <ItemCard
        {...props}
        dragHandle={
          <button
            {...attributes}
            {...listeners}
            aria-label="순서 변경"
            className="grid w-9 shrink-0 touch-none cursor-grab place-items-center rounded-xl bg-ivory-100 text-ink-mute active:cursor-grabbing"
          >
            ⋮⋮
          </button>
        }
      />
    </div>
  );
}

export default function Timeline({
  dayIndex,
  editing,
  onOpen,
  onEdit,
  onFocus,
}: {
  dayIndex: number;
  editing: boolean;
  onOpen: (item: ItineraryItem) => void;
  onEdit: (item: ItineraryItem) => void;
  onFocus: (item: ItineraryItem) => void;
}) {
  const day = useTrip((s) => s.days[dayIndex]);
  const routes = useTrip((s) => s.routes);
  const selectedItemId = useTrip((s) => s.selectedItemId);
  const reorder = useTrip((s) => s.reorder);
  const legs = useLegs(dayIndex);
  const conflicts = useMemo(() => (day ? analyzeDay(day, legs, routes) : []), [day, legs, routes]);
  const listRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // 지도에서 선택된 일정으로 스크롤
  useEffect(() => {
    if (!selectedItemId || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-item="${selectedItemId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedItemId]);

  if (!day) return null;
  const ids = day.items.map((i) => i.id);

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = ids.indexOf(String(e.active.id));
    const to = ids.indexOf(String(e.over.id));
    if (from >= 0 && to >= 0) reorder(dayIndex, from, to);
  };

  if (!day.items.length)
    return <div className="rounded-3xl bg-white p-6 text-center text-[14px] text-ink-mute shadow-soft">일정이 없습니다. ＋ 버튼으로 추가해 보세요.</div>;

  if (editing)
    return (
      <div ref={listRef}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            {day.items.map((item, i) => (
              <SortableRow
                key={item.id}
                item={item}
                index={i}
                conflicts={conflicts.filter((c) => c.itemId === item.id)}
                active={selectedItemId === item.id}
                editing
                onOpen={() => onOpen(item)}
                onEdit={() => onEdit(item)}
                onFocus={() => onFocus(item)}
              />
            ))}
          </SortableContext>
        </DndContext>
        <p className="mt-2 text-center text-[11px] text-ink-mute">⋮⋮ 를 길게 눌러 끌면 순서가 바뀌고, 시간 슬롯은 순서대로 다시 배정됩니다 (고정 일정 제외).</p>
      </div>
    );

  return (
    <div ref={listRef}>
      {day.items.map((item, i) => (
        <div key={item.id}>
          <div className="py-1.5">
            <ItemCard
              item={item}
              index={i}
              conflicts={conflicts.filter((c) => c.itemId === item.id)}
              active={selectedItemId === item.id}
              editing={false}
              onOpen={() => onOpen(item)}
              onEdit={() => onEdit(item)}
              onFocus={() => onFocus(item)}
            />
          </div>
          {legs[i] && <LegInfo leg={legs[i]} date={day.date} expanded={selectedItemId === item.id} />}
        </div>
      ))}
    </div>
  );
}
