const PROJECT_DOT_COLORS = [
  "bg-sky-400",
  "bg-emerald-400",
  "bg-amber-400",
  "bg-rose-400",
  "bg-violet-400",
  "bg-teal-400",
  "bg-indigo-400",
  "bg-fuchsia-400",
] as const;

function hashProjectName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function projectDotColorClass(name: string): string {
  const index = hashProjectName(name.trim().toLowerCase()) % PROJECT_DOT_COLORS.length;
  return PROJECT_DOT_COLORS[index];
}
