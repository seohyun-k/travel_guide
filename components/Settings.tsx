"use client";

import { useEffect, useRef, useState } from "react";
import { exportData, getPlace, useTrip } from "@/lib/store";
import { MAPS_KEY, allPlaceKeys, resolvePlace, useApi, useOnline } from "@/lib/trip";
import { Badge, Button, Card, Section } from "./ui";
import { toast } from "./toast";

function Status({ ok, label, desc }: { ok: boolean | null; label: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className={ok == null ? "text-ink-mute" : ok ? "text-emerald-600" : "text-red-500"}>{ok == null ? "…" : ok ? "●" : "○"}</span>
      <div className="min-w-0">
        <div className="text-[14px] font-semibold text-ink">{label}</div>
        <div className="text-[12px] text-ink-mute">{desc}</div>
      </div>
    </div>
  );
}

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
}

export default function Settings() {
  const server = useApi((s) => s.server);
  const provider = useApi((s) => s.provider);
  const online = useOnline();
  const days = useTrip((s) => s.days);
  const custom = useTrip((s) => s.customPlaces);
  const resolved = useTrip((s) => s.resolved);
  const routes = useTrip((s) => s.routes);
  const { importData, resetAll, clearRoutes, clearResolved } = useTrip.getState();
  const fileRef = useRef<HTMLInputElement>(null);
  const [install, setInstall] = useState<BIPEvent | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const h = (e: Event) => {
      e.preventDefault();
      setInstall(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  const keys = allPlaceKeys(days).filter((k) => !getPlace(k, custom)?.noMap);
  const counts = { ok: 0, mismatch: 0, not_found: 0, error: 0, none: 0 };
  keys.forEach((k) => {
    const r = resolved[k];
    if (!r) counts.none++;
    else counts[r.status]++;
  });
  const issues = keys.filter((k) => resolved[k] && resolved[k].status !== "ok");

  const download = () => {
    const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `hk-trip-2026-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("여행 데이터를 내보냈습니다");
  };

  const onFile = async (f?: File) => {
    if (!f) return;
    try {
      importData(JSON.parse(await f.text()));
      toast("여행 데이터를 가져왔습니다");
    } catch (e) {
      toast(`가져오기 실패: ${(e as Error).message}`);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const reverify = async () => {
    setBusy(true);
    clearResolved();
    for (let i = 0; i < keys.length; i += 4) await Promise.all(keys.slice(i, i + 4).map((k) => resolvePlace(k, true)));
    setBusy(false);
    toast("모든 장소를 다시 확인했습니다");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-[max(16px,env(safe-area-inset-top))]">
      <h1 className="text-[24px] font-extrabold text-ink">설정</h1>

      <Section title="연결 상태">
        <Card className="divide-y divide-ivory-200 px-4">
          <Status ok={online} label="인터넷" desc={online ? "온라인" : "오프라인 — 저장된 일정·경로·체크리스트는 계속 볼 수 있어요"} />
          <Status ok={!!MAPS_KEY} label="Google Maps JavaScript API" desc={MAPS_KEY ? "지도 키 설정됨 (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)" : "키 없음 — 샘플 지도(OpenStreetMap, 근사 위치)로 표시"} />
          <Status
            ok={server}
            label="장소 검증 · 경로 계산"
            desc={
              provider === "server"
                ? "서버 모드 — Places API·Routes API (GOOGLE_MAPS_SERVER_KEY)"
                : provider === "client"
                  ? "브라우저 모드 — Maps JavaScript API의 Places·Directions 사용"
                  : "API 키 없음 — 장소 검증·경로 계산 비활성"
            }
          />
        </Card>
      </Section>

      <Section title="장소 검증 (Google Places)">
        <Card className="p-4">
          <div className="flex flex-wrap gap-1.5">
            <Badge color="#2E7D5B" bg="#E3F4EC">확인 {counts.ok}</Badge>
            <Badge color="#B7791F" bg="#FDF3DC">주소 대조 필요 {counts.mismatch}</Badge>
            <Badge color="#C0392B" bg="#FBE7E4">확인 불가 {counts.not_found}</Badge>
            <Badge color="#8A90A0" bg="#EEF0F3">미확인 {counts.none + counts.error}</Badge>
          </div>
          {issues.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {issues.map((k) => (
                <li key={k} className="text-[13px] text-ink-soft">
                  <b className="text-ink">{getPlace(k, custom)?.nameKo}</b> — {resolved[k].message ?? resolved[k].status}
                  {resolved[k].address && <div className="text-[11px] text-ink-mute">Google 결과: {resolved[k].name} · {resolved[k].address}</div>}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[12px] text-ink-mute">
            ‘확인 불가’ 장소는 일정 편집 → 장소 → Google 장소 검색으로 실제 장소를 지정하세요. 앱은 확인되지 않은 장소의 좌표나 경로를 만들어내지 않습니다.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={reverify} disabled={!server || !online || busy}>
              {busy ? "확인 중…" : "↻ 모든 장소 다시 확인"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!server || !online}
              onClick={() => {
                clearRoutes();
                toast("경로 캐시를 비웠습니다 · 지도에서 다시 계산합니다");
              }}
            >
              🧭 경로 다시 계산 ({Object.keys(routes).length})
            </Button>
          </div>
        </Card>
      </Section>

      <Section title="데이터">
        <Card className="space-y-2 p-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={download}>⬇️ JSON 내보내기</Button>
            <Button onClick={() => fileRef.current?.click()}>⬆️ JSON 가져오기</Button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
          <Button
            variant="danger"
            onClick={() => {
              if (confirm("모든 일정·체크리스트·경비를 초기 상태로 되돌릴까요? (되돌릴 수 없음)")) {
                resetAll();
                toast("초기 추천 일정으로 되돌렸습니다");
              }
            }}
          >
            ↺ 전체 초기화
          </Button>
          <p className="text-[12px] text-ink-mute">모든 변경 사항은 이 기기의 브라우저(localStorage)에 자동 저장됩니다.</p>
        </Card>
      </Section>

      <Section title="홈 화면에 설치 (PWA)">
        <Card className="p-4 text-[13px] leading-relaxed text-ink-soft">
          {install ? (
            <Button variant="primary" onClick={() => install.prompt().then(() => setInstall(null))}>
              📲 앱 설치
            </Button>
          ) : (
            <>
              <b className="text-ink">iPhone (Safari)</b>: 공유 버튼 → ‘홈 화면에 추가’
              <br />
              <b className="text-ink">Android (Chrome)</b>: 메뉴 ⋮ → ‘앱 설치’ 또는 ‘홈 화면에 추가’
            </>
          )}
          <p className="mt-2 text-[12px] text-ink-mute">설치 후 한 번 온라인으로 열어 두면, 인터넷이 불안정해도 일정을 볼 수 있습니다.</p>
        </Card>
      </Section>

      <Section title="데이터 출처">
        <Card className="p-4 text-[12px] leading-relaxed text-ink-mute">
          장소 위치·주소·영업시간·평점·사진: Google Places API (New) · 경로·소요 시간·대중교통 노선: Google Routes API · 지도: Google Maps JavaScript API
          (키 없을 때 OpenStreetMap). 추천 메뉴·예상 비용·사진 스팟은 참고용 가이드입니다. 개장·공연·페리 시간은 공식 사이트에서 확인하세요.
        </Card>
      </Section>
    </div>
  );
}
