"use client";

import { useCallback, useRef } from "react";
import type { SubtaskInput } from "@/lib/schemas/task";

const MAX_SUBTASKS = 20;
const MAX_SUBTASK_TEXT = 200;

type SubtaskListProps = {
  subtasks: SubtaskInput[];
  sectionOpen: boolean;
  onSectionOpen: () => void;
  onChange: (subtasks: SubtaskInput[]) => void;
};

export function SubtaskList({
  subtasks,
  sectionOpen,
  onSectionOpen,
  onChange,
}: SubtaskListProps) {
  const inputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  const showSection = sectionOpen || subtasks.length > 0;
  const atCap = subtasks.length >= MAX_SUBTASKS;

  const focusInput = useCallback((index: number) => {
    requestAnimationFrame(() => {
      inputRefs.current.get(index)?.focus();
    });
  }, []);

  const addSubtask = useCallback(() => {
    onSectionOpen();
    if (atCap) return;
    const next = [...subtasks, { text: "", done: false }];
    onChange(next);
    focusInput(next.length - 1);
  }, [atCap, focusInput, onChange, onSectionOpen, subtasks]);

  const updateSubtask = useCallback(
    (index: number, patch: Partial<SubtaskInput>) => {
      onChange(
        subtasks.map((s, i) => (i === index ? { ...s, ...patch } : s)),
      );
    },
    [onChange, subtasks],
  );

  const removeSubtask = useCallback(
    (index: number) => {
      onChange(subtasks.filter((_, i) => i !== index));
    },
    [onChange, subtasks],
  );

  const commitAndAddBelow = useCallback(
    (index: number) => {
      const text = subtasks[index]?.text.trim() ?? "";
      if (!text) return;
      if (atCap) return;
      const next = [
        ...subtasks.slice(0, index + 1),
        { text: "", done: false },
        ...subtasks.slice(index + 1),
      ];
      onChange(next);
      focusInput(index + 1);
    },
    [atCap, focusInput, onChange, subtasks],
  );

  if (!showSection) {
    return (
      <button
        type="button"
        onClick={addSubtask}
        className="text-xs text-zinc-500 hover:text-zinc-700"
      >
        + Add subtask
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        Subtasks
      </p>
      <ul className="flex flex-col gap-1">
        {subtasks.map((subtask, index) => (
          <li
            key={index}
            className="group flex items-center gap-2 rounded px-1 py-0.5 hover:bg-zinc-50"
          >
            <input
              type="checkbox"
              checked={subtask.done}
              onChange={(e) =>
                updateSubtask(index, { done: e.target.checked })
              }
              className="h-3.5 w-3.5 shrink-0 rounded border-zinc-300"
              aria-label={`Mark subtask ${index + 1} done`}
            />
            <input
              ref={(el) => {
                if (el) inputRefs.current.set(index, el);
                else inputRefs.current.delete(index);
              }}
              type="text"
              value={subtask.text}
              maxLength={MAX_SUBTASK_TEXT}
              onChange={(e) => updateSubtask(index, { text: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (subtask.text.trim()) {
                    commitAndAddBelow(index);
                  }
                }
                if (
                  e.key === "Backspace" &&
                  subtask.text === "" &&
                  subtasks.length > 0
                ) {
                  e.preventDefault();
                  removeSubtask(index);
                  focusInput(Math.max(0, index - 1));
                }
              }}
              className="min-w-0 flex-1 border-0 bg-transparent px-1 py-0.5 text-sm text-zinc-900 outline-none focus:border-b focus:border-zinc-200"
              placeholder="Subtask…"
            />
            <button
              type="button"
              onClick={() => removeSubtask(index)}
              className="shrink-0 rounded p-0.5 text-xs text-zinc-400 opacity-0 hover:text-zinc-700 group-hover:opacity-100"
              aria-label="Remove subtask"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={addSubtask}
        disabled={atCap}
        className="self-start text-xs text-zinc-500 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        + Add subtask
      </button>
    </div>
  );
}
