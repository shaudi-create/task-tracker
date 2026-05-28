"use client";

import { useRef, useState } from "react";
import type { ParseApiResponse } from "@/lib/schemas/parse";

type QuickCaptureProps = {
  onParsed: (result: {
    data: ParseApiResponse;
    rawInput: string;
    parseUnavailable?: boolean;
  }) => void;
  disabled?: boolean;
};

export function QuickCapture({ onParsed, disabled = false }: QuickCaptureProps) {
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit() {
    const input = value.trim();
    if (!input || pending || disabled) return;

    setPending(true);
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });

      const data = (await res.json()) as ParseApiResponse & {
        error?: { message?: string };
      };

      if (!res.ok) {
        onParsed({
          data: { title: input, partial: true },
          rawInput: input,
          parseUnavailable: res.status === 503,
        });
      } else {
        onParsed({ data, rawInput: input });
      }
      setValue("");
    } catch {
      onParsed({
        data: { title: input, partial: true },
        rawInput: input,
        parseUnavailable: true,
      });
      setValue("");
    } finally {
      setPending(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={value}
        disabled={disabled || pending}
        placeholder="Add a task… ⌘K"
        className="w-full rounded border border-zinc-300 px-3 py-3 pr-8 text-base disabled:bg-zinc-50"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            setValue("");
            return;
          }
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void submit();
          }
        }}
      />
      {pending && (
        <span
          className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin rounded-full border-2 border-zinc-300 border-t-[#5E6AD2]"
          aria-hidden
        />
      )}
    </div>
  );
}
