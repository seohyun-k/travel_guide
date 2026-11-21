"use client";

import { CATEGORY } from "@/lib/meta";
import { gmapsDirUrl, gmapsSearchUrl } from "@/lib/geo";
import { useTrip } from "@/lib/store";
import { resolvePlace, useApi, usePlace } from "@/lib/trip";
import type { ItineraryItem } from "@/lib/types";
import { fmtMinutes } from "@/lib/time";
import PlacePhoto from "./PlacePhoto";
import { Badge, Button, LinkButton, Modal } from "./ui";
import { toast } from "./toast";

export function VerifyBadge({ placeKey }: { placeKey: string }) {
  const { place, resolved, pos } = usePlace(placeKey);
  const server = useApi((s) => s.server);
  if (!place || place.noMap) return null;
  if (resolved?.status === "ok")
    return <Badge color="#2E7D5B" bg="#E3F4EC">✓ Google 확인</Badge>;
  if (resolved?.status === "mismatch") return <Badge color="#B7791F" bg="#FDF3DC">주소 대조 필요</Badge>;
  if (resolved?.status === "not_found") return <Badge color="#C0392B" bg="#FBE7E4">장소 확인 불가</Badge>;
  if (!server) return <Badge color="#8A90A0" bg="#EEF0F3">{pos ? "근사 위치·미검증" : "위치 확인 필요"}</Badge>;
  return <Badge color="#8A90A0" bg="#EEF0F3">확인 중…</Badge>;
}

function Row({ k, v }: { k: string; v?: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2 text-[14px]">
      <div className="w-[84px] shrink-0 text-ink-mute">{k}</div>
      <div className="min-w-0 flex-1 text-ink">{v ?? <span className="text-ink-mute">확인 필요</span>}</div>
    </div>
  );
}

function List({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="mt-4">
      <div className="mb-1.5 text-[13px] font-bold text-ink">{title}</div>
      <ul className="space-y-1">
        {items.map((s) => (
          <li key={s} className="flex gap-2 text-[14px] leading-relaxed text-ink-soft">
            <span className="text-sky-400">•</span>
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PlaceDetail({
  placeKey,
  item,
  onClose,
  onShowOnMap,
  onAddToDay,
}: {
  placeKey: string | null;
  item?: ItineraryItem;
  onClose: () => void;
  onShowOnMap?: () => void;
  onAddToDay?: () => void;
}) {
  const { place, resolved, pos } = usePlace(placeKey);
  const favorites = useTrip((s) => s.favorites);
  const toggleFavorite = useTrip((s) => s.toggleFavorite);
  const server = useApi((s) => s.server);
  if (!placeKey || !place) return null;
  const cat = CATEGORY[place.category];
  const g = place.guide ?? {};
  const fav = favorites.includes(placeKey);
  const destQ = { lat: pos?.lat, lng: pos?.lng, placeId: pos?.placeId, query: place.query ?? place.nameEn };
  const isFood = place.category === "food" || place.category === "cafe";

  return (
    <Modal open onClose={onClose} title={null} wide>
      <div className="-mx-5 -mt-0">
        <PlacePhoto place={place} resolved={resolved} width={900} className="h-52 w-full md:h-64" showCredit />
      </div>
      <div className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <Badge color={cat.color} bg={cat.bg}>
                {cat.icon} {cat.label}
              </Badge>
              <VerifyBadge placeKey={placeKey} />
              {place.isArea && <Badge color="#6B7488" bg="#ECEEF2">지역 단위</Badge>}
            </div>
            <h2 className="text-[21px] font-bold leading-tight text-ink">{place.nameKo}</h2>
            <div className="text-[14px] text-ink-mute">{resolved?.name ?? place.nameEn}</div>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button
              onClick={() => toggleFavorite(placeKey)}
              aria-label="즐겨찾기"
              className="grid h-10 w-10 place-items-center rounded-full bg-ivory-200 text-lg"
            >
              {fav ? "★" : "☆"}
            </button>
            <button onClick={onClose} aria-label="닫기" className="grid h-10 w-10 place-items-center rounded-full bg-ivory-200 text-ink-soft">
              ✕
            </button>
          </div>
        </div>

        {resolved?.message && (
          <div className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-[13px] text-amber-800">⚠️ {resolved.message}</div>
        )}
        {place.description && <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">{place.description}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          <LinkButton href={gmapsDirUrl({ dest: destQ, mode: "transit" })} variant="primary">
            🧭 현재 위치에서 길찾기
          </LinkButton>
          <LinkButton href={resolved?.googleMapsUri ?? gmapsSearchUrl(destQ)} variant="outline">
            Google Maps 열기
          </LinkButton>
          {onShowOnMap && pos && (
            <Button size="sm" onClick={onShowOnMap}>
              📍 지도에서 보기
            </Button>
          )}
          {onAddToDay && (
            <Button size="sm" onClick={onAddToDay}>
              ＋ 일정에 추가
            </Button>
          )}
          {server && (
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                await resolvePlace(placeKey, true);
                toast("Google Places 정보를 다시 확인했습니다");
              }}
            >
              ↻ 재확인
            </Button>
          )}
        </div>

        <div className="mt-4 divide-y divide-ivory-200 rounded-2xl bg-white px-4 shadow-soft">
          <Row k="주소" v={resolved?.address ?? (place.refAddress ? `${place.refAddress} (참고 주소·미검증)` : undefined)} />
          {item && <Row k="방문 시간" v={`${item.time}${item.timeNote ? ` · ${item.timeNote}` : ""}`} />}
          <Row k="추천 시간" v={g.bestTime} />
          <Row k="체류 시간" v={item?.stay ? `${fmtMinutes(item.stay)} (일정 기준)` : g.recommendedStay} />
          <Row
            k="영업시간"
            v={
              resolved?.openingHours ? (
                <div className="space-y-0.5 text-[13px]">
                  {resolved.openingHours.map((h) => (
                    <div key={h}>{h}</div>
                  ))}
                  <div className="pt-1 text-[11px] text-ink-mute">Google Places 기준 · 12월 특별 영업시간은 확인 필요</div>
                </div>
              ) : undefined
            }
          />
          <Row k={isFood ? "식사 비용" : "예상 비용"} v={g.mealCost ?? g.cost} />
          {resolved?.rating != null && (
            <Row k="Google 평점" v={`★ ${resolved.rating.toFixed(1)} (${resolved.ratingCount?.toLocaleString() ?? 0}개 리뷰)`} />
          )}
          <Row
            k="홈페이지"
            v={
              resolved?.websiteUri || g.officialUrl ? (
                <a href={resolved?.websiteUri ?? g.officialUrl} target="_blank" rel="noopener noreferrer" className="break-all text-sky-600 underline">
                  {(resolved?.websiteUri ?? g.officialUrl)!.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
              ) : undefined
            }
          />
        </div>

        <List title={isFood ? "🍽️ 추천 메뉴" : "✨ 대표 볼거리"} items={g.menu ?? g.highlights} />
        {isFood && g.highlights && <List title="✨ 포인트" items={g.highlights} />}
        <List title="📸 사진 찍기 좋은 위치" items={g.photoSpots} />
        <List title="💡 팁" items={g.tips} />
        {item?.memo && <List title="📝 메모" items={[item.memo]} />}

        <p className="mt-5 text-[11px] leading-relaxed text-ink-mute">
          주소·좌표·영업시간·평점은 Google Places API 응답만 표시합니다. 추천 메뉴·비용·사진 위치는 참고용 가이드이며 변동될 수 있습니다.
        </p>
      </div>
    </Modal>
  );
}
