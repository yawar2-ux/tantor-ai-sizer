import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/PageHeader";
import { useScenario } from "@/state/scenario";
import { inrLakh, num } from "@/lib/format";
import { PROVIDER_LABEL, RATES } from "@/engine";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tantor Gen AI Sizer | Translab presales sizing" },
      {
        name: "description",
        content:
          "Size Tantor on-premise governed AI deployments: GPUs, nodes, storage and three-year TCO in INR, compared with AWS, Azure, GCP and OCI.",
      },
      { property: "og:title", content: "Tantor Gen AI Sizer" },
      {
        property: "og:description",
        content: "GPU and infrastructure sizing for the Tantor governed AI platform, priced in Indian rupees.",
      },
    ],
  }),
  component: Home,
});

const steps = [
  { to: "/workload", n: 1, title: "Workload", text: "Capture use cases, users, request rates and token sizes." },
  { to: "/model-platform", n: 2, title: "Model & Platform", text: "Choose the open-weight model, GPU and precision." },
  { to: "/infrastructure", n: 3, title: "Infrastructure", text: "Corpus, index, logging, storage and node templates." },
  { to: "/environments", n: 4, title: "Environments", text: "Prod, Dev, UAT and DR scaling with virtualisation." },
  { to: "/results", n: 5, title: "Results", text: "Bill of quantities, on-premise TCO and cloud comparison." },
];

function Home() {
  const { result } = useScenario();
  const { sizing, environments, cost, cloud } = result;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Translab Technologies"
        title="Tantor Gen AI Sizer"
        intro="Size a Tantor on-premise governed AI deployment from business use cases, then compare the three-year cost against AWS, Azure, GCP and OCI. Every figure is in Indian rupees."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="card-surface p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Current scenario</div>
          <div className="numeral mt-2 text-3xl font-semibold text-rose">{num(sizing.prodGpus)} GPUs</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Production, binding constraint {sizing.constraint.toLowerCase()}.
          </p>
        </div>
        <div className="card-surface p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">On-premise 3-year TCO</div>
          <div className="numeral mt-2 text-3xl font-semibold text-rose">{inrLakh(cost.tco3L)}</div>
          <p className="mt-1 text-sm text-muted-foreground">
            {num(environments.totalNodes)} nodes across all environments.
          </p>
        </div>
        <div className="card-surface p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Best cloud alternative</div>
          <div className="numeral mt-2 text-3xl font-semibold text-info">{inrLakh(cloud.bestTco3L)}</div>
          <p className="mt-1 text-sm text-muted-foreground">
            {PROVIDER_LABEL[cloud.bestProvider]}, list rates converted at {RATES.fx} INR per USD.
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Work through the five steps</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {steps.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="card-surface flex gap-4 p-5 transition-shadow hover:border-rose"
            >
              <span className="numeral flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground">
                {s.n}
              </span>
              <span>
                <span className="block font-heading font-semibold text-brand">{s.title}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{s.text}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="card-surface p-5">
        <h2 className="mb-3 text-lg font-semibold">How a sizing runs, end to end</h2>
        <ol className="space-y-3 text-sm text-muted-foreground">
          <li>
            <span className="font-heading font-semibold text-brand">1. Capture the workload.</span> List each business
            use case with total users, concurrency and token sizes. The engine turns that into peak requests per second
            and prefill and decode tokens per second.
          </li>
          <li>
            <span className="font-heading font-semibold text-brand">2. Pick model, GPU and precision.</span> Check the
            binding constraint (memory, decode or prefill) and the latency panel before committing to a card.
          </li>
          <li>
            <span className="font-heading font-semibold text-brand">3. Confirm the corpus.</span> Corpus size, log
            retention and model versions drive index RAM and the storage appliance. Confirm the corpus with the client;
            the estimate is flagged until you do.
          </li>
          <li>
            <span className="font-heading font-semibold text-brand">4. Scale the environments.</span> Set Dev, UAT and
            DR percentages, DR high availability and GPU virtualisation, then check the chassis template matches.
          </li>
          <li>
            <span className="font-heading font-semibold text-brand">5. Read the results.</span> Bill of quantities,
            three-year TCO against four clouds, sensitivity, break-even, rack power and the phased plan. Export the
            Excel pack for the client.
          </li>
          <li>
            <span className="font-heading font-semibold text-brand">Before the meeting.</span> Save the scenario, then
            turn on presentation mode to hide assumptions, rate figures and cost build-up detail.
          </li>
        </ol>
      </section>
    </div>
  );
}
