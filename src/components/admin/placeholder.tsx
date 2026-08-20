import type { ReactNode } from "react";

export function AdminPlaceholder({ title, milestone }: { title: string; milestone: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm opacity-60">该模块将在 {milestone} 里程碑实现。</p>
    </div>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-6">{children}</div>;
}
