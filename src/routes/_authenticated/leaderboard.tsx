import { createFileRoute } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({
    meta: [
      { title: "Orbit Leaderboard — AstraPass" },
      { name: "description", content: "Master, Badge, Activity and Skill rankings are being calibrated." },
      { property: "og:title", content: "Orbit Leaderboard — AstraPass" },
      { property: "og:description", content: "Master, Badge, Activity and Skill rankings are being calibrated." },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  return <ComingSoon icon={Trophy} title="Orbit Leaderboard" text="Master, Badge, Activity and Skill rankings are being calibrated." />;
}
