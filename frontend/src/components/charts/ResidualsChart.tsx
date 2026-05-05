import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import type { HistoriqueRegressionPoint } from '../../types'

interface Props {
  data: HistoriqueRegressionPoint[]
}

export default function ResidualsChart({ data }: Props) {
  if (!data.length) return null

  const chartData = data.map(d => ({
    date: d.date.slice(0, 7),
    residue: +d.residue.toFixed(2),
  }))

  const maxAbs = Math.max(...chartData.map(d => Math.abs(d.residue)))

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
          tickLine={false}
          axisLine={false}
          interval={Math.floor(chartData.length / 5)}
        />
        <YAxis
          domain={[-maxAbs * 1.1, maxAbs * 1.1]}
          tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
          tickLine={false}
          axisLine={false}
          width={40}
          tickFormatter={v => v.toFixed(0)}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: 10,
            fontSize: 12,
            color: 'var(--text-primary)',
          }}
          formatter={(v: number) => [`${v.toFixed(2)}€`, 'Résidu']}
        />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
        <Bar
          dataKey="residue"
          fill="#6366f1"
          opacity={0.7}
          radius={[2, 2, 0, 0]}
          maxBarSize={6}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
