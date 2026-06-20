import { useState, useEffect, useCallback } from 'react'
import { searchETFs } from '../../api/etf'
import { runRegression } from '../../api/regression'
import OLSChart from '../../components/charts/OLSChart'
import ResidualsChart from '../../components/charts/ResidualsChart'
import { useT } from '../../i18n'
import type { ETFResponse, RegressionResponse } from '../../types'

const fmtNum = (v: number, d = 4) => v.toFixed(d)

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat-card glass">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  )
}

export default function OLSRegression() {
  const t = useT()
  const [etfs, setEtfs] = useState<ETFResponse[]>([])
  const [ticker, setTicker] = useState('')
  const [dateDebut, setDateDebut] = useState('2015-01-01')
  const [dateFin, setDateFin] = useState('2024-12-31')
  const [result, setResult] = useState<RegressionResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    searchETFs('').then(data => {
      setEtfs(data)
      if (data.length) setTicker(data[0].ticker)
    }).catch(() => {})
  }, [])

  const handleRun = useCallback(async () => {
    if (!ticker) return
    setLoading(true)
    setError(null)
    try {
      const data = await runRegression({ etf_ticker: ticker, date_debut: dateDebut, date_fin: dateFin })
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de régression')
    } finally {
      setLoading(false)
    }
  }, [ticker, dateDebut, dateFin])

  const pValueFmt = (p: number) => {
    if (p < 0.001) return '< 0.001'
    return p.toFixed(4)
  }

  const r2Quality = (r2: number) => {
    if (r2 >= 0.8) return { label: 'Excellent', cls: 'badge-pos' }
    if (r2 >= 0.5) return { label: 'Modéré', cls: 'badge-neutral' }
    return { label: 'Faible', cls: 'badge-neg' }
  }

  return (
    <div className="module-layout">
      <div className="module-hero">
        <h1 className="hero-title">{t('Régression OLS')}</h1>
        <p className="hero-sub">
          {t("Analyse statistique de la tendance historique d'un ETF par régression linéaire ordinaire (Ordinary Least Squares) avec intervalles de confiance à 95% et projection à 12 mois.")}
        </p>
      </div>

      <div className="ols-controls glass">
        <div className="ols-controls-inner">
          <div className="form-group" style={{ flex: 2 }}>
            <label className="form-label">{t('ETF analysé')}</label>
            <select className="form-select" value={ticker} onChange={e => setTicker(e.target.value)}>
              {etfs.map(e => (
                <option key={e.ticker} value={e.ticker}>
                  {e.ticker} · {e.nom || e.indice || ''}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{t('Date de début')}</label>
            <input type="date" className="form-input" value={dateDebut} min="2000-01-01" max={dateFin}
              onChange={e => setDateDebut(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">{t('Date de fin')}</label>
            <input type="date" className="form-input" value={dateFin} min={dateDebut} max="2025-12-31"
              onChange={e => setDateFin(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={handleRun} disabled={loading || !ticker}>
            {loading ? t('Calcul…') : t('Analyser')}
          </button>
        </div>

        {error && <div className="warning-box" style={{ marginTop: 12 }}>{error}</div>}
      </div>

      {!result && !loading && (
        <div className="empty-state glass">
          <span className="empty-icon">◇</span>
          <p>{t("Sélectionnez un ETF et une période, puis lancez l'analyse.")}</p>
        </div>
      )}

      {loading && (
        <div className="glass" style={{ padding: 24 }}>
          <div className="skeleton" style={{ height: 28, width: '50%', marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 340 }} />
        </div>
      )}

      {result && (
        <>
          <div className="warning-box ols-warning">
            <strong>{t('⚠ Avertissement statistique :')}</strong>{' '}
            {result.interpretation.avertissement}
          </div>

          <div className="ols-stats-grid">
            <StatCard
              label={t('R² (coefficient de détermination)')}
              value={fmtNum(result.r_squared, 4)}
              sub={`${t('Qualité :')} ${t(r2Quality(result.r_squared).label)}`}
            />
            <StatCard
              label={t('p-valeur (significativité)')}
              value={pValueFmt(result.p_value)}
              sub={result.p_value < 0.05 ? t('Significatif (< 0.05)') : t('Non significatif')}
            />
            <StatCard
              label={t('β₁ (tendance journalière)')}
              value={`${result.beta1 >= 0 ? '+' : ''}${fmtNum(result.beta1, 4)}€`}
              sub={`${result.interpretation.tendance_journaliere_euros >= 0 ? '+' : ''}${result.interpretation.tendance_journaliere_euros.toFixed(4)}€/j`}
            />
            <StatCard
              label="Durbin-Watson"
              value={result.durbin_watson != null ? fmtNum(result.durbin_watson, 3) : '-'}
              sub={t('Autocorrélation résidus (cible: ~2)')}
            />
            <StatCard
              label={t('Erreur standard')}
              value={`${fmtNum(result.std_error, 4)}€`}
              sub={`${result.nb_observations} ${t('observations')}`}
            />
            <StatCard
              label={t('β₀ (constante)')}
              value={`${fmtNum(result.beta0, 2)}€`}
              sub={t('Intercept OLS')}
            />
          </div>

          <div className="glass-strong" style={{ padding: 24, borderRadius: 16 }}>
            <h3 className="section-title" style={{ marginBottom: 16 }}>
              {t('Droite de régression + IC 95% + Projection 12M')}
            </h3>
            <OLSChart historique={result.donnees_historiques} projection={result.projection} />
          </div>

          <div className="glass" style={{ padding: 24, borderRadius: 16 }}>
            <h3 className="section-title" style={{ marginBottom: 12 }}>{t('Résidus')}</h3>
            <p className="section-sub">
              {t('Les résidus doivent être aléatoirement distribués autour de zéro sans structure. Un motif systématique indique une hétéroscédasticité.')}
            </p>
            <ResidualsChart data={result.donnees_historiques} />
          </div>

          <div className="glass" style={{ padding: 20, borderRadius: 12 }}>
            <p className="ols-disclaimer">{result.interpretation.projection_12m_disclaimer}</p>
          </div>
        </>
      )}
    </div>
  )
}
