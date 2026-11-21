"use client";

import { useEffect, type ReactNode } from "react";

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type BtnVariant = "primary" | "soft" | "ghost" | "outline" | "danger";
export function Button({
  variant = "soft",
  size = "md",
  className,
  ...p
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" }) {
  const v: Record<BtnVariant, string> = {
    primary: "bg-sky-500 text-white hover:bg-sky-600 shadow-soft",
    soft: "bg-sky-50 text-sky-700 hover:bg-sky-100",
    ghost: "text-ink-soft hover:bg-ivory-200",
    outline: "border border-ivory-200 bg-white text-ink hover:bg-ivory-100",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
  };
  return (
    <button
      {...p}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none",
        size === "sm" ? "h-8 px-3 text-[13px]" : "h-10 px-4 text-sm",
        v[variant],
        className,
      )}
    />
  );
}

export function LinkButton({
  href,
  children,
  className,
  variant = "soft",
}: {
  href: string;
  children: ReactNode;
  className?: string;
  variant?: "soft" | "primary" | "outline";
}) {
  const v = {
    primary: "bg-sky-500 text-white hover:bg-sky-600 shadow-soft",
    soft: "bg-sky-50 text-sky-700 hover:bg-sky-100",
    outline: "border border-ivory-200 bg-white text-ink hover:bg-ivory-100",
  }[variant];
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("inline-flex h-8 items-center justify-center gap-1.5 rounded-xl px-3 text-[13px] font-medium transition active:scale-[0.97]", v, className)}
    >
      {children}
    </a>
  );
}

export function Badge({ children, color, bg, className }: { children: ReactNode; color?: string; bg?: string; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4", className)}
      style={{ color: color ?? "#3B6FBC", background: bg ?? "#E2EDFB" }}
    >
      {children}
    </span>
  );
}

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={cn("rounded-3xl bg-white shadow-soft", className)}>
      {children}
    </div>
  );
}

/** 모바일에서는 하단 시트, 데스크톱에서는 중앙 다이얼로그 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center md:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px] animate-fade" onClick={onClose} />
      <div
        className={cn(
          "relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-ivory-50 shadow-lift animate-up md:rounded-3xl",
          wide ? "md:max-w-2xl" : "md:max-w-lg",
        )}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-ink/15 md:hidden" />
        {title != null && (
          <div className="flex items-center justify-between gap-2 px-5 pb-2 pt-3">
            <div className="min-w-0 text-[17px] font-bold text-ink">{title}</div>
            <button onClick={onClose} aria-label="닫기" className="grid h-8 w-8 place-items-center rounded-full bg-ivory-200 text-ink-soft">
              ✕
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 pb-5 overscroll-contain">{children}</div>
        {footer && <div className="border-t border-ivory-200 bg-white/80 px-5 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}

export function Section({ title, right, children, className }: { title: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("mt-6", className)}>
      <div className="mb-2.5 flex items-center justify-between px-1">
        <h2 className="text-[15px] font-bold text-ink">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-semibold text-ink-soft">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-ink-mute">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-ivory-200 bg-white px-3 py-2.5 text-[15px] text-ink outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100";

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(16px,env(safe-area-inset-top))] z-[1100] flex justify-center px-4">
      <div className="animate-fade rounded-2xl bg-ink/90 px-4 py-2.5 text-[13px] font-medium text-white shadow-lift">{message}</div>
    </div>
  );
}
