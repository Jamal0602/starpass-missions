import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/activities")({
  head: () => ({
    meta: [
      { title: "Mission Operations — AstraPass" },
      { name: "description", content: "Daily aerospace tasks and quizzes will appear here once mission content is loaded." },
      { property: "og:title", content: "Mission Operations — AstraPass" },
      { property: "og:description", content: "Daily aerospace tasks and quizzes will appear here once mission content is loaded." },
    ],
  }),
  component: ActivitiesPage,
});

function ActivitiesPage() {
  return <ComingSoon icon={ClipboardList} title="Mission Operations" text="Daily aerospace tasks and quizzes will appear here once mission content is loaded." />;
}
