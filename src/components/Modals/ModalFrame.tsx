import { useEffect, type ReactNode } from "react";

export function ModalFrame({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 px-2 py-6 md:py-24"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-lg border border-border bg-panel"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center border-b border-border px-2 py-0.5">
          <span className="truncate">┌─ {title}</span>
          <button
            onClick={onClose}
            className="ml-auto shrink-0 text-dim hover:text-foreground"
          >
            [esc]
          </button>
        </div>
        <div className="p-2">{children}</div>
      </div>
    </div>
  );
}
