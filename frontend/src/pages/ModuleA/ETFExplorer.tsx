import { useState, useEffect, useRef, useCallback } from 'react'
import { searchETFs, getHistorique } from '../../api/etf'
import PriceChart from '../../components/charts/PriceChart'
import type { ETFResponse, HistoriquePoint } from '../../types'

const PERIODS = ['1y', '3y', '10y'] as const
type Period = typeof PERIODS[number]

const PERIOD_LABELS: Record<Period, string> = { '1y': '1 an', '3y': '3 ans', '10y': '10 ans' }

function ETFCard({ etf, selected, onClick }: { etf: ETFResponse; selected: boolean; onClick: () => void }) {
  return (
    <button
      className={`etf-card glass${selected ? ' selected' : ''}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      <div className="etf-card-header">
        <span className="etf-ticker">{etf.ticker}</span>
        {etf.eligible_pea && <span className="badge badge-pea">PEA</span>}
      </div>
      <div className="etf-card-name">{etf.nom || '—'}</div>
      <div className="etf-card-meta">
        <span>{etf.indice || '—'}</span>
        {etf.ter != null && <span className="etf-ter">TER {(etf.ter * 100).toFixed(2)}%</span>}
      </div>
    </button>
  )
}

export default function ETFExplorer() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ETFResponse[]>([])
  const [selected, setSelected] = useState<ETFResponse | null>(null)
  const [period, setPeriod] = useState<Period>('1y')
  const [historique, setHistorique] = useState<HistoriquePoint[]>([])
  const [loading, setLoading] = useState(false)
  const [chartLoading, setChartLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback(async (q: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await searchETFs(q)
      setResults(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de recherche')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(query), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, doSearch])

  useEffect(() => {
    doSearch('')
  }, [doSearch])

  const loadHistorique = useCallback(async (ticker: string, p: Period) => {
    setChartLoading(true)
    try {
      const data = await getHistorique(ticker, p)
      setHistorique(data.data)
    } catch {
      setHistorique([])
    } finally {
      setChartLoading(false)
    }
  }, [])

  const handleSelect = (etf: ETFResponse) => {
    setSelected(etf)
    loadHistorique(etf.ticker, period)
  }

  const handlePeriod = (p: Period) => {
    setPeriod(p)
    if (selected) loadHistorique(selected.ticker, p)
  }

  const pct = historique.length >= 2
    ? ((historique[historique.length - 1].close - historique[0].close) / historique[0].close) * 100
    : null

  return (
    <div className="module-layout">
      <div className="module-hero">
        <h1 className="hero-title">Explorer les ETF</h1>
        <p className="hero-sub">Recherchez, comparez et analysez les ETF disponibles sur Euronext Paris.</p>
      </div>

      <div className="search-bar glass">
        <span className="search-icon">⌕</span>
        <input
          className="search-input"
          type="text"
          placeholder="Rechercher par ticker, nom, indice…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        {loading && <span className="search-spinner" />}
      </div>

      {error && <div className="warning-box">{error}</div>}

      <div className="etf-grid">
        {results.map(etf => (
          <ETFCard
            key={etf.id}
            etf={etf}
            selected={selected?.ticker === etf.ticker}
            onClick={() => handleSelect(etf)}
          />
        ))}
        {!loading && results.length === 0 && (
          <div className="empty-state">Aucun ETF trouvé pour « {query} »</div>
        )}
      </div>

      {selected && (
        <div className="chart-panel glass-strong">
          <div className="chart-panel-header">
            <div className="chart-panel-title">
              <span className="chart-ticker">{selected.ticker}</span>
              <span className="chart-name">{selected.nom}</span>
              {pct != null && (
                <span className={`badge ${pct >= 0 ? 'badge-pos' : 'badge-neg'}`}>
                  {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                </span>
              )}
            </div>
            <div className="period-selector">
              {PERIODS.map(p => (
                <button
                  key={p}
                  className={`period-btn${period === p ? ' active' : ''}`}
                  onClick={() => handlePeriod(p)}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {chartLoading ? (
            <div className="skeleton" style={{ height: 260, borderRadius: 8 }} />
          ) : (
            <PriceChart data={historique} ticker={selected.ticker} />
          )}

          <div className="etf-detail-grid">
            <div className="detail-item">
              <span className="detail-label">Gestionnaire</span>
              <span className="detail-value">{selected.gestionnaire || '—'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Indice</span>
              <span className="detail-value">{selected.indice || '—'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">TER</span>
              <span className="detail-value">
                {selected.ter != null ? `${(selected.ter * 100).toFixed(2)}%` : '—'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Éligible PEA</span>
              <span className="detail-value">{selected.eligible_pea ? 'Oui' : 'Non'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Devise</span>
              <span className="detail-value">{selected.devise || '—'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Dernier cours</span>
              <span className="detail-value">
                {selected.derniere_date_cours
                  ? new Date(selected.derniere_date_cours).toLocaleDateString('fr-FR')
                  : '—'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
