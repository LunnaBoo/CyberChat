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

  // Same-origin proxy URL (Vite middleware / nginx): percent-encode the whole
  // URL but keep the scheme's :// literal, because nginx collapses encoded
  // slashes in the scheme (https%3A%2F%2F -> https:/) and can't decode query
  // args. $uri in nginx then decodes the rest cleanly.
  const proxySrc = url
    ? `/img/${encodeURIComponent(url).replace("%3A%2F%2F", "://")}`
    : null;

  useEffect(() => {
    if (!canImg || mode !== "dither" || !url || !proxySrc) return;
    let alive = true;
    const canvas = canvasRef.current;
    const img = new Image();
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
        if (alive) setMode("plain");
      }
    };
    img.onerror = () => {
      if (alive) setMode("plain");
    };
    img.src = proxySrc;
    return () => {
      alive = false;
    };
  }, [canImg, url, mode, proxySrc]);

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
