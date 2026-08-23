import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const Route = createFileRoute("/environments")({
  head: () => ({
    meta: [
      { title: "Environments | Tantor Gen AI Sizer" },
      {
        name: "description",
        content: "Step 4: scale Prod, Dev, UAT and DR, apply virtualisation and check services tier capacity.",
      },
      { property: "og:title", content: "Environments | Tantor Gen AI Sizer" },
      { property: "og:description", content: "Prod, Dev, UAT and DR sizing with the VM catalogue and capacity checks." },
    ],
  }),
  component: () => (
    <ComingSoon
      eyebrow="Step 4"
      title="Environments"
      intro="Scale the non-production environments, choose DR high availability and review the VM catalogue."
      items={[
        "Dev, UAT and DR percentages applied to the pre-HA GPU count",
        "Virtualisation toggle with MIG partitioning for Dev and UAT",
        "Vector, platform and data services node counts per environment",
        "Nine role VM catalogue with vCPU and RAM capacity checks",
      ]}
    />
  ),
});
