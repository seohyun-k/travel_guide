"use client";

import { useState } from "react";
import { EXPENSE_CAT } from "@/lib/meta";
import { useTrip } from "@/lib/store";
import { useOnline } from "@/lib/trip";
import { fmtDate } from "@/lib/time";
import type { Expense, ExpenseCategory } from "@/lib/types";
import { Button, Card, Field, Modal, Section, cn, inputCls } from "./ui";
import { toast } from "./toast";

function Checklist() {
  const list = useTrip((s) => s.checklist);
  const { toggleCheck, addCheck, removeCheck } = useTrip.getState();
  const [txt, setTxt] = useState("");
  const done = list.filter((c) => c.done).length;
  return (
    <Section title={`여행 체크리스트 · ${done}/${list.length}`}>
      <Card className="divide-y divide-ivory-200 px-2">
        {list.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-2 py-3">
            <button
              onClick={() => toggleCheck(c.id)}
              aria-label={c.label}
              className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 text-[13px] text-white transition", c.done ? "border-sky-500 bg-sky-500" : "border-ivory-200 bg-white")}
            >
              {c.done && "✓"}
            </button>
            <span className={cn("flex-1 text-[15px]", c.done ? "text-ink-mute line-through" : "text-ink")} onClick={() => toggleCheck(c.id)}>
              {c.label}
            </span>
            <button onClick={() => removeCheck(c.id)} className="px-1 text-[13px] text-ink-mute" aria-label="삭제">
              ✕
            </button>
          </div>
        ))}
        <form
          className="flex gap-2 px-2 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (txt.trim()) addCheck(txt.trim());
            setTxt("");
          }}
        >
          <input className={inputCls} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="항목 추가 (예: 우산)" />
          <Button type="submit" variant="primary">
            추가
          </Button>
        </form>
      </Card>
    </Section>
  );
}

