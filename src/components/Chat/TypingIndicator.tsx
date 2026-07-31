import { useApp } from "@/stores/appStore";
import { displayName } from "@/lib/nostr";

export function TypingIndicator({ npubs }: { npubs: string[] }) {
  const { profileFor } = useApp();
  if (npubs.length === 0) {
    return <div className="h-5 px-2" />;
  }
  const names = npubs.map((n) => displayName(profileFor(n)));
  const label =
    names.length === 1
      ? `${names[0]} is typing...`
      : `${names.slice(0, 2).join(", ")} are typing...`;
  return (
    <div className="h-5 px-2 text-xs text-muted-foreground">
      {label} <span className="cursor-blink">█</span>
    </div>
  );
}
