import { PageHeader } from "./PageHeader";

export function ComingSoon({
  eyebrow,
  title,
  intro,
  items,
}: {
  eyebrow?: string | undefined;
  title: string;
  intro: string;
  items: string[];
}) {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={eyebrow} title={title} intro={intro} />
      <div className="card-surface p-6">
        <h2 className="text-lg font-semibold">Planned for this screen</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          {items.map((i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose" />
              {i}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">
          The calculation engine already produces these figures, so the result strip above stays live while this
          screen is built out.
        </p>
      </div>
    </div>
  );
}
