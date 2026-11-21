"use client";

import { useState } from "react";
import { CATEGORY } from "@/lib/meta";
import { useApi, useOnline } from "@/lib/trip";
import { BASE_PATH } from "@/lib/env";
import type { Place, ResolvedPlace } from "@/lib/types";
import { cn } from "./ui";

/** Google Places 사진 (서버 프록시). 사진이 없으면 카테고리 일러스트 */
export default function PlacePhoto({
  place,
  resolved,
  className,
  width = 400,
  showCredit,
}: {
  place?: Place;
  resolved?: ResolvedPlace;
  className?: string;
  width?: number;
  showCredit?: boolean;
}) {
  const server = useApi((s) => s.server);
  const online = useOnline();
  const [failed, setFailed] = useState(false);
  const cat = CATEGORY[place?.category ?? "event"];
  const provider = useApi((s) => s.provider);
  const src =
    !server || !online || failed
      ? null
      : resolved?.photoUrl
        ? resolved.photoUrl
        : provider === "server" && resolved?.photoName
          ? `${BASE_PATH}/api/places/photo?name=${encodeURIComponent(resolved.photoName)}&w=${width}`
          : null;
  return (
    <div className={cn("relative overflow-hidden", className)} style={{ background: `linear-gradient(135deg, ${cat.bg}, #fff)` }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={place?.nameKo ?? ""} loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center text-3xl opacity-80">{cat.icon}</div>
      )}
      {src && showCredit && resolved?.photoAttribution && (
        <span className="absolute bottom-1.5 right-2 rounded bg-black/40 px-1.5 py-0.5 text-[10px] text-white">사진: {resolved.photoAttribution} · Google</span>
      )}
    </div>
  );
}
