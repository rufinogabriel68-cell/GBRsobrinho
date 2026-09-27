"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useChartPalette } from "./palette";
import { brl, compactBRL } from "@/lib/format";

export interface RevenuePoint {
  month: string;
  total: number;
}

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const palette = useChartPalette();

  return (
    <div className="h-64 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={palette.primary} stopOpacity={0.3} />
              <stop
                offset="100%"
                stopColor={palette.primary}
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={palette.grid}
            vertical={false}
          />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: palette.label, fontSize: 12 }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={68}
            tick={{ fill: palette.label, fontSize: 11 }}
            tickFormatter={(value: number) => compactBRL(value)}
          />
          <Tooltip
            cursor={{ stroke: palette.grid, strokeDasharray: "4 4" }}
            formatter={(value) =>
              [brl(Number(value)), "Faturamento"] as [string, string]
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
            labelStyle={{ color: palette.label, marginBottom: 4 }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke={palette.primary}
            strokeWidth={2.5}
            fill="url(#revenueFill)"
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
