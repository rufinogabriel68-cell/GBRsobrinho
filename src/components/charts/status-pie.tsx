"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useChartPalette } from "./palette";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/types";

const STATUS_COLORS: Record<OrderStatus, string> = {
  pendente: "#f59e0b",
  em_andamento: "#0ea5e9",
  concluido: "#10b981",
  cancelado: "#71717b",
};

export function StatusPie({
  counts,
}: {
  counts: Record<OrderStatus, number>;
}) {
  const palette = useChartPalette();

  const data = (Object.keys(counts) as OrderStatus[])
    .filter((status) => counts[status] > 0)
    .map((status) => ({
      key: status,
      name: ORDER_STATUS_LABELS[status],
      value: counts[status],
      color: STATUS_COLORS[status],
    }));

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div>
      <div className="relative h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={52}
              outerRadius={72}
              paddingAngle={3}
              cornerRadius={6}
              strokeWidth={0}
            >
              {data.map((d) => (
                <Cell key={d.key} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) =>
                [`${value} pedido(s)`, String(name)] as [string, string]
              }
              contentStyle={{
                backgroundColor: palette.tooltipBg,
                border: `1px solid ${palette.tooltipBorder}`,
                borderRadius: 12,
                color: palette.tooltipText,
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
                fontSize: 13,
                padding: "8px 12px",
              }}
              itemStyle={{ color: palette.tooltipText }}
              labelStyle={{ color: palette.label }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold">{total}</span>
          <span className="text-xs text-muted-foreground">
            {total === 1 ? "pedido" : "pedidos"}
          </span>
        </div>
      </div>

      <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
        {data.map((d) => (
          <li key={d.key} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: d.color }}
              aria-hidden
            />
            <span className="truncate text-muted-foreground">{d.name}</span>
            <span className="ml-auto font-medium text-foreground">
              {d.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
