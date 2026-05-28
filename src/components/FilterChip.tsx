"use client";

import { useEffect, useRef, useState } from "react";

type FilterChipTone = "neutral" | "accent" | "amber" | "muted";
type FilterChipSize = "sm" | "md";

const toneClasses: Record<FilterChipTone, string> = {
  neutral:
    "border-transparent bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70",
  accent: "border-transparent bg-[#5E6AD2] text-white",
  amber: "border-amber-400 bg-amber-50 text-amber-900",
  muted: "border-transparent bg-zinc-50 text-zinc-500",
};

const sizeClasses: Record<FilterChipSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-3 py-1.5 text-base",
};

export type FilterChipSelectOption = { value: string; label: string };

export type FilterChipProps = {
  label: string;
  prefix?: React.ReactNode;
  placeholder?: string;
  editPlaceholder?: string;
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
  /** Custom label when value is set (e.g. "Due Jun 3"). */
  formatValue?: (value: string) => string;
  /** Focus the native control when entering edit mode (default true). */
  focusOnEdit?: boolean;
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

function defaultDisplayValue(
  value: string,
  kind: FilterChipProps["kind"],
  options?: FilterChipSelectOption[],
): string {
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
  prefix,
  placeholder,
  editPlaceholder,
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
  formatValue,
  focusOnEdit = true,
}: FilterChipProps) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const resolvedTone = active ? "accent" : tone;
  const hasValue = Boolean(value && value.length > 0);
  const display = hasValue
    ? (formatValue?.(value!) ??
      defaultDisplayValue(value!, kind, options))
    : (placeholder ?? label);
  const chipTone =
    active && !editable ? "accent" : hasValue ? resolvedTone : emptyTone;
  const isPickerKind = kind === "date" || kind === "datetime";

  useEffect(() => {
    if (!editing || !inputRef.current) return;

    const el = inputRef.current as HTMLInputElement;

    if (isPickerKind) {
      try {
        el.showPicker?.();
      } catch {
        /* showPicker may throw if not user-gesture in some browsers */
      }
      if (focusOnEdit) {
        el.focus();
      }
      return;
    }

    if (focusOnEdit) {
      el.focus();
      if ("select" in el) {
        (el as HTMLInputElement).select?.();
      }
    }
  }, [editing, isPickerKind, focusOnEdit]);

  const shellClass = `inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors ${toneClasses[chipTone]} ${sizeClasses[size]}`;
  const editingShellClass = `${shellClass} ring-1 ring-[#5E6AD2]`;

  if (!editable) {
    if (onClick) {
      return (
        <button type="button" onClick={onClick} className={shellClass}>
          {prefix}
          {label}
        </button>
      );
    }
    return (
      <span className={shellClass}>
        {prefix}
        {label}
      </span>
    );
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

    if (isPickerKind) {
      const inputType = kind === "datetime" ? "datetime-local" : "date";

      return (
        <span className="relative inline-flex">
          <button
            type="button"
            className={editingShellClass}
            onClick={() => {
              try {
                (inputRef.current as HTMLInputElement)?.showPicker?.();
              } catch {
                (inputRef.current as HTMLInputElement)?.focus();
              }
            }}
          >
            {display}
          </button>
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={inputType}
            tabIndex={-1}
            aria-hidden
            className="pointer-events-none absolute h-0 w-0 opacity-0"
            defaultValue={
              kind === "date"
                ? toDateInputValue(value)
                : toDatetimeLocalValue(value)
            }
            onChange={(e) => {
              const v = e.target.value;
              if (kind === "date" && v) finish(dateInputToIso(v));
              else if (kind === "datetime" && v) finish(datetimeLocalToIso(v));
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setEditing(false);
            }}
            onBlur={(e) => {
              const v = e.target.value;
              if (kind === "date" && v) finish(dateInputToIso(v));
              else if (kind === "datetime" && v) finish(datetimeLocalToIso(v));
              else setEditing(false);
            }}
          />
        </span>
      );
    }

    const inputType = "text";

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={inputType}
        className={`${shellClass} min-w-[120px] bg-white text-zinc-900 outline-none ring-1 ring-[#5E6AD2]`}
        placeholder={editPlaceholder}
        defaultValue={value ?? ""}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const v = (e.target as HTMLInputElement).value;
            finish(v.trim() || null);
          }
          if (e.key === "Escape") setEditing(false);
        }}
        onBlur={(e) => {
          finish(e.target.value.trim() || null);
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
