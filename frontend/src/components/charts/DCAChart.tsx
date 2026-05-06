import {
    ComposedChart,
    Line,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import type { ResultatMensuel } from "../../types";

interface Props {
    data: ResultatMensuel[];
    livretA: number;
    capitalInvesti: number;
}

const fmt = (v: number) =>
    new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
    }).format(v);

export default function DCAChart({ data, livretA, capitalInvesti }: Props) {
    if (!data.length) return null;

    const nb = data.length;
    const livretStep = (livretA - capitalInvesti) / nb;

    const chartData = data.map((d, i) => ({
        date: d.date.slice(0, 7),
        valeur: Math.round(d.valeur_brute),
        investi: Math.round(d.capital_investi),
        livret: Math.round(d.capital_investi + livretStep * (i + 1)),
    }));

    return (
        <ResponsiveContainer width="100%" height={300}>
            <ComposedChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
            >
                <defs>
                    <linearGradient
                        id="grad-valeur"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                    >
                        <stop
                            offset="5%"
                            stopColor="#6366f1"
                            stopOpacity={0.3}
                        />
                        <stop
                            offset="95%"
                            stopColor="#6366f1"
                            stopOpacity={0}
                        />
                    </linearGradient>
                </defs>
                <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.06)"
                    vertical={false}
                />
                <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                    tickLine={false}
                    axisLine={false}
                    interval={Math.floor(chartData.length / 8)}
                    tickMargin={10}
                />
                <YAxis
                    domain={["auto", "auto"]}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`}
                    tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                    tickLine={false}
                    axisLine={false}
                    width={55}
                    tickMargin={10}
                />
                <Tooltip
                    contentStyle={{
                        background: "var(--glass-bg)",
                        border: "1px solid var(--glass-border)",
                        borderRadius: 10,
                        fontSize: 12,
                        color: "var(--text-primary)",
                    }}
                    formatter={(v: number, name: string) => [fmt(v), name]}
                />
                <Legend
                    wrapperStyle={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                    }}
                    formatter={(v: string) =>
                        ({
                            valeur: "Valeur Portefeuille (ETF)",
                            investi: "Capital investi",
                            livret: "Livret A (3%)",
                        })[v] || v
                    }
                />
                <Area
                    type="monotone"
                    dataKey="valeur"
                    fill="url(#grad-valeur)"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                />
                <Line
                    type="monotone"
                    dataKey="investi"
                    stroke="rgba(255,255,255,0.35)"
                    strokeWidth={1.5}
                    dot={false}
                    strokeDasharray="4 4"
                />
                <Line
                    type="monotone"
                    dataKey="livret"
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    dot={false}
                    strokeDasharray="2 4"
                />
            </ComposedChart>
        </ResponsiveContainer>
    );
}
