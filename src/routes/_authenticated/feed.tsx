import { createFileRoute } from "@tanstack/react-router";
import { Newspaper } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({
    meta: [
      { title: "Pioneer Showcase — AstraPass" },
      { name: "description", content: "Educational and startup builds only. The feed opens in the next deployment." },
      { property: "og:title", content: "Pioneer Showcase — AstraPass" },
      { property: "og:description", content: "Educational and startup builds only. The feed opens in the next deployment." },
    ],
  }),
  component: FeedPage,
});

function FeedPage() {
  return <ComingSoon icon={Newspaper} title="Pioneer Showcase" text="Educational and startup builds only. The feed opens in the next deployment." />;
}
