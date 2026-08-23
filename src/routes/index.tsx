import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/PageHeader";
import { useScenario } from "@/state/scenario";
import { useAuth } from "@/hooks/useAuth";
import { listScenarios, scenarioTitle, type SavedScenario } from "@/lib/scenarios";
import { defaultScenario } from "@/engine";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tantor Gen AI Sizer | Translab presales sizing" },
      {
        name: "description",
        content:
          "Start a new Tantor sizing or open a saved scenario: GPUs, nodes, storage and three-year TCO in INR, compared with AWS, Azure, GCP and OCI.",
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

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });

function Home() {
  const { scenario, update, reset } = useScenario();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recent, setRecent] = useState<SavedScenario[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setRecent([]);
      setLoadingRecent(false);
      return;
    }
    setLoadingRecent(true);
    listScenarios()
      .then((rows) => {
        if (!cancelled) setRecent(rows.slice(0, 5));
      })
      .catch(() => {
        if (!cancelled) setRecent([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRecent(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const startNew = () => {
    const dirty = JSON.stringify(scenario) !== JSON.stringify(defaultScenario());
    if (dirty && typeof window !== "undefined") {
      const ok = window.confirm(
        "The current working sizing has unsaved changes. Starting a new sizing will discard them. Continue?",
      );
      if (!ok) return;
    }
    reset();
    void navigate({ to: "/workload" });
  };

  const openSaved = (row: SavedScenario) => {
    update(row.data);
    void navigate({ to: "/results" });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Translab Technologies"
        title="Tantor Gen AI Sizer"
        intro="Size a Tantor on-premise governed AI deployment from business use cases, then compare the three-year cost against AWS, Azure, GCP and OCI. Every figure is in Indian rupees."
      />

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card-surface flex flex-col justify-between gap-4 p-6">
          <div>
            <h2 className="font-heading text-xl font-semibold text-brand">Create new sizing</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Start from a blank workload and work through the five steps.
            </p>
          </div>
          <button
            type="button"
            onClick={startNew}
            className="inline-flex w-fit items-center rounded-md bg-rose px-4 py-2 text-sm font-semibold text-rose-foreground transition-opacity hover:opacity-90"
          >
            Start a new sizing
          </button>
        </div>

        <div className="card-surface flex flex-col justify-between gap-4 p-6">
          <div>
            <h2 className="font-heading text-xl font-semibold text-brand">Load existing sizing</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Open a saved scenario to review, revise or compare.
            </p>
          </div>
          <Link
            to="/scenarios"
            className="inline-flex w-fit items-center rounded-md border border-brand px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-brand-foreground"
          >
            Browse saved scenarios
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Recent scenarios</h2>
        {loadingRecent ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No saved scenarios yet</p>
        ) : (
          <ul className="card-surface divide-y divide-border">
            {recent.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => openSaved(row)}
                  className="flex w-full flex-wrap items-center justify-between gap-2 px-5 py-3 text-left transition-colors hover:bg-accent"
                >
                  <span className="font-heading text-sm font-semibold text-brand">{scenarioTitle(row)}</span>
                  <span className="numeral text-xs text-muted-foreground">
                    Updated {dateFmt.format(new Date(row.updated_at))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
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
