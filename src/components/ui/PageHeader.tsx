export function PageHeader({
  eyebrow,
  title,
  intro,
}: {
  eyebrow?: string | undefined;
  title: string;
  intro?: string | undefined;
}) {
  return (
    <header className="mb-6">
      {eyebrow && (
        <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-rose">{eyebrow}</div>
      )}
      <h1 className="text-3xl font-semibold">{title}</h1>
      {intro && <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{intro}</p>}
    </header>
  );
}
