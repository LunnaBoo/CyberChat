import type { ReactNode } from "react";

export function TerminalContainer({ children }: { children: ReactNode }) {
  return (
    <div className="crt-glow h-screen w-screen overflow-hidden bg-background text-foreground">
      {children}
    </div>
  );
}
