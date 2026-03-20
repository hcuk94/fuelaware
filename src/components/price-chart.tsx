"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = {
  observedAt: string;
  price: number;
};

export function PriceChart({ data, currency, unit }: { data: Point[]; currency: string; unit: string }) {
  return (
    <div className="chart-shell">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <XAxis dataKey="observedAt" tickFormatter={(value) => value.slice(5, 10)} />
          <YAxis domain={["auto", "auto"]} />
          <Tooltip
            formatter={(value) =>
              typeof value === "number" ? `${currency} ${value.toFixed(3)}/${unit}` : `${value ?? ""}`
            }
          />
          <Line type="monotone" dataKey="price" stroke="var(--accent-strong)" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
