"use client";

import { useMemo } from "react";
import { DAY_COLORS } from "./meta";
import { getPlace, useTrip } from "./store";
import { placePos, useRoutesFor, type Leg, type PlacePos } from "./trip";
import type { Category, RouteResult } from "./types";

export interface MapMarker {
  key: string; // dayIndex:placeKey
  placeKey: string;
  itemIds: string[];
  dayIndex: number;
  nums: number[];
  name: string;
  category: Category;
  pos: PlacePos;
  color: string;
}

export interface MapSegment {
  id: string;
  dayIndex: number;
  leg: Leg;
  fromName: string;
  toName: string;
  route?: RouteResult;
  color: string;
}

export function useMapData(dayIndexes: number[]) {
  const days = useTrip((s) => s.days);
  const custom = useTrip((s) => s.customPlaces);
  const resolved = useTrip((s) => s.resolved);
  const { legsByDay, routes, loading } = useRoutesFor(dayIndexes);

  return useMemo(() => {
    const markers: MapMarker[] = [];
    const segments: MapSegment[] = [];
    const hidden: { itemId: string; name: string }[] = [];
    dayIndexes.forEach((di, k) => {
      const day = days[di];
      if (!day) return;
      const color = DAY_COLORS[di % DAY_COLORS.length];
      const byPlace = new Map<string, MapMarker>();
      day.items.forEach((it, idx) => {
        const p = getPlace(it.placeKey, custom);
        if (!p || p.noMap) return;
        const pos = placePos(p, it.placeKey ? resolved[it.placeKey] : undefined);
        if (!pos) {
          hidden.push({ itemId: it.id, name: p.nameKo });
          return;
        }
        const mk = `${di}:${it.placeKey}`;
        const ex = byPlace.get(mk);
        if (ex) {
          ex.itemIds.push(it.id);
          ex.nums.push(idx + 1);
        } else {
          const m: MapMarker = { key: mk, placeKey: it.placeKey!, itemIds: [it.id], dayIndex: di, nums: [idx + 1], name: p.nameKo, category: p.category, pos, color };
          byPlace.set(mk, m);
          markers.push(m);
        }
      });
      (legsByDay[k] ?? []).forEach((leg, li) => {
        if (leg.none) return;
        const fp = getPlace(leg.fromKey, custom), tp = getPlace(leg.toKey, custom);
        segments.push({
          id: `${di}-${li}`,
          dayIndex: di,
          leg,
          fromName: fp?.nameKo ?? "",
          toName: tp?.nameKo ?? "",
          route: leg.routeKey ? routes[leg.routeKey] : undefined,
          color,
        });
      });
    });
    return { markers, segments, hidden, loading };
  }, [dayIndexes, days, custom, resolved, legsByDay, routes, loading]);
}
