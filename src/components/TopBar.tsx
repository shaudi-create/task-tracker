export function TopBar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white px-6 py-3">
      {children}
    </header>
  );
}
