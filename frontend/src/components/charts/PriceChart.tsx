import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts'
import type { HistoriquePoint } from '../../types'

interface Props {
  data: HistoriquePoint[]
  ticker: string
}

const fmt = (v: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(v)

const fmtDate = (d: string) => {
  const dt = new Date(d)
  return dt.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
}

export default function PriceChart({ data, ticker }: Props) {
  if (!data.length) return null

  const minVal = Math.min(...data.map(d => d.close)) * 0.97
  const maxVal = Math.max(...data.map(d => d.close)) * 1.03

  const first = data[0].close
  const last = data[data.length - 1].close
  const positive = last >= first

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${ticker}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={positive ? '#3ecf8e' : '#f87171'} stopOpacity={0.25} />
            <stop offset="95%" stopColor={positive ? '#3ecf8e' : '#f87171'} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={fmtDate}
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[minVal, maxVal]}
          tickFormatter={v => `${v.toFixed(0)}€`}
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
          tickLine={false}
          axisLine={false}
          width={52}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: 10,
            fontSize: 13,
            color: 'var(--text-primary)',
          }}
          formatter={(v: number) => [fmt(v), ticker]}
          labelFormatter={(l: string) => new Date(l).toLocaleDateString('fr-FR')}
        />
        <Area
          type="monotone"
          dataKey="close"
          stroke={positive ? '#3ecf8e' : '#f87171'}
          strokeWidth={2}
          fill={`url(#grad-${ticker})`}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
