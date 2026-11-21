export const HK_TZ = "Asia/Hong_Kong";
const WD = ["일", "월", "화", "수", "목", "금", "토"];

export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
export const toHHMM = (min: number) => {
  const t = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

/** 홍콩 현지 날짜 YYYY-MM-DD 와 분 */
export function hkNow(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: HK_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const hour = g("hour") === "24" ? "00" : g("hour");
  return { date: `${g("year")}-${g("month")}-${g("day")}`, minutes: Number(hour) * 60 + Number(g("minute")) };
}

export function dayDiff(from: string, to: string) {
  const a = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10));
  const b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10));
  return Math.round((b - a) / 86400000);
}

export function fmtDate(date: string, withWeekday = true) {
  const d = new Date(`${date}T00:00:00Z`);
  const s = `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
  return withWeekday ? `${s} (${WD[d.getUTCDay()]})` : s;
}
export const shortDate = (date: string) => `${+date.slice(5, 7)}/${+date.slice(8, 10)}`;
export const weekday = (date: string) => WD[new Date(`${date}T00:00:00Z`).getUTCDay()];

/** 홍콩 현지 날짜+시각 → ISO (UTC+8 고정, 홍콩은 서머타임 없음) */
export const hkIso = (date: string, hhmm: string) => `${date}T${hhmm}:00+08:00`;

export function fmtDuration(sec?: number) {
  if (sec == null) return "확인 필요";
  const m = Math.max(1, Math.round(sec / 60));
  if (m < 60) return `${m}분`;
  return `${Math.floor(m / 60)}시간${m % 60 ? ` ${m % 60}분` : ""}`;
}
export const fmtMinutes = (m: number) => fmtDuration(m * 60);
