"use client";

import { useEffect, useMemo, useState } from "react";
import { PLACES } from "@/lib/data/places";
import { CATEGORY, LEG_MODE } from "@/lib/meta";
import { getPlace, useTrip } from "@/lib/store";
import { useApi, useOnline } from "@/lib/trip";
import { BASE_PATH } from "@/lib/env";
import { clientSearch } from "@/lib/gmaps-client";
import { fmtDate, toMin } from "@/lib/time";
import type { Category, ItineraryItem, LegMode, Place, ResolvedPlace } from "@/lib/types";
import { Badge, Button, Field, Modal, cn, inputCls } from "./ui";
import { toast } from "./toast";

const CAT_OPTIONS: Category[] = ["sight", "food", "cafe", "shopping", "photo", "transport", "theme", "hotel", "airport", "event"];

/** 장소 선택 (카탈로그 + Google Places 검색) */
export function PlacePicker({ value, onChange }: { value: string | null; onChange: (key: string | null) => void }) {
  const custom = useTrip((s) => s.customPlaces);
  const addCustomPlace = useTrip((s) => s.addCustomPlace);
  const server = useApi((s) => s.server);
  const online = useOnline();
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<"list" | "google">("list");
  const [results, setResults] = useState<ResolvedPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cat, setCat] = useState<Category>("sight");

  const all = useMemo(() => [...Object.values(PLACES), ...Object.values(custom)].filter((p) => !p.noMap), [custom]);
  const filtered = all.filter((p) => !q || `${p.nameKo} ${p.nameEn}`.toLowerCase().includes(q.toLowerCase()));
  const current = getPlace(value, custom);

  const search = async () => {
    if (!q.trim()) return;
    setLoading(true);
    setErr(null);
    try {
      let list: ResolvedPlace[];
      if (useApi.getState().provider === "client") {
        list = await clientSearch(q);
      } else {
        const r = await fetch(`${BASE_PATH}/api/places/search?q=${encodeURIComponent(q)}`);
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "검색 실패");
        list = j.results ?? [];
      }
      setResults(list);
      if (!list.length) setErr("홍콩 내 검색 결과가 없습니다");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const pickGoogle = (r: ResolvedPlace) => {
    if (!r.placeId) return;
    const key = `g_${r.placeId}`;
    const p: Place = {
      key,
      nameKo: r.name ?? q,
      nameEn: r.name ?? q,
      category: cat,
      placeId: r.placeId,
      query: r.name,
      description: r.address,
    };
    addCustomPlace(p, { ...r, status: "ok" });
    onChange(key);
    setMode("list");
    toast(`'${p.nameKo}' 장소를 선택했습니다`);
  };

  return (
    <div className="rounded-2xl border border-ivory-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[13px] text-ink-soft">
          선택됨: <b className="text-ink">{current ? `${CATEGORY[current.category].icon} ${current.nameKo}` : "없음"}</b>
        </div>
        {value && (
          <button className="text-[12px] text-ink-mute underline" onClick={() => onChange(null)}>
            해제
          </button>
        )}
      </div>
      <div className="mb-2 flex gap-1 rounded-xl bg-ivory-100 p-1 text-[12px] font-semibold">
        {(["list", "google"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn("flex-1 rounded-lg py-1.5", mode === m ? "bg-white text-ink shadow-soft" : "text-ink-mute")}
          >
            {m === "list" ? "등록된 장소" : "Google 장소 검색"}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className={inputCls}
          placeholder={mode === "list" ? "장소 이름으로 찾기" : "예: Kam's Roast Goose Wan Chai"}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && mode === "google" && search()}
        />
        {mode === "google" && (
          <Button variant="primary" onClick={search} disabled={!server || !online || loading}>
            {loading ? "…" : "검색"}
          </Button>
        )}
      </div>

      {mode === "list" ? (
        <div className="mt-2 max-h-48 overflow-y-auto">
          {filtered.map((p) => (
            <button
              key={p.key}
              onClick={() => onChange(p.key)}
              className={cn("flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-[14px]", value === p.key ? "bg-sky-50" : "hover:bg-ivory-100")}
            >
              <span>{CATEGORY[p.category].icon}</span>
              <span className="flex-1 truncate">{p.nameKo}</span>
              <span className="truncate text-[11px] text-ink-mute">{p.nameEn}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-2">
          {!server && <p className="text-[12px] text-ink-mute">Google Maps API 키가 설정되어야 Google 장소 검색을 사용할 수 있습니다.</p>}
          {!online && <p className="text-[12px] text-ink-mute">오프라인 상태에서는 검색할 수 없습니다.</p>}
          {server && (
            <div className="mb-2 flex flex-wrap gap-1">
              {CAT_OPTIONS.map((c) => (
                <button key={c} onClick={() => setCat(c)} className={cn("rounded-full px-2 py-1 text-[11px]", cat === c ? "bg-sky-500 text-white" : "bg-ivory-100 text-ink-soft")}>
                  {CATEGORY[c].icon} {CATEGORY[c].label}
                </button>
              ))}
            </div>
          )}
          {err && <p className="text-[12px] text-red-600">{err}</p>}
          <div className="max-h-56 overflow-y-auto">
            {results.map((r) => (
              <button key={r.placeId} onClick={() => pickGoogle(r)} className="w-full rounded-xl px-2 py-2 text-left hover:bg-ivory-100">
                <div className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
                  {r.name}
                  {r.businessStatus && r.businessStatus !== "OPERATIONAL" && <Badge color="#C0392B" bg="#FBE7E4">영업 확인</Badge>}
                </div>
                <div className="text-[12px] text-ink-mute">{r.address}</div>
                {r.rating != null && <div className="text-[11px] text-ink-mute">★ {r.rating} ({r.ratingCount})</div>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ItemEditor({
  dayIndex,
  item,
  onClose,
  presetPlace,
}: {
  dayIndex: number;
  item: ItineraryItem | null; // null = 새 일정
  onClose: () => void;
  presetPlace?: string;
}) {
  const days = useTrip((s) => s.days);
  const { updateItem, addItem, removeItem, moveItemToDay, shiftAfter } = useTrip.getState();
  const day = days[dayIndex];
  const last = day.items[day.items.length - 1];
  const [time, setTime] = useState(item?.time ?? last?.time ?? "10:00");
  const [stay, setStay] = useState(item?.stay ?? 60);
  const [activity, setActivity] = useState(item?.activity ?? "");
  const [placeKey, setPlaceKey] = useState<string | null>(item?.placeKey ?? presetPlace ?? null);
  const [legMode, setLegMode] = useState<LegMode>(item?.legMode ?? "WALK");
  const [legNote, setLegNote] = useState(item?.legNote ?? "");
  const [timeNote, setTimeNote] = useState(item?.timeNote ?? "");
  const [memo, setMemo] = useState(item?.memo ?? "");
  const [fixed, setFixed] = useState(!!item?.fixed);
  const [shiftFollow, setShiftFollow] = useState(false);
  const [moveTo, setMoveTo] = useState(dayIndex);

  useEffect(() => {
    if (presetPlace) setPlaceKey(presetPlace);
  }, [presetPlace]);

  const save = () => {
    if (!/^\d{2}:\d{2}$/.test(time)) return toast("시간을 확인해 주세요");
    const patch = {
      time,
      stay: Math.max(0, Number(stay) || 0),
      activity: activity.trim() || "방문",
      placeKey,
      legMode,
      legNote: legNote.trim() || undefined,
      timeNote: timeNote.trim() || undefined,
      memo: memo.trim() || undefined,
      fixed,
    };
    if (item) {
      const delta = toMin(time) - toMin(item.time);
      if (shiftFollow && delta !== 0) {
        shiftAfter(dayIndex, item.id, delta, false);
      }
      updateItem(dayIndex, item.id, patch);
      if (moveTo !== dayIndex) {
        moveItemToDay(dayIndex, item.id, moveTo);
        toast(`${fmtDate(days[moveTo].date)} 로 이동했습니다`);
      } else toast("저장했습니다 · 경로를 다시 계산합니다");
    } else {
      addItem(moveTo, patch);
      toast("일정을 추가했습니다");
    }
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={item ? "일정 수정" : "일정 추가"}
      footer={
        <div className="flex gap-2">
          {item && (
            <Button
              variant="danger"
              onClick={() => {
                if (confirm("이 일정을 삭제할까요?")) {
                  removeItem(dayIndex, item.id);
                  toast("삭제했습니다");
                  onClose();
                }
              }}
            >
              삭제
            </Button>
          )}
          <Button variant="ghost" className="ml-auto" onClick={onClose}>
            취소
          </Button>
          <Button variant="primary" onClick={save}>
            저장
          </Button>
        </div>
      }
    >
      <div className="space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="방문 시간">
            <input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
          <Field label="체류 시간(분)">
            <input type="number" min={0} step={5} inputMode="numeric" className={inputCls} value={stay} onChange={(e) => setStay(Number(e.target.value))} />
          </Field>
        </div>
        {item && (
          <label className="flex items-center gap-2 text-[13px] text-ink-soft">
            <input type="checkbox" checked={shiftFollow} onChange={(e) => setShiftFollow(e.target.checked)} />
            시간 변경만큼 이후 일정도 함께 이동 (고정 일정 제외)
          </label>
        )}
        <Field label="활동">
          <input className={inputCls} value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="예: 점심, 사진 촬영" />
        </Field>
        <Field label="장소">
          <PlacePicker value={placeKey} onChange={setPlaceKey} />
        </Field>
        <Field label="다음 장소까지 이동수단" hint="실제 경로·소요 시간은 Google Routes API 응답으로 계산됩니다.">
          <div className="grid grid-cols-4 gap-1.5">
            {(Object.keys(LEG_MODE) as LegMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setLegMode(m)}
                className={cn("rounded-xl py-2 text-[12px] font-semibold", legMode === m ? "bg-sky-500 text-white" : "bg-white text-ink-soft shadow-soft")}
              >
                {LEG_MODE[m].icon} {LEG_MODE[m].label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="이동 메모 (선택)">
          <input className={inputCls} value={legNote} onChange={(e) => setLegNote(e.target.value)} placeholder="예: 스타페리, A11 공항버스" />
        </Field>
        <Field label="시간 안내 (선택)">
          <input className={inputCls} value={timeNote} onChange={(e) => setTimeNote(e.target.value)} placeholder="예: 공연 시간 공식 확인" />
        </Field>
        <Field label="메모 (선택)">
          <textarea className={inputCls} rows={2} value={memo} onChange={(e) => setMemo(e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-[13px] text-ink-soft">
          <input type="checkbox" checked={fixed} onChange={(e) => setFixed(e.target.checked)} />
          시간 고정 (항공편 등 — 순서 변경·일괄 이동 시 시각 유지)
        </label>
        <Field label={item ? "다른 날짜로 옮기기" : "추가할 날짜"}>
          <select className={inputCls} value={moveTo} onChange={(e) => setMoveTo(Number(e.target.value))}>
            {days.map((d, i) => (
              <option key={d.date} value={i}>
                {d.title} · {fmtDate(d.date)}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </Modal>
  );
}
