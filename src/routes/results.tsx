import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Results | Tantor Gen AI Sizer" },
      {
        name: "description",
        content: "Step 5: on-premise bill of quantities, three-year TCO in INR and cloud comparison.",
      },
      { property: "og:title", content: "Results | Tantor Gen AI Sizer" },
      { property: "og:description", content: "On-premise capex, opex and cloud comparison, all in Indian rupees." },
    ],
  }),
  component: () => (
    <ComingSoon
      eyebrow="Step 5"
      title="Results"
      intro="Bill of quantities, three-year on-premise TCO and the comparison against AWS, Azure, GCP and OCI."
      items={[
        "On-premise bill of quantities in INR Lakh and Crore",
        "Capex, annual opex and three-year TCO breakdown",
        "Cloud bill of quantities with USD list rates as a small secondary reference only",
        "INR per million tokens and export of the full sizing pack",
      ]}
    />
  ),
});
