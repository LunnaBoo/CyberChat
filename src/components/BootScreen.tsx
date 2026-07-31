import { useEffect, useState } from "react";

const LINES = [
  "CyberOS v3.0.9",
  "Booting kernel...",
  "Initializing network interfaces...",
  "Starting session manager...",
  "Loading CyberChat...",
];

export function BootScreen({ onDone }: { onDone: () => void }) {
  const [shown, setShown] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (shown >= LINES.length) return;
    const t = window.setTimeout(() => setShown((n) => n + 1), 320);
    return () => window.clearTimeout(t);
  }, [shown]);

  useEffect(() => {
    const finish = () => {
      setFading(true);
      window.setTimeout(onDone, 220);
    };
    const t = window.setTimeout(finish, 2000);
    const key = () => finish();
    window.addEventListener("keydown", key);
    window.addEventListener("mousedown", key);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", key);
      window.removeEventListener("mousedown", key);
    };
  }, [onDone]);

  return (
    <div
      className={`h-full w-full px-4 py-3 transition-opacity duration-200 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      {LINES.slice(0, shown).map((line) => (
        <div key={line} className="flicker-in">
          {line}
        </div>
      ))}
      <div>
        <span className="cursor-blink">_</span>
      </div>
    </div>
  );
}
