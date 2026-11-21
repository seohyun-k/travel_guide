"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LMap, Marker, CircleMarker } from "leaflet";
import { useGeo } from "@/lib/geo-hook";
import type { MapMarker } from "@/lib/mapdata";
import { CATEGORY } from "@/lib/meta";

/**
 * API 키가 없을 때 쓰는 샘플 지도 (OpenStreetMap).
 * 근사 좌표 마커만 표시하며 경로선은 그리지 않는다 (검증되지 않은 경로 표시 금지).
 */
export default function SampleMap({
  markers,
  selectedItemId,
  overview,
  activeDay,
  onSelectMarker,
  fitSignal,
  interactive = true,
}: {
  markers: MapMarker[];
  selectedItemId: string | null;
  overview: boolean;
  activeDay?: number;
  onSelectMarker: (m: MapMarker) => void;
  fitSignal: number;
  interactive?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null);
  const L = useRef<typeof import("leaflet") | null>(null);
  const objs = useRef<Marker[]>([]);
  const me = useRef<CircleMarker | null>(null);
  const geo = useGeo();
  const sel = useRef(onSelectMarker);
  sel.current = onSelectMarker;
  const readyRef = useRef(0);

  useEffect(() => {
    let dead = false;
    import("leaflet").then((mod) => {
      if (dead || !ref.current || map.current) return;
      L.current = mod;
      map.current = mod.map(ref.current, {
        center: [22.2855, 114.158],
        zoom: 13,
        zoomControl: false,
        dragging: interactive,
        scrollWheelZoom: interactive,
        touchZoom: interactive,
        doubleClickZoom: interactive,
        attributionControl: true,
      });
      mod.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(map.current);
      readyRef.current++;
      draw();
      fit();
    });
    return () => {
      dead = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const draw = () => {
    const m = map.current, l = L.current;
    if (!m || !l) return;
    objs.current.forEach((o) => o.remove());
    objs.current = markers.map((mk) => {
      const active = !!selectedItemId && mk.itemIds.includes(selectedItemId);
      const dim = overview && activeDay != null && mk.dayIndex !== activeDay;
      const label = mk.category === "hotel" ? "H" : overview ? `${mk.dayIndex + 1}` : mk.nums.slice(0, 2).join("·");
      const bg = mk.category === "hotel" ? "#1F2430" : mk.color;
      const icon = l.divIcon({
        className: "",
        iconSize: [34, 34],
        iconAnchor: [4, 34],
        html: `<div class="hk-pin unverified${active ? " active" : ""}" style="background:${bg};opacity:${dim ? 0.35 : 1}"><span>${label}</span><i class="hk-pin-emoji" style="font-style:normal">${CATEGORY[mk.category].icon}</i></div>`,
      });
      const o = l.marker([mk.pos.lat, mk.pos.lng], { icon, title: mk.name, zIndexOffset: active ? 1000 : 0 }).addTo(m);
      o.on("click", () => sel.current(mk));
      return o;
    });
  };
  const fit = () => {
    const m = map.current, l = L.current;
    if (!m || !l || !markers.length) return;
    if (markers.length === 1) m.setView([markers[0].pos.lat, markers[0].pos.lng], 16);
    else m.fitBounds(l.latLngBounds(markers.map((x) => [x.pos.lat, x.pos.lng])), { paddingTopLeft: [30, 70], paddingBottomRight: [30, interactive ? 140 : 20] });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(draw, [markers, selectedItemId, overview, activeDay]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(fit, [fitSignal]);
  useEffect(() => {
    const m = map.current;
    if (!m || !selectedItemId) return;
    const mk = markers.find((x) => x.itemIds.includes(selectedItemId));
    if (mk) m.setView([mk.pos.lat, mk.pos.lng], Math.max(m.getZoom(), 16));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItemId]);
  useEffect(() => {
    const m = map.current, l = L.current;
    if (!m || !l) return;
    if (!geo.pos) {
      me.current?.remove();
      me.current = null;
      return;
    }
    if (!me.current) {
      me.current = l.circleMarker([geo.pos.lat, geo.pos.lng], { radius: 8, color: "#fff", weight: 3, fillColor: "#3b82f6", fillOpacity: 1 }).addTo(m);
      m.setView([geo.pos.lat, geo.pos.lng], 16);
    } else me.current.setLatLng([geo.pos.lat, geo.pos.lng]);
  }, [geo.pos]);

  return <div ref={ref} className="h-full w-full" />;
}
