"use client";

import { useEffect, useState } from "react";
import { useTrip } from "@/lib/store";
import { BASE_PATH } from "@/lib/env";
import { useApiBootstrap, useOnline, useResolveAll } from "@/lib/trip";
import { useToast } from "./toast";
import { Toast, cn } from "./ui";

import Home from "./Home";
import Planner from "./Planner";
import Favorites from "./Favorites";
import Prep from "./Prep";
import Settings from "./Settings";

type Tab = "home" | "plan" | "fav" | "prep" | "settings";
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "home", label: "홈", icon: "⌂" },
  { key: "plan", label: "지도·일정", icon: "🗺️" },
  { key: "fav", label: "즐겨찾기", icon: "☆" },
  { key: "prep", label: "준비·경비", icon: "✓" },
  { key: "settings", label: "설정", icon: "⚙︎" },
];

function Splash() {
  return (
    <div className="grid h-[100dvh] place-items-center">
      <div className="text-center">
        <div className="text-4xl">🇭🇰</div>
        <div className="mt-2 text-[14px] font-semibold text-ink-soft">Hong Kong Trip 2026</div>
      </div>
    </div>
  );
}

export default function AppShell() {
  const [tab, setTab] = useState<Tab>("home");
  const [hydrated, setHydrated] = useState(false);
  const msg = useToast((s) => s.msg);
  const online = useOnline();
  useApiBootstrap();
  useResolveAll();

  useEffect(() => {
    // zustand persist 복원 대기
    const done = () => setHydrated(true);
    if (useTrip.persist.hasHydrated()) done();
    const unsub = useTrip.persist.onFinishHydration(done);
    const h = location.hash.replace("#", "") as Tab;
    if (TABS.some((t) => t.key === h)) setTab(h);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register(`${BASE_PATH}/sw.js`, { scope: `${BASE_PATH}/` }).catch(() => {});
    }
    return unsub;
  }, []);

  const go = (t: Tab) => {
    setTab(t);
    history.replaceState(null, "", `#${t}`);
    window.scrollTo({ top: 0 });
  };

  if (!hydrated) return <Splash />;

  return (
    <div className="min-h-[100dvh] bg-ivory-100">
      {!online && (
        <div className="fixed inset-x-0 top-0 z-[900] bg-ink px-3 pb-1 pt-[max(4px,env(safe-area-inset-top))] text-center text-[12px] text-white">
          오프라인 — 저장된 일정으로 보고 있어요
        </div>
      )}
      <main>
        {tab === "home" && (
          <Home
            goPlanner={(day, overview) => {
              const s = useTrip.getState();
              if (day != null) s.setSelectedDay(day);
              if (overview) s.setOverview(true);
              go("plan");
            }}
          />
        )}
        {tab === "plan" && <Planner />}
        {tab === "fav" && <Favorites />}
        {tab === "prep" && <Prep />}
        {tab === "settings" && <Settings />}
      </main>

      <nav
        className={cn(
          "fixed inset-x-0 bottom-0 z-[800] border-t border-ivory-200 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl",
          tab === "plan" && "md:left-0 md:right-auto md:w-[430px] lg:w-[470px]",
        )}
      >
        <div className="mx-auto flex max-w-3xl">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => go(t.key)}
              className={cn("flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold", tab === t.key ? "text-sky-600" : "text-ink-mute")}
            >
              <span className={cn("text-[19px] leading-6", tab === t.key ? "" : "grayscale opacity-70")}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
      <Toast message={msg} />
    </div>
  );
}
