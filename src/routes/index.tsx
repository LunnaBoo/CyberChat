import { createFileRoute } from "@tanstack/react-router";
import { App } from "@/App";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CyberChat — Terminal Messenger on Nostr" },
      {
        name: "description",
        content:
          "A retro terminal chat client with MSN-style nudges, real-time messaging and Nostr keypair identity. No passwords, only keys.",
      },
      { property: "og:title", content: "CyberChat — Terminal Messenger on Nostr" },
      {
        property: "og:description",
        content:
          "Matrix-green terminal messenger: Nostr identity, live chat, contacts, groups and nudges.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: App,
});