function ExpenseForm({ initial, onClose }: { initial?: Expense; onClose: () => void }) {
  const days = useTrip((s) => s.days);
  const rate = useTrip((s) => s.rateKRW);
  const { addExpense, updateExpense, removeExpense } = useTrip.getState();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [cat, setCat] = useState<ExpenseCategory>(initial?.category ?? "food");
  const [amount, setAmount] = useState(initial ? String(initial.amountHKD) : "");
  const [cur, setCur] = useState<"HKD" | "KRW">("HKD");
  const [kind, setKind] = useState<Expense["kind"]>(initial?.kind ?? "actual");
  const [date, setDate] = useState(initial?.date ?? days[0].date);
  const save = () => {
    const n = Number(amount);
    if (!title.trim() || !n) return toast("항목과 금액을 입력해 주세요");
    const hkd = cur === "HKD" ? n : n / rate;
    const e = { title: title.trim(), category: cat, amountHKD: Math.round(hkd * 100) / 100, kind, date };
    if (initial) updateExpense(initial.id, e);
    else addExpense(e);
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? "지출 수정" : "지출 추가"}
      footer={
        <div className="flex gap-2">
          {initial && (
            <Button variant="danger" onClick={() => (removeExpense(initial.id), onClose())}>
              삭제
            </Button>
          )}
          <Button variant="primary" className="ml-auto" onClick={save}>
            저장
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex gap-1 rounded-xl bg-ivory-200 p-1 text-[13px] font-semibold">
          {(["planned", "actual"] as const).map((k) => (
            <button key={k} onClick={() => setKind(k)} className={cn("flex-1 rounded-lg py-2", kind === k ? "bg-white shadow-soft" : "text-ink-mute")}>
              {k === "planned" ? "예상 지출" : "실제 지출"}
            </button>
          ))}
        </div>
        <Field label="항목">
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 피크트램 왕복" />
        </Field>
        <Field label="카테고리">
          <div className="grid grid-cols-3 gap-1.5">
            {(Object.keys(EXPENSE_CAT) as ExpenseCategory[]).map((c) => (
              <button key={c} onClick={() => setCat(c)} className={cn("rounded-xl py-2 text-[13px] font-semibold", cat === c ? "bg-sky-500 text-white" : "bg-white text-ink-soft shadow-soft")}>
                {EXPENSE_CAT[c].icon} {EXPENSE_CAT[c].label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="금액" hint={amount ? (cur === "HKD" ? `≈ ₩${Math.round(Number(amount) * rate).toLocaleString()}` : `≈ HK$${(Number(amount) / rate).toFixed(1)}`) : undefined}>
          <div className="flex gap-2">
            <input className={inputCls} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" />
            <select className={cn(inputCls, "w-24")} value={cur} onChange={(e) => setCur(e.target.value as "HKD" | "KRW")}>
              <option>HKD</option>
              <option>KRW</option>
            </select>
          </div>
        </Field>
        <Field label="날짜">
          <select className={inputCls} value={date} onChange={(e) => setDate(e.target.value)}>
            {days.map((d) => (
              <option key={d.date} value={d.date}>
                {d.title} · {fmtDate(d.date)}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </Modal>
  );
}

function Budget() {
  const expenses = useTrip((s) => s.expenses);
  const rate = useTrip((s) => s.rateKRW);
  const rateSource = useTrip((s) => s.rateSource);
  const rateUpdatedAt = useTrip((s) => s.rateUpdatedAt);
  const setRate = useTrip((s) => s.setRate);
  const online = useOnline();
  const [form, setForm] = useState<{ e?: Expense } | null>(null);
  const [rateOpen, setRateOpen] = useState(false);
  const [rateTxt, setRateTxt] = useState(String(rate));
  const [loading, setLoading] = useState(false);

  const sum = (k: Expense["kind"]) => expenses.filter((e) => e.kind === k).reduce((a, e) => a + e.amountHKD, 0);
  const planned = sum("planned"), actual = sum("actual");
  const krw = (h: number) => `₩${Math.round(h * rate).toLocaleString()}`;
  const byCat = (Object.keys(EXPENSE_CAT) as ExpenseCategory[]).map((c) => ({
    c,
    planned: expenses.filter((e) => e.category === c && e.kind === "planned").reduce((a, e) => a + e.amountHKD, 0),
    actual: expenses.filter((e) => e.category === c && e.kind === "actual").reduce((a, e) => a + e.amountHKD, 0),
  }));

  const fetchRate = async () => {
    setLoading(true);
    try {
      const r = await fetch("https://open.er-api.com/v6/latest/HKD");
      const j = await r.json();
      const v = j?.rates?.KRW;
      if (!v) throw new Error();
      setRate(Math.round(v * 100) / 100, `ExchangeRate-API (${j.time_last_update_utc?.slice(5, 16) ?? ""})`);
      setRateTxt(String(Math.round(v * 100) / 100));
      toast(`환율 업데이트: 1 HKD = ${v.toFixed(2)} KRW`);
    } catch {
      toast("환율을 가져오지 못했습니다. 직접 입력해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Section
      title="여행 경비"
      right={
        <Button size="sm" variant="primary" onClick={() => setForm({})}>
          ＋ 지출
        </Button>
      }
    >
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-ivory-100 p-3">
            <div className="text-[12px] text-ink-mute">예상 지출</div>
            <div className="text-[18px] font-bold text-ink">HK${planned.toLocaleString()}</div>
            <div className="text-[12px] text-ink-soft">{krw(planned)}</div>
          </div>
          <div className="rounded-2xl bg-sky-50 p-3">
            <div className="text-[12px] text-ink-mute">실제 지출</div>
            <div className="text-[18px] font-bold text-sky-700">HK${actual.toLocaleString()}</div>
            <div className="text-[12px] text-ink-soft">{krw(actual)}</div>
          </div>
        </div>
        <button onClick={() => setRateOpen(true)} className="mt-3 w-full rounded-xl bg-ivory-100 px-3 py-2 text-left text-[12px] text-ink-soft">
          💱 1 HKD = <b className="text-ink">{rate} KRW</b> · {rateSource}
          {rateUpdatedAt ? ` · ${new Date(rateUpdatedAt).toLocaleDateString("ko-KR")}` : ""} <span className="float-right text-sky-600">변경 ›</span>
        </button>
        <div className="mt-4 space-y-2">
          {byCat
            .filter((x) => x.planned || x.actual)
            .map((x) => {
              const max = Math.max(x.planned, x.actual, 1);
              return (
                <div key={x.c} className="text-[13px]">
                  <div className="flex justify-between">
                    <span>
                      {EXPENSE_CAT[x.c].icon} {EXPENSE_CAT[x.c].label}
                    </span>
                    <span className="text-ink-soft">
                      HK${x.actual.toLocaleString()} <span className="text-ink-mute">/ 예상 {x.planned.toLocaleString()}</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ivory-200">
                    <div className={cn("h-full rounded-full", x.planned && x.actual > x.planned ? "bg-red-400" : "bg-sky-400")} style={{ width: `${(x.actual / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
        </div>
      </Card>

      <div className="mt-3 space-y-2">
        {expenses.length === 0 && <p className="px-1 text-[13px] text-ink-mute">아직 기록된 지출이 없습니다.</p>}
        {[...expenses]
          .sort((a, b) => b.date.localeCompare(a.date))
          .map((e) => (
            <button key={e.id} onClick={() => setForm({ e })} className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-soft">
              <span className="text-xl">{EXPENSE_CAT[e.category].icon}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold text-ink">{e.title}</div>
                <div className="text-[11px] text-ink-mute">
                  {fmtDate(e.date)} · {e.kind === "planned" ? "예상" : "실제"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[14px] font-bold text-ink">HK${e.amountHKD.toLocaleString()}</div>
                <div className="text-[11px] text-ink-mute">{krw(e.amountHKD)}</div>
              </div>
            </button>
          ))}
      </div>

      {form && <ExpenseForm initial={form.e} onClose={() => setForm(null)} />}
      <Modal open={rateOpen} onClose={() => setRateOpen(false)} title="환율 설정">
        <Field label="1 HKD = ? KRW">
          <input className={inputCls} inputMode="decimal" value={rateTxt} onChange={(e) => setRateTxt(e.target.value)} />
        </Field>
        <div className="mt-3 flex gap-2">
          <Button className="flex-1" onClick={fetchRate} disabled={!online || loading}>
            {loading ? "불러오는 중…" : "🌐 최신 환율 불러오기"}
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={() => {
              const v = Number(rateTxt);
              if (!v || v <= 0) return toast("올바른 환율을 입력해 주세요");
              setRate(v, "직접 입력");
              setRateOpen(false);
            }}
          >
            저장
          </Button>
        </div>
        <p className="mt-3 text-[11px] text-ink-mute">외부 환율 출처: open.er-api.com (무료, 하루 1회 갱신). 실제 환전 환율과 다를 수 있습니다.</p>
      </Modal>
    </Section>
  );
}

export default function Prep() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-[max(16px,env(safe-area-inset-top))]">
      <h1 className="text-[24px] font-extrabold text-ink">여행 준비</h1>
      <p className="mt-1 text-[13px] text-ink-mute">체크리스트와 경비를 관리하세요. 모든 내용은 기기에 자동 저장됩니다.</p>
      <Checklist />
      <Budget />
    </div>
  );
}
