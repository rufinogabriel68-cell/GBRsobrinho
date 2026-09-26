"use client";

/** Gráficos SVG próprios — minimalistas, sem dependência de lib de charts. */

export function BarsChart({
  data,
  height = 132,
  format,
  tone = "accent",
}: {
  data: { label: string; value: number }[];
  height?: number;
  format?: (v: number) => string;
  tone?: "accent" | "green" | "multi";
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const colors = ["var(--accent)", "var(--green)", "var(--amber)", "var(--purple)", "var(--red)"];
  return (
    <div>
      <div className="flex items-end gap-2 sm:gap-3" style={{ height }}>
        {data.map((d, i) => {
          const h = Math.max(3, (d.value / max) * 100);
          const color =
            tone === "green" ? "var(--green)" : tone === "accent" ? "var(--accent)" : colors[i % colors.length];
          return (
            <div key={d.label + i} className="group relative flex flex-1 flex-col justify-end" style={{ height: "100%" }}>
              <div
                className="w-full rounded-t-[7px] transition-all duration-500 group-hover:opacity-100"
                style={{
                  height: `${h}%`,
                  background: color,
                  opacity: 0.86,
                }}
                title={format ? format(d.value) : String(d.value)}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2 sm:gap-3">
        {data.map((d, i) => (
          <div key={d.label + i} className="flex-1 truncate text-center text-[10.5px]" style={{ color: "var(--text-3)" }}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Sparkline({
  points,
  height = 56,
  tone = "var(--accent)",
  fill = true,
}: {
  points: number[];
  height?: number;
  tone?: string;
  fill?: boolean;
}) {
  if (points.length < 2) return <div style={{ height }} />;
  const w = 300;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = height - ((p - min) / span) * (height - 8) - 4;
    return [x, y] as const;
  });
  const d = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${d} L${w} ${height} L0 ${height} Z`;
  const id = `sg-${tone.replace(/[^a-z]/gi, "")}-${height}`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ width: "100%", height }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tone} stopOpacity="0.28" />
          <stop offset="100%" stopColor={tone} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${id})`} />}
      <path d={d} fill="none" stroke={tone} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Donut({
  value,
  size = 132,
  stroke = 13,
  tone = "var(--accent)",
  track = "var(--grey-soft)",
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: string;
  track?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(c * pct) / 100} ${c}`}
          style={{ transition: "stroke-dasharray 900ms cubic-bezier(0.22,0.61,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

export function FlowChart({
  inflow,
  outflow,
  height = 150,
}: {
  inflow: { label: string; value: number }[];
  outflow: { label: string; value: number }[];
  height?: number;
}) {
  const max = Math.max(1, ...inflow.map((d) => d.value), ...outflow.map((d) => d.value));
  const half = height / 2 - 6;
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {inflow.map((d, i) => {
        const out = outflow[i]?.value ?? 0;
        const hi = Math.max(2, (d.value / max) * half);
        const ho = Math.max(2, (out / max) * half);
        return (
          <div key={d.label + i} className="flex h-full flex-1 flex-col justify-center gap-1" title={`${d.label}: entrada ${d.value.toFixed(0)} / saída ${out.toFixed(0)}`}>
            <div className="flex h-1/2 items-end">
              <div className="w-full rounded-t-[5px]" style={{ height: `${(hi / half) * 100}%`, background: "var(--green)", opacity: 0.9 }} />
            </div>
            <div className="flex h-1/2 flex-col justify-start">
              <div className="w-full rounded-b-[5px]" style={{ height: `${(ho / half) * 100}%`, background: "var(--red)", opacity: 0.75 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
