"use client";

import { fmtDistance, gmapsDirUrl } from "@/lib/geo";
import { LEG_MODE, vehicleMeta } from "@/lib/meta";
import { useTrip } from "@/lib/store";
import { fetchRoute, useApi, type Leg } from "@/lib/trip";
import { fmtDuration } from "@/lib/time";
import type { RouteResult, RouteStep } from "@/lib/types";
import { cn } from "./ui";

function summarize(steps: RouteStep[]) {
  // 연속 도보는 합쳐서 표시
  const out: RouteStep[] = [];
  for (const s of steps) {
    const last = out[out.length - 1];
    if (last && last.mode === "WALK" && s.mode === "WALK") {
      last.durationSec = (last.durationSec ?? 0) + (s.durationSec ?? 0);
      last.distanceM = (last.distanceM ?? 0) + (s.distanceM ?? 0);
    } else out.push({ ...s });
  }
  return out;
}

const hhmm = (iso?: string) =>
  iso ? new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Hong_Kong", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso)) : "";

export function TransitChips({ route }: { route: RouteResult }) {
  if (!route.steps?.length) return null;
  const steps = summarize(route.steps);
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {steps.map((s, i) => {
        if (s.mode === "WALK")
          return (
            <span key={i} className="text-[11px] text-ink-mute">
              🚶{fmtDuration(s.durationSec)}
              {i < steps.length - 1 && " ›"}
            </span>
          );
        const v = vehicleMeta(s.vehicle);
        return (
          <span key={i} className="inline-flex items-center gap-1">
            <span className="rounded-md px-1.5 py-0.5 text-[11px] font-bold text-white" style={{ background: s.lineColor || v.color }}>
              {v.icon} {s.lineName ?? v.label}
            </span>
            {i < steps.length - 1 && <span className="text-[11px] text-ink-mute">›</span>}
          </span>
        );
      })}
    </div>
  );
}

export function TransitDetail({ route }: { route: RouteResult }) {
  const steps = summarize(route.steps ?? []);
  return (
    <ol className="mt-2 space-y-1.5 border-l-2 border-sky-100 pl-3">
      {steps.map((s, i) => {
        if (s.mode !== "TRANSIT")
          return (
            <li key={i} className="text-[12px] text-ink-soft">
              {s.mode === "WALK" ? "🚶 도보" : "🚕 차량"} {fmtDuration(s.durationSec)} · {fmtDistance(s.distanceM)}
            </li>
          );
        const v = vehicleMeta(s.vehicle);
        return (
          <li key={i} className="text-[12px] text-ink-soft">
            <span className="font-semibold text-ink">
              {v.icon} {s.lineName ?? v.label}
            </span>{" "}
            {s.headsign && <span className="text-ink-mute">({s.headsign} 방면)</span>}
            <div>
              {s.departureStop} {hhmm(s.departureTime)} → {s.arrivalStop} {hhmm(s.arrivalTime)}
              {s.stopCount ? ` · ${s.stopCount}정거장` : ""}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function LegInfo({ leg, date, expanded }: { leg: Leg; date: string; expanded?: boolean }) {
  const route = useTrip((s) => (leg.routeKey ? s.routes[leg.routeKey] : undefined));
  const server = useApi((s) => s.server);
  if (leg.none) return null;
  const mode = LEG_MODE[leg.mode];
  const link = gmapsDirUrl({
    origin: { lat: leg.from?.lat, lng: leg.from?.lng, placeId: leg.from?.placeId },
    dest: { lat: leg.to?.lat, lng: leg.to?.lng, placeId: leg.to?.placeId },
    mode: mode.gmaps,
  });

  let body: React.ReactNode;
  if (leg.missing) {
    body = <span className="text-ink-mute">위치 확인 필요 — 경로 계산 불가</span>;
  } else if (!server) {
    body = (
      <span className="text-ink-mute">
        실제 경로 미계산 (API 키 필요){leg.straightM != null && ` · 직선거리 약 ${fmtDistance(leg.straightM)}`}
      </span>
    );
  } else if (!route) {
    body = leg.from?.placeId && leg.to?.placeId ? <span className="text-ink-mute">경로 계산 중…</span> : <span className="text-ink-mute">장소 확인 대기 중…</span>;
  } else if (route.status === "ok") {
    body = (
      <>
        <span className="font-semibold text-ink">{fmtDuration(route.durationSec)}</span>
        <span className="text-ink-mute"> · {fmtDistance(route.distanceM)}</span>
      </>
    );
  } else if (route.status === "unsupported") {
    body = <span className="text-amber-700">Google 경로 미지원 구간{leg.note ? ` (${leg.note})` : ""} — 외부 길찾기로 확인</span>;
  } else {
    body = (
      <span className="text-red-600">
        경로 오류: {route.message ?? "알 수 없음"}{" "}
        <button className="underline" onClick={() => fetchRoute(leg, date)}>
          다시 시도
        </button>
      </span>
    );
  }

  return (
    <div className="relative py-1.5 pl-[58px] pr-1">
      <div className={cn("rounded-2xl border border-dashed border-sky-200 bg-sky-50/50 px-3 py-2 text-[12px]")}>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="mr-1">{mode.icon}</span>
            <span className="text-ink-soft">{mode.label}</span>
            {leg.note && route?.status !== "unsupported" && <span className="text-ink-mute"> · {leg.note}</span>}
            <span className="text-ink-mute"> · </span>
            {body}
          </div>
          <a href={link} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-lg bg-white px-2 py-1 text-[11px] font-semibold text-sky-700 shadow-soft">
            길찾기 ↗
          </a>
        </div>
        {route?.status === "ok" && route.steps && (expanded ? <TransitDetail route={route} /> : <TransitChips route={route} />)}
      </div>
    </div>
  );
}
