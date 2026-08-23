import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin | Tantor Gen AI Sizer" },
      {
        name: "description",
        content: "Manage reference data, rate card versions, saved scenarios and user access for the sizer.",
      },
      { property: "og:title", content: "Admin | Tantor Gen AI Sizer" },
      { property: "og:description", content: "Reference data, rate card versions and saved scenario management." },
    ],
  }),
  component: () => (
    <ComingSoon
      title="Admin"
      intro="Reference data and rate card management for the presales team."
      items={[
        "Rate card versioning with the stamp shown in the page footer",
        "Model, GPU, chassis and cloud instance reference tables",
        "Sign in and saved scenarios, backed by Lovable Cloud",
        "Audit of who changed which assumption and when",
      ]}
    />
  ),
});
