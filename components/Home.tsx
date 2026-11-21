"use client";

import { useEffect, useMemo, useState } from "react";
import { TRIP } from "@/lib/data/itinerary";
import { PLACES } from "@/lib/data/places";
import { gmapsDirUrl } from "@/lib/geo";
import { CATEGORY, DAY_COLORS } from "@/lib/meta";
import { getPlace, useTrip } from "@/lib/store";
import { useLegs, usePlace } from "@/lib/trip";
import { dayDiff, fmtDate, fmtDuration, hkNow, toMin } from "@/lib/time";
import MapPanel from "./MapPanel";
import PlacePhoto from "./PlacePhoto";
import { VerifyBadge } from "./PlaceDetail";
import { Card, LinkButton, Section } from "./ui";

function useNow() {
  const [now, setNow] = useState(() => hkNow());
  useEffect(() => {
    const t = setInterval(() => setNow(hkNow()), 30_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function NextUp({ dayIndex, live, nowMin }: { dayIndex: number; live: boolean; nowMin: number }) {
  const day = useTrip((s) => s.days[dayIndex]);
  const custom = useTrip((s) => s.customPlaces);
  const routes = useTrip((s) => s.routes);
  const legs = useLegs(dayIndex);
  // 현재 진행 중 / 다음 일정
  let nextIdx = live ? day.items.findIndex((x) => toMin(x.time) > nowMin) : 0;
  if (nextIdx < 0) nextIdx = -1;
  const next = nextIdx >= 0 ? day.items[nextIdx] : undefined;
  const cur = nextIdx > 0 ? day.items[nextIdx - 1] : live && nextIdx < 0 ? day.items[day.items.length - 1] : undefined;
  const leg = nextIdx > 0 ? legs[nextIdx - 1] : undefined;
  const route = leg?.routeKey ? routes[leg.routeKey] : undefined;
  const place = getPlace(next?.placeKey, custom);
  const { pos, resolved } = usePlace(next?.placeKey);

  if (!next)
    return (
      <Card className="p-4 text-[14px] text-ink-soft">오늘 일정이 모두 끝났어요. 편히 쉬세요 🌙</Card>
    );
  return (
    <Card className="overflow-hidden">
      <div className="flex gap-3 p-4">
        <PlacePhoto place={place} resolved={resolved} className="h-20 w-20 shrink-0 rounded-2xl" width={240} />
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold text-sky-600">{live ? "다음 방문 장소" : "첫 일정"} · {next.time}</div>
          <div className="truncate text-[17px] font-bold text-ink">{place?.nameKo ?? next.activity}</div>
          <div className="truncate text-[13px] text-ink-soft">{next.activity}</div>
          {next.placeKey && (
            <div className="mt-1">
              <VerifyBadge placeKey={next.placeKey} />
            </div>
          )}
        </div>
      </div>
      {cur && leg && !leg.none && (
        <div className="border-t border-ivory-200 bg-sky-50/40 px-4 py-2.5 text-[13px] text-ink-soft">
          {getPlace(cur.placeKey, custom)?.nameKo ?? "이전 장소"}에서 이동 ·{" "}
          {route?.status === "ok" ? <b className="text-ink">약 {fmtDuration(route.durationSec)}</b> : <span className="text-ink-mute">이동 시간 확인 필요</span>}
        </div>
      )}
      {place && !place.noMap && (
        <div className="flex gap-2 px-4 pb-4 pt-2">
          <LinkButton variant="primary" href={gmapsDirUrl({ dest: { lat: pos?.lat, lng: pos?.lng, placeId: pos?.placeId, query: place.query ?? place.nameEn }, mode: "transit" })}>
            🧭 현재 위치에서 길찾기
          </LinkButton>
        </div>
      )}
    </Card>
  );
}

export default function Home({ goPlanner }: { goPlanner: (day?: number, overview?: boolean) => void }) {
  const days = useTrip((s) => s.days);
  const custom = useTrip((s) => s.customPlaces);
  const checklist = useTrip((s) => s.checklist);
  const now = useNow();
  const dd = dayDiff(now.date, TRIP.start);
  const tripDay = dayDiff(TRIP.start, now.date); // 0..4 여행 중
  const live = tripDay >= 0 && tripDay < days.length;
  const todayIdx = live ? tripDay : 0;
  const hotel = usePlace("hotel");
  const allIdx = useMemo(() => days.map((_, i) => i), [days]);

  const dBadge = dd > 0 ? `D-${dd}` : live ? `여행 ${tripDay + 1}일차` : dd === 0 ? "D-DAY" : "여행 완료";
  const done = checklist.filter((c) => c.done).length;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-[max(16px,env(safe-area-inset-top))]">
      {/* 히어로 */}
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-sky-200 via-sky-100 to-ivory-100 p-5 shadow-soft">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/40 blur-2xl" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-white/70 px-3 py-1 text-[12px] font-bold text-sky-700">{dBadge}</span>
            <span className="text-[12px] font-semibold text-ink-soft">🇭🇰 4박 5일</span>
          </div>
          <h1 className="mt-6 text-[30px] font-extrabold leading-none tracking-tight text-ink">Hong Kong Trip 2026</h1>
          <p className="mt-2 text-[14px] text-ink-soft">
            {fmtDate(TRIP.start)} – {fmtDate(TRIP.end)}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-2xl bg-white/70 p-2.5">
              <div className="font-bold text-ink">✈️ {TRIP.flights.outbound.label}</div>
              <div className="text-ink-soft">{TRIP.flights.outbound.depart}</div>
              <div className="text-ink-soft">{TRIP.flights.outbound.arrive}</div>
            </div>
            <div className="rounded-2xl bg-white/70 p-2.5">
              <div className="font-bold text-ink">🛬 {TRIP.flights.inbound.label}</div>
              <div className="text-ink-soft">{TRIP.flights.inbound.depart}</div>
              <div className="text-ink-soft">{TRIP.flights.inbound.arrive}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 오늘 */}
      <Section
        title={live ? `오늘의 일정 · ${days[todayIdx].title}` : "여행 첫날 미리보기"}
        right={
          <button onClick={() => goPlanner(todayIdx)} className="text-[13px] font-semibold text-sky-600">
            전체 보기 ›
          </button>
        }
      >
        <p className="-mt-1 mb-2 px-1 text-[13px] text-ink-mute">{days[todayIdx].theme}</p>
        <NextUp dayIndex={todayIdx} live={live} nowMin={now.minutes} />
      </Section>

      {/* 날짜별 카드 */}
      <Section title="날짜별 일정">
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
          {days.map((d, i) => {
            const places = d.items.map((x) => getPlace(x.placeKey, custom)).filter((p, k, arr) => p && !p.noMap && arr.findIndex((q) => q?.key === p.key) === k);
            return (
              <button
                key={d.date}
                onClick={() => goPlanner(i)}
                className="w-[78%] max-w-[300px] shrink-0 snap-start rounded-3xl bg-white p-4 text-left shadow-soft"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full px-2.5 py-1 text-[11px] font-bold text-white" style={{ background: DAY_COLORS[i] }}>
                    {d.title}
                  </span>
                  <span className="text-[12px] text-ink-mute">{fmtDate(d.date)}</span>
                </div>
                <div className="mt-3 line-clamp-2 min-h-[44px] text-[16px] font-bold leading-snug text-ink">{d.theme}</div>
                <ul className="mt-2 space-y-1">
                  {places.slice(0, 4).map((p) => (
                    <li key={p!.key} className="truncate text-[13px] text-ink-soft">
                      {CATEGORY[p!.category].icon} {p!.nameKo}
                    </li>
                  ))}
                  {places.length > 4 && <li className="text-[12px] text-ink-mute">외 {places.length - 4}곳</li>}
                </ul>
                <div className="mt-3 text-[12px] font-semibold text-sky-600">
                  {d.items[0]?.time} 시작 · {d.items.length}개 일정 ›
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* 지도 미리보기 */}
      <Section
        title="전체 여행 지도"
        right={
          <button onClick={() => goPlanner(0, true)} className="text-[13px] font-semibold text-sky-600">
            크게 보기 ›
          </button>
        }
      >
        <div className="relative h-56 overflow-hidden rounded-3xl shadow-soft">
          <MapPanel dayIndexes={allIdx} overview compact />
          <button className="absolute inset-0 z-[500]" aria-label="전체 지도 열기" onClick={() => goPlanner(0, true)} />
        </div>
      </Section>

      {/* 숙소 */}
      <Section title="숙소">
        <Card className="overflow-hidden">
          <PlacePhoto place={hotel.place} resolved={hotel.resolved} className="h-36 w-full" width={800} showCredit />
          <div className="p-4">
            <div className="flex items-center gap-2">
              <div className="text-[16px] font-bold text-ink">{PLACES.hotel.nameEn}</div>
              <VerifyBadge placeKey="hotel" />
            </div>
            <div className="text-[13px] text-ink-soft">{hotel.resolved?.address ?? PLACES.hotel.refAddress}</div>
            <div className="mt-1 text-[12px] text-ink-mute">12/1 체크인 · 12/5 체크아웃 · 12/3 학회 장소</div>
            <div className="mt-3 flex gap-2">
              <LinkButton
                variant="primary"
                href={gmapsDirUrl({ dest: { lat: hotel.pos?.lat, lng: hotel.pos?.lng, placeId: hotel.pos?.placeId, query: PLACES.hotel.query }, mode: "transit" })}
              >
                🏨 숙소로 길찾기
              </LinkButton>
            </div>
          </div>
        </Card>
      </Section>

      <Section title="준비 현황">
        <Card className="p-4">
          <div className="flex items-center justify-between text-[14px]">
            <span className="font-semibold text-ink">체크리스트</span>
            <span className="text-ink-soft">
              {done}/{checklist.length}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-ivory-200">
            <div className="h-full rounded-full bg-sky-400 transition-all" style={{ width: `${(done / Math.max(1, checklist.length)) * 100}%` }} />
          </div>
        </Card>
      </Section>
    </div>
  );
}
