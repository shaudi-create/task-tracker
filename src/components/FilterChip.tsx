"use client";

import { useEffect, useRef, useState } from "react";

type FilterChipTone = "neutral" | "accent" | "amber" | "muted";
type FilterChipSize = "sm" | "md";

const toneClasses: Record<FilterChipTone, string> = {
  neutral: "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
  accent: "border-[#5E6AD2] bg-[#5E6AD2] text-white",
  amber: "border-amber-400 bg-amber-50 text-amber-900",
  muted: "border-zinc-100 bg-zinc-50 text-zinc-500",
};

const sizeClasses: Record<FilterChipSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1.5 text-base",
};

export type FilterChipSelectOption = { value: string; label: string };

export type FilterChipProps = {
  label: string;
  placeholder?: string;
  tone?: FilterChipTone;
  size?: FilterChipSize;
  active?: boolean;
  onClick?: () => void;
  editable?: boolean;
  kind?: "text" | "date" | "datetime" | "select";
  value?: string | null;
  options?: FilterChipSelectOption[];
  onChange?: (value: string | null) => void;
  emptyTone?: FilterChipTone;
};

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${day}`;
}

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  let hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  if (hour === "24") hour = "00";
  const minute = parts.find((p) => p.type === "minute")?.value;
  return `${y}-${m}-${day}T${hour}:${minute}`;
}

function dateInputToIso(dateStr: string): string {
  return new Date(`${dateStr}T23:59:59-05:00`).toISOString();
}

function datetimeLocalToIso(local: string): string {
  return new Date(`${local}:00-05:00`).toISOString();
}

function displayValue(
  value: string | null | undefined,
  kind: FilterChipProps["kind"],
  options?: FilterChipSelectOption[],
): string | null {
  if (!value) return null;
  if (kind === "select" && options) {
    return options.find((o) => o.value === value)?.label ?? value;
  }
  if (kind === "date" || kind === "datetime") {
    const d = new Date(value);
    return d.toLocaleString("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      ...(kind === "datetime"
        ? { hour: "numeric", minute: "2-digit" }
        : {}),
    });
  }
  return value;
}

export function FilterChip({
  label,
  placeholder,
  tone = "neutral",
  size = "sm",
  active = false,
  onClick,
  editable = false,
  kind = "text",
  value,
  options,
  onChange,
  emptyTone = "muted",
}: FilterChipProps) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const resolvedTone = active ? "accent" : tone;
  const hasValue = Boolean(value && value.length > 0);
  const display = hasValue
    ? displayValue(value, kind, options)
    : (placeholder ?? label);
  const chipTone = hasValue ? resolvedTone : emptyTone;

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if ("select" in inputRef.current) {
        (inputRef.current as HTMLInputElement).select?.();
      }
    }
  }, [editing]);

  const shellClass = `inline-flex items-center rounded-full border font-medium transition-colors ${toneClasses[chipTone]} ${sizeClasses[size]}`;

  if (!editable) {
    if (onClick) {
      return (
        <button type="button" onClick={onClick} className={shellClass}>
          {label}
        </button>
      );
    }
    return <span className={shellClass}>{label}</span>;
  }

  if (editing) {
    const finish = (next: string | null) => {
      onChange?.(next);
      setEditing(false);
    };

    if (kind === "select" && options) {
      return (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          className={`${shellClass} max-w-[200px] cursor-pointer bg-white pr-6 text-zinc-900 outline-none`}
          value={value ?? ""}
          onChange={(e) => finish(e.target.value || null)}
          onBlur={() => setEditing(false)}
        >
          <option value="">{placeholder ?? label}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    const inputType = kind === "datetime" ? "datetime-local" : kind === "date" ? "date" : "text";

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={inputType}
        className={`${shellClass} min-w-[120px] bg-white text-zinc-900 outline-none ring-1 ring-[#5E6AD2]`}
        defaultValue={
          kind === "date"
            ? toDateInputValue(value)
            : kind === "datetime"
              ? toDatetimeLocalValue(value)
              : (value ?? "")
        }
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const v = (e.target as HTMLInputElement).value;
            if (kind === "date" && v) finish(dateInputToIso(v));
            else if (kind === "datetime" && v) finish(datetimeLocalToIso(v));
            else finish(v.trim() || null);
          }
          if (e.key === "Escape") setEditing(false);
        }}
        onBlur={(e) => {
          const v = e.target.value;
          if (kind === "date" && v) finish(dateInputToIso(v));
          else if (kind === "datetime" && v) finish(datetimeLocalToIso(v));
          else finish(v.trim() || null);
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        onClick?.();
        setEditing(true);
      }}
      className={shellClass}
    >
      {display}
    </button>
  );
}
