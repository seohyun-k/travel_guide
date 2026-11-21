"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useGeo } from "@/lib/geo-hook";
import { useMapData, type MapMarker } from "@/lib/mapdata";
import { DAY_COLORS } from "@/lib/meta";
import { useTrip } from "@/lib/store";
import { MAPS_KEY, useApi, useOnline } from "@/lib/trip";
import { cn } from "./ui";

const GoogleMap = dynamic(() => import("./GoogleMap"), { ssr: false });
const SampleMap = dynamic(() => import("./SampleMap"), { ssr: false });

export default function MapPanel({
  dayIndexes,
  overview,
  onSelectMarker,
  compact,
  className,
  topOffset = 0,
}: {
  dayIndexes: number[];
  overview: boolean;
  onSelectMarker?: (m: MapMarker) => void;
  compact?: boolean;
  className?: string;
  topOffset?: number;
}) {
  const data = useMapData(dayIndexes);
  const selectedItemId = useTrip((s) => s.selectedItemId);
  const selectedDay = useTrip((s) => s.selectedDay);
  const server = useApi((s) => s.server);
  const online = useOnline();
  const geo = useGeo();
  const [fit, setFit] = useState(1);
  const [fail, setFail] = useState<string | null>(null);
  const useGoogle = !!MAPS_KEY && !fail && online;
  const fitKey = useMemo(() => `${dayIndexes.join(",")}|${overview}`, [dayIndexes, overview]);
  const [lastFitKey, setLastFitKey] = useState(fitKey);
  if (fitKey !== lastFitKey) {
    setLastFitKey(fitKey);
    setFit((f) => f + 1);
  }

  const segs = data.segments;
  const pending = segs.filter((s) => !s.route).length;
  const unsupported = segs.filter((s) => s.route && s.route.status !== "ok").length;
  const common = {
    markers: data.markers,
    selectedItemId,
    overview,
    activeDay: overview ? undefined : selectedDay,
    onSelectMarker: onSelectMarker ?? (() => {}),
    fitSignal: fit,
    interactive: !compact,
  };

  return (
    <div className={cn("relative isolate z-0 h-full w-full overflow-hidden", className)}>
      <div className="absolute inset-0 z-0">{useGoogle ? <GoogleMap {...common} segments={segs} onFail={setFail} /> : <SampleMap {...common} />}</div>

      {!compact && (
        <>
          {/* 상태 배너 */}
          <div className="pointer-events-none absolute inset-x-3 z-10 flex flex-col items-start gap-1.5 pr-14" style={{ top: topOffset + 10 }}>
            {!useGoogle && (
              <div className="pointer-events-auto max-w-[min(92%,420px)] rounded-2xl bg-white/95 px-3 py-2 text-[12px] leading-snug text-ink-soft shadow-soft backdrop-blur">
                <b className="text-ink">샘플 지도</b> ·{" "}
                {!online
                  ? "오프라인 상태입니다. 저장된 일정은 계속 볼 수 있어요."
                  : fail
                    ? fail
                    : "Google Maps API 키가 없어 근사 위치만 표시합니다. 경로선은 표시하지 않습니다."}
              </div>
            )}
            {useGoogle && server === false && (
              <div className="pointer-events-auto rounded-2xl bg-white/95 px-3 py-2 text-[12px] text-ink-soft shadow-soft">
                서버 키 미설정 — 장소 검증·실제 경로 계산이 비활성화되어 있습니다 (근사 위치 표시)
              </div>
            )}
            {useGoogle && server && (data.loading || pending > 0) && (
              <div className="rounded-full bg-white/95 px-3 py-1.5 text-[12px] text-ink-soft shadow-soft">경로 계산 중… {pending > 0 ? `(${pending}구간)` : ""}</div>
            )}
            {useGoogle && server && unsupported > 0 && !data.loading && (
              <div className="rounded-full bg-amber-50/95 px-3 py-1.5 text-[12px] text-amber-800 shadow-soft">
                {unsupported}개 구간은 Google 경로 미지원 — 일정표의 길찾기 링크 이용
              </div>
            )}
            {data.hidden.length > 0 && (
              <div className="rounded-full bg-white/95 px-3 py-1.5 text-[12px] text-ink-mute shadow-soft">위치 미확인 {data.hidden.length}곳은 지도에서 제외</div>
            )}
            {geo.error && (
              <div className="pointer-events-auto rounded-2xl bg-red-50/95 px-3 py-2 text-[12px] text-red-700 shadow-soft">📍 {geo.error}</div>
            )}
          </div>

          {/* 컨트롤 */}
          <div className="absolute right-3 z-10 flex flex-col gap-2" style={{ top: topOffset + 10 }}>
            <button
              onClick={() => (geo.watching && geo.pos ? geo.stop() : geo.start())}
              aria-label="현재 위치"
              className={cn("grid h-11 w-11 place-items-center rounded-2xl bg-white shadow-lift text-lg", geo.watching && "text-sky-600 ring-2 ring-sky-300")}
            >
              ◎
            </button>
            <button onClick={() => setFit((f) => f + 1)} aria-label="전체 경로 맞춤" className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-lg shadow-lift">
              ⤢
            </button>
          </div>

          {/* 범례 */}
          {overview && (
            <div className="absolute left-3 z-10 flex flex-wrap gap-1.5" style={{ top: topOffset + 54 }}>
              {dayIndexes.map((d) => (
                <span key={d} className="rounded-full bg-white/95 px-2 py-1 text-[11px] font-semibold shadow-soft" style={{ color: DAY_COLORS[d] }}>
                  ● DAY {d + 1}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
