import { useEffect, useRef, useState } from "react";
import { cn, isHttpUrl } from "@/lib/utils";
import { ditherImage } from "@/lib/dither";

type AvatarMode = "dither" | "plain" | "sigil";

export function Avatar({
  url,
  sigil,
  className,
}: {
  url?: string | null;
  sigil?: string | null;
  className?: string;
}) {
  const [mode, setMode] = useState<AvatarMode>("dither");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => setMode("dither"), [url]);

  const canImg = Boolean(url && isHttpUrl(url));

  useEffect(() => {
    if (!canImg || mode !== "dither") return;
    let alive = true;
    const canvas = canvasRef.current;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!alive || canvasRef.current !== canvas) return;
      try {
        const dithered = ditherImage(img);
        canvas.width = dithered.width;
        canvas.height = dithered.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no 2d context");
        ctx.drawImage(dithered, 0, 0);
      } catch {
        setMode("plain");
      }
    };
    img.onerror = () => {
      if (alive) setMode("plain");
    };
    img.src = url;
    return () => {
      alive = false;
    };
  }, [canImg, url, mode]);

  if (!canImg || mode === "sigil") {
    return (
      <span className={cn("inline-block shrink-0", className)}>
        {sigil ?? "◆"}
      </span>
    );
  }

  if (mode === "plain") {
    return (
      <img
        src={url}
        alt=""
        onError={() => setMode("sigil")}
        className={cn(
          "inline-block h-[1.2em] w-[1.2em] shrink-0 border border-border object-cover align-[-0.2em]",
          className,
        )}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        "inline-block h-[1.2em] w-[1.2em] shrink-0 border border-border object-cover align-[-0.2em] [image-rendering:pixelated]",
        className,
      )}
    />
  );
}
