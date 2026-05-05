import { useMemo, useRef, useState } from 'react'
import type { HistoriqueRegressionPoint, ProjectionPoint } from '../../types'

interface Props {
  historique: HistoriqueRegressionPoint[]
  projection: ProjectionPoint[]
}

const PAD = { top: 20, right: 20, bottom: 32, left: 56 }

function useSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ w: 700, h: 340 })
  useMemo(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => {
      setSize({ w: e.contentRect.width, h: e.contentRect.height })
    })
    ro.observe(ref.current)
    return () => ro.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return size
}

export default function OLSChart({ historique, projection }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { w, h } = useSize(containerRef)

  const allDates = useMemo(() => [
    ...historique.map(d => d.date),
    ...projection.map(d => d.date),
  ], [historique, projection])

  const allVals = useMemo(() => [
    ...historique.flatMap(d => [d.adj_close, d.ic_low, d.ic_high, d.y_pred]),
    ...projection.flatMap(d => [d.ic_low, d.ic_high, d.y_pred]),
  ].filter(Boolean), [historique, projection])

  const innerW = w - PAD.left - PAD.right
  const innerH = h - PAD.top - PAD.bottom

  const xMin = 0
  const xMax = allDates.length - 1
  const yMin = Math.min(...allVals) * 0.97
  const yMax = Math.max(...allVals) * 1.03

  const toX = (i: number) => PAD.left + (i / (xMax || 1)) * innerW
  const toY = (v: number) => PAD.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })

  const histCount = historique.length

  const ciHistPath = useMemo(() => {
    if (!historique.length) return ''
    const top = historique.map((d, i) => `${toX(i)},${toY(d.ic_high)}`).join(' L ')
    const bot = [...historique].reverse().map((d, i) => `${toX(histCount - 1 - i)},${toY(d.ic_low)}`).join(' L ')
    return `M ${top} L ${bot} Z`
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historique, w, h])

  const ciProjPath = useMemo(() => {
    if (!projection.length) return ''
    const offset = histCount
    const top = projection.map((d, i) => `${toX(offset + i)},${toY(d.ic_high)}`).join(' L ')
    const bot = [...projection].reverse().map((d, i) => `${toX(offset + projection.length - 1 - i)},${toY(d.ic_low)}`).join(' L ')
    return `M ${top} L ${bot} Z`
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projection, histCount, w, h])

  const fitPath = useMemo(() => {
    if (!historique.length) return ''
    return historique.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)},${toY(d.y_pred)}`).join(' ')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historique, w, h])

  const projPath = useMemo(() => {
    if (!projection.length) return ''
    const offset = histCount
    const start = historique.length ? `M ${toX(histCount - 1)},${toY(historique[histCount - 1].y_pred)}` : ''
    const rest = projection.map((d, i) => `L ${toX(offset + i)},${toY(d.y_pred)}`).join(' ')
    return `${start} ${rest}`
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historique, projection, histCount, w, h])

  const scatterPoints = useMemo(() =>
    historique.map((d, i) => ({ x: toX(i), y: toY(d.adj_close) }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  , [historique, w, h])

  const xTicks = useMemo(() => {
    const step = Math.max(1, Math.floor(allDates.length / 6))
    return allDates.filter((_, i) => i % step === 0 || i === allDates.length - 1).map((d, _, arr) => {
      const idx = allDates.indexOf(d)
      return { x: toX(idx), label: fmtDate(d) }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDates, w, h])

  const yTickCount = 5
  const yTicks = useMemo(() =>
    Array.from({ length: yTickCount }, (_, i) => {
      const v = yMin + (i / (yTickCount - 1)) * (yMax - yMin)
      return { y: toY(v), label: `${v.toFixed(0)}€` }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  , [yMin, yMax, h])

  if (!historique.length) return null

  return (
    <div ref={containerRef} style={{ width: '100%', height: 340 }}>
      <svg width={w} height={h}>
        {/* Grid lines */}
        {yTicks.map((t, i) => (
          <line key={i} x1={PAD.left} y1={t.y} x2={w - PAD.right} y2={t.y}
            stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
        ))}

        {/* CI band - historique */}
        <path d={ciHistPath} fill="rgba(99,102,241,0.12)" />
        {/* CI band - projection */}
        <path d={ciProjPath} fill="rgba(62,207,142,0.10)" />

        {/* Separation line between hist and projection */}
        {historique.length > 0 && projection.length > 0 && (
          <line
            x1={toX(histCount - 1)} y1={PAD.top}
            x2={toX(histCount - 1)} y2={PAD.top + innerH}
            stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" strokeWidth={1}
          />
        )}

        {/* Scatter points */}
        {scatterPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={1.5}
            fill="rgba(99,102,241,0.55)" />
        ))}

        {/* Fit line */}
        <path d={fitPath} fill="none" stroke="#6366f1" strokeWidth={2} />

        {/* Projection line */}
        <path d={projPath} fill="none" stroke="#3ecf8e" strokeWidth={2} strokeDasharray="6 3" />

        {/* Y axis labels */}
        {yTicks.map((t, i) => (
          <text key={i} x={PAD.left - 6} y={t.y + 4} textAnchor="end"
            fontSize={10} fill="var(--text-muted)">{t.label}</text>
        ))}

        {/* X axis labels */}
        {xTicks.map((t, i) => (
          <text key={i} x={t.x} y={h - 6} textAnchor="middle"
            fontSize={10} fill="var(--text-muted)">{t.label}</text>
        ))}

        {/* Legend */}
        <g transform={`translate(${PAD.left + 8}, ${PAD.top + 8})`}>
          <rect width={8} height={2} y={5} fill="#6366f1" />
          <text x={14} y={9} fontSize={10} fill="var(--text-secondary)">Droite OLS</text>
          <rect width={8} height={2} y={21} fill="#3ecf8e" />
          <text x={14} y={25} fontSize={10} fill="var(--text-secondary)">Projection 12M</text>
        </g>
      </svg>
    </div>
  )
}
