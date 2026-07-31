import { useEffect, useState } from "react";
import { cn, isHttpUrl } from "@/lib/utils";

export function Avatar({
  url,
  sigil,
  className,
}: {
  url?: string | null;
  sigil?: string | null;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);

  useEffect(() => setBroken(false), [url]);

  const showImg = Boolean(url && isHttpUrl(url) && !broken);

  if (showImg && url) {
    return (
      <img
        src={url}
        alt=""
        onError={() => setBroken(true)}
        className={cn(
          "inline-block h-[1.2em] w-[1.2em] shrink-0 border border-border object-cover align-[-0.2em]",
          className,
        )}
      />
    );
  }

  return (
    <span className={cn("inline-block shrink-0", className)}>
      {sigil ?? "◆"}
    </span>
  );
}
