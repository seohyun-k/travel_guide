"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** 드래그 가능한 하단 시트. snap: 0=접힘, 1=중간, 2=전체 */
export default function BottomSheet({
  header,
  children,
  snap,
  onSnap,
  peek = 168,
}: {
  header: ReactNode;
  children: ReactNode;
  snap: number;
  onSnap: (s: number) => void;
  peek?: number;
}) {
  const [vh, setVh] = useState(800);
  const [drag, setDrag] = useState<number | null>(null);
  const start = useRef<{ y: number; h: number; t: number } | null>(null);

  useEffect(() => {
    const f = () => setVh(window.innerHeight);
    f();
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);

  const heights = [peek, Math.round(vh * 0.52), Math.round(vh * 0.9) - 64];
  const h = drag ?? heights[snap];

  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button,a,input,select,textarea")) return;
    start.current = { y: e.clientY, h: heights[snap], t: Date.now() };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    const nh = Math.min(heights[2] + 20, Math.max(peek - 40, start.current.h - (e.clientY - start.current.y)));
    setDrag(nh);
  };
  const onUp = (e: React.PointerEvent) => {
    if (!start.current) return;
    const dy = e.clientY - start.current.y;
    const dt = Date.now() - start.current.t;
    const cur = drag ?? heights[snap];
    start.current = null;
    setDrag(null);
    if (Math.abs(dy) < 6) {
      onSnap(snap === 0 ? 1 : snap); // 탭: 접힘이면 펼치기
      return;
    }
    const v = dy / Math.max(dt, 1);
    if (v > 0.6) return onSnap(Math.max(0, snap - 1));
    if (v < -0.6) return onSnap(Math.min(2, snap + 1));
    let best = 0;
    heights.forEach((x, i) => Math.abs(x - cur) < Math.abs(heights[best] - cur) && (best = i));
    onSnap(best);
  };

  return (
    <div
      className="absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-[28px] bg-ivory-50 shadow-[0_-8px_30px_rgba(31,36,48,0.12)]"
      style={{ height: h, transition: drag == null ? "height .32s cubic-bezier(.2,.8,.2,1)" : "none" }}
    >
      <div className="shrink-0 touch-none select-none" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <div className="mx-auto mb-1 mt-2.5 h-1.5 w-11 rounded-full bg-ink/15" />
        {header}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(84px+env(safe-area-inset-bottom))]">{children}</div>
    </div>
  );
}
