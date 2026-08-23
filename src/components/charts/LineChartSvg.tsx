export interface Series {
  label: string;
  colour: string;
  dashed?: boolean;
  points: { x: number; y: number }[];
  /** Right hand axis instead of left. */
  right?: boolean;
}

export interface LineChartSvgProps {
  series: Series[];
  xLabel: string;
  yLabel: string;
  yRightLabel?: string;
  formatX?: (x: number) => string;
  formatY?: (y: number) => string;
  formatYRight?: (y: number) => string;
  /** Vertical marker, for example the break-even crossover. */
  marker?: { x: number; label: string } | undefined;
  height?: number;
}

const W = 720;
const PAD = { top: 16, right: 56, bottom: 34, left: 62 };

export function LineChartSvg({
  series,
  xLabel,
  yLabel,
  yRightLabel,
  formatX = (x) => String(x),
  formatY = (y) => String(Math.round(y)),
  formatYRight = (y) => String(Math.round(y)),
  marker,
  height = 260,
}: LineChartSvgProps) {
  const H = height;
  const all = series.flatMap((s) => s.points);
  if (!all.length) return null;

  const xs = all.map((p) => p.x);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);

  const leftPts = series.filter((s) => !s.right).flatMap((s) => s.points.map((p) => p.y));
  const rightPts = series.filter((s) => s.right).flatMap((s) => s.points.map((p) => p.y));
  const lMax = leftPts.length ? Math.max(...leftPts) * 1.1 : 1;
  const rMax = rightPts.length ? Math.max(...rightPts) * 1.2 : 1;

  const px = (x: number) => PAD.left + ((x - xMin) / (xMax - xMin || 1)) * (W - PAD.left - PAD.right);
  const py = (y: number, right?: boolean) =>
    H - PAD.bottom - (y / ((right ? rMax : lMax) || 1)) * (H - PAD.top - PAD.bottom);

  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[560px]" role="img" aria-label={`${yLabel} against ${xLabel}`}>
        {ticks.map((t) => {
          const y = H - PAD.bottom - t * (H - PAD.top - PAD.bottom);
          return (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="currentColor" className="text-border" strokeWidth={1} />
              <text x={PAD.left - 8} y={y + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">
                {formatY(t * lMax)}
              </text>
              {rightPts.length > 0 && (
                <text x={W - PAD.right + 8} y={y + 4} className="fill-muted-foreground text-[10px]">
                  {formatYRight(t * rMax)}
                </text>
              )}
            </g>
          );
        })}

        {all
          .map((p) => p.x)
          .filter((v, i, a) => a.indexOf(v) === i)
          .map((x) => (
            <text key={x} x={px(x)} y={H - 12} textAnchor="middle" className="fill-muted-foreground text-[10px]">
              {formatX(x)}
            </text>
          ))}

        {marker && (
          <g>
            <line
              x1={px(marker.x)}
              x2={px(marker.x)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke="#DF678C"
              strokeWidth={2}
              strokeDasharray="4 3"
            />
            <text x={px(marker.x) + 6} y={PAD.top + 12} className="fill-rose text-[10px] font-semibold">
              {marker.label}
            </text>
          </g>
        )}

        {series.map((s) => (
          <g key={s.label}>
            <polyline
              fill="none"
              stroke={s.colour}
              strokeWidth={2.5}
              strokeDasharray={s.dashed ? "6 4" : undefined}
              points={s.points.map((p) => `${px(p.x)},${py(p.y, s.right)}`).join(" ")}
            />
            {s.points.map((p, i) => (
              <circle key={i} cx={px(p.x)} cy={py(p.y, s.right)} r={3} fill={s.colour} />
            ))}
          </g>
        ))}

        <text x={W / 2} y={H - 1} textAnchor="middle" className="fill-muted-foreground text-[10px]">
          {xLabel}
        </text>
      </svg>

      <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-6 rounded" style={{ background: s.colour }} />
            {s.label}
            {s.right && yRightLabel ? ` (${yRightLabel})` : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
