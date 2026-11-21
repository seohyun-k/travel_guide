"use client";

import { useMemo, useState } from "react";
import { FAVORITE_SUGGESTIONS, PLACES } from "@/lib/data/places";
import { CATEGORY } from "@/lib/meta";
import { getPlace, useTrip } from "@/lib/store";
import { resolvePlace, useApi } from "@/lib/trip";
import type { Category } from "@/lib/types";
import ItemEditor, { PlacePicker } from "./ItemEditor";
import PlaceDetail, { VerifyBadge } from "./PlaceDetail";
import PlacePhoto from "./PlacePhoto";
import { Button, Modal, Section, cn } from "./ui";

const FILTERS: { key: "all" | Category; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "photo", label: "📸 사진 명소" },
  { key: "food", label: "🍜 맛집" },
  { key: "cafe", label: "☕ 카페" },
  { key: "sight", label: "🏛️ 관광지" },
  { key: "shopping", label: "🛍️ 쇼핑" },
];

export default function Favorites() {
  const favorites = useTrip((s) => s.favorites);
  const custom = useTrip((s) => s.customPlaces);
  const resolved = useTrip((s) => s.resolved);
  const toggleFavorite = useTrip((s) => s.toggleFavorite);
  const selectedDay = useTrip((s) => s.selectedDay);
  const server = useApi((s) => s.server);
  const [filter, setFilter] = useState<"all" | Category>("all");
  const [detail, setDetail] = useState<string | null>(null);
  const [addTo, setAddTo] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);

  const favPlaces = favorites.map((k) => getPlace(k, custom)).filter(Boolean);
  const shown = favPlaces.filter((p) => filter === "all" || p!.category === filter);
  const suggestions = useMemo(() => FAVORITE_SUGGESTIONS.filter((k) => !favorites.includes(k)).map((k) => PLACES[k]), [favorites]);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-[max(16px,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <h1 className="text-[24px] font-extrabold text-ink">즐겨찾기</h1>
        <Button size="sm" variant="primary" onClick={() => setPicker(true)}>
          ＋ 장소 저장
        </Button>
      </div>
      <p className="mt-1 text-[13px] text-ink-mute">가고 싶은 곳·사진 명소·맛집을 저장하고 바로 일정에 추가하세요.</p>

      <div className="no-scrollbar -mx-4 mt-4 flex gap-1.5 overflow-x-auto px-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn("shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold", filter === f.key ? "bg-ink text-white" : "bg-white text-ink-soft shadow-soft")}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {shown.length === 0 && (
          <div className="rounded-3xl bg-white p-6 text-center text-[14px] text-ink-mute shadow-soft sm:col-span-2">
            저장된 장소가 없습니다. 장소 상세의 ☆ 버튼이나 아래 추천에서 저장해 보세요.
          </div>
        )}
        {shown.map((p) => (
          <div key={p!.key} className="overflow-hidden rounded-3xl bg-white shadow-soft">
            <button className="block w-full text-left" onClick={() => setDetail(p!.key)}>
              <PlacePhoto place={p} resolved={resolved[p!.key]} className="h-32 w-full" width={600} />
              <div className="px-4 pt-3">
                <div className="flex items-center gap-1.5 text-[12px] text-ink-mute">
                  {CATEGORY[p!.category].icon} {CATEGORY[p!.category].label} <VerifyBadge placeKey={p!.key} />
                </div>
                <div className="text-[16px] font-bold text-ink">{p!.nameKo}</div>
                <div className="truncate text-[12px] text-ink-mute">{resolved[p!.key]?.address ?? p!.nameEn}</div>
              </div>
            </button>
            <div className="flex gap-2 p-4 pt-2.5">
              <Button size="sm" variant="primary" onClick={() => setAddTo(p!.key)}>
                ＋ 일정에 추가
              </Button>
              <Button size="sm" variant="ghost" onClick={() => toggleFavorite(p!.key)}>
                ★ 해제
              </Button>
            </div>
          </div>
        ))}
      </div>

      {suggestions.length > 0 && (
        <Section title="추천 장소">
          <div className="space-y-2">
            {suggestions.map((p) => (
              <div key={p.key} className="flex items-center gap-3 rounded-3xl bg-white p-3 shadow-soft">
                <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setDetail(p.key)}>
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl" style={{ background: CATEGORY[p.category].bg }}>
                    {CATEGORY[p.category].icon}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-bold text-ink">{p.nameKo}</div>
                    <div className="truncate text-[12px] text-ink-mute">{p.description}</div>
                  </div>
                </button>
                <Button
                  size="sm"
                  onClick={() => {
                    toggleFavorite(p.key);
                    if (server) resolvePlace(p.key);
                  }}
                >
                  ☆ 저장
                </Button>
              </div>
            ))}
          </div>
        </Section>
      )}

      {detail && (
        <PlaceDetail
          placeKey={detail}
          onClose={() => setDetail(null)}
          onAddToDay={() => {
            setAddTo(detail);
            setDetail(null);
          }}
        />
      )}
      {addTo && <ItemEditor dayIndex={selectedDay} item={null} presetPlace={addTo} onClose={() => setAddTo(null)} />}
      <Modal open={picker} onClose={() => setPicker(false)} title="장소 저장">
        <PlacePicker
          value={null}
          onChange={(k) => {
            if (k) {
              if (!favorites.includes(k)) toggleFavorite(k);
              setPicker(false);
            }
          }}
        />
      </Modal>
    </div>
  );
}
