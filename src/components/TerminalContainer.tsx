import type { ReactNode } from "react";

export function TerminalContainer({ children }: { children: ReactNode }) {
  return (
    <div className="crt-glow h-dvh w-full overflow-hidden bg-background text-foreground">
      {children}
    </div>
  );
}
