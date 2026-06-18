import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { ShowcasePoint } from "../../data/showcase";

const eur = (v: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(v) + " €";

/** Mini-courbe sans axes pour les cartes marché. */
export function Sparkline({
  values,
  color,
  height = 44,
}: {
  values: number[];
  color: string;
  height?: number;
}) {
  const data = values.map((c, i) => ({ i, c }));
  const id = "sp" + color.replace(/[^a-z0-9]/gi, "");
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 3, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <Area
          type="monotone"
          dataKey="c"
          stroke={color}
          strokeWidth={1.8}
          fill={`url(#${id})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Grande courbe hero à dégradé (flagship). */
export function HeroAreaChart({
  points,
  color = "#3ddc97",
  height = 320,
}: {
  points: ShowcasePoint[];
  color?: string;
  height?: number;
}) {
  const data = points.map((p) => ({ date: p.d, c: p.c }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.45} />
            <stop offset="60%" stopColor={color} stopOpacity={0.08} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }}
          tickLine={false}
          axisLine={false}
          interval={Math.max(1, Math.floor(data.length / 6))}
          tickFormatter={(d: string) => d.slice(0, 4)}
          tickMargin={10}
        />
        <YAxis
          orientation="right"
          domain={["auto", "auto"]}
          tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }}
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={(v: number) => `${v}`}
        />
        <Tooltip
          contentStyle={{
            background: "rgba(16,18,24,0.95)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            fontSize: 12,
            color: "#fff",
            boxShadow: "0 12px 40px rgba(0,0,0,.5)",
          }}
          labelStyle={{ color: "rgba(255,255,255,0.5)" }}
          formatter={(v: number) => [eur(v), "Cours"]}
        />
        <Area
          type="monotone"
          dataKey="c"
          stroke={color}
          strokeWidth={2.4}
          fill="url(#heroGrad)"
          dot={false}
          activeDot={{ r: 4, fill: color, stroke: "#0b0d12", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
