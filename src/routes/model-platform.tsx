import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const Route = createFileRoute("/model-platform")({
  head: () => ({
    meta: [
      { title: "Model & Platform | Tantor Gen AI Sizer" },
      {
        name: "description",
        content: "Step 2: pick the open-weight model, GPU and serving precision for the Tantor deployment.",
      },
      { property: "og:title", content: "Model and platform | Tantor Gen AI Sizer" },
      { property: "og:description", content: "Choose model, GPU and precision, and check TTFT and TPOT targets." },
    ],
  }),
  component: () => (
    <ComingSoon
      eyebrow="Step 2"
      title="Model & Platform"
      intro="Choose the open-weight model, GPU and precision, then check the latency targets."
      items={[
        "Model picker across 25 open-weight models, including a user-editable custom fine-tune",
        "GPU picker across 18 NVIDIA and AMD parts with availability flags",
        "Precision selector with memory and throughput effects",
        "TTFT and TPOT targets with PASS or REVIEW verdicts",
      ]}
    />
  ),
});
