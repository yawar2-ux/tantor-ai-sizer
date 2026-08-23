import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const Route = createFileRoute("/infrastructure")({
  head: () => ({
    meta: [
      { title: "Infrastructure | Tantor Gen AI Sizer" },
      {
        name: "description",
        content: "Step 3: corpus, vector index, logging, storage appliances and GPU chassis templates.",
      },
      { property: "og:title", content: "Infrastructure | Tantor Gen AI Sizer" },
      { property: "og:description", content: "Model corpus size, index RAM, retention and node chassis templates." },
    ],
  }),
  component: () => (
    <ComingSoon
      eyebrow="Step 3"
      title="Infrastructure"
      intro="Corpus, index, logging and storage, plus the GPU chassis template and its fit checks."
      items={[
        "Corpus entry in GB or TB with an estimated value flagged for client confirmation",
        "Vector count, index RAM and daily ingestion volumes",
        "Log retention and appliance storage sized to 0.5 TB steps",
        "Chassis suggestion with MISMATCH, RAM, NVMe and fabric checks",
      ]}
    />
  ),
});
