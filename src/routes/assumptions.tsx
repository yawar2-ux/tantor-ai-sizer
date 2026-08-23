import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const Route = createFileRoute("/assumptions")({
  head: () => ({
    meta: [
      { title: "Assumptions | Tantor Gen AI Sizer" },
      {
        name: "description",
        content: "Review and adjust every sizing factor, from serving efficiency to tariff and the INR fx rate.",
      },
      { property: "og:title", content: "Assumptions | Tantor Gen AI Sizer" },
      { property: "og:description", content: "All rate card factors used by the Tantor sizing engine, user adjustable." },
    ],
  }),
  component: () => (
    <ComingSoon
      title="Assumptions"
      intro="Every factor on the rate card is adjustable here, and each change flows straight through the engine."
      items={[
        "General factors such as peak factor, serving efficiency, headroom and HA GPUs",
        "Commercial factors including tariff, manpower, facilities, AMC and the INR fx rate",
        "Infrastructure factors for storage, index, logging and fabric pricing",
        "Reset to the published rate card version",
      ]}
    />
  ),
});
