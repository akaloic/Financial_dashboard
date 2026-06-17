import { useState, useEffect, useCallback } from "react";
import { searchETFs } from "../../api/etf";
import { runSimulation } from "../../api/simulation";
import DCAChart from "../../components/charts/DCAChart";
import type { ETFResponse, SimulationResponse } from "../../types";

const fmt = (v: number, decimals = 0) =>
    new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: decimals,
    }).format(v);

const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
const fmtRatioPct = (v: number) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;

const RISK_COLORS: Record<string, { bg: string; fg: string }> = {
    faible: { bg: "rgba(34,197,94,.15)", fg: "#22c55e" },
    modéré: { bg: "rgba(59,130,246,.15)", fg: "#3b82f6" },
    élevé: { bg: "rgba(249,115,22,.15)", fg: "#f97316" },
    "très élevé": { bg: "rgba(239,68,68,.15)", fg: "#ef4444" },
    indéterminé: { bg: "rgba(148,163,184,.15)", fg: "#94a3b8" },
};

function MetricCell({
    label,
    value,
    tone,
    hint,
}: {
    label: string;
    value: string;
    tone?: "pos" | "neg";
    hint?: string;
}) {
    const color = tone === "pos" ? "#22c55e" : tone === "neg" ? "#ef4444" : undefined;
    return (
        <div style={{ background: "rgba(255,255,255,.03)", borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
            {hint && <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>{hint}</div>}
        </div>
    );
}

function SliderField({
    label,
    value,
    min,
    max,
    step,
    onChange,
    format,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (v: number) => void;
    format: (v: number) => string;
}) {
    return (
        <div className="slider-field">
            <div className="slider-header">
                <span className="slider-label">{label}</span>
                <span className="slider-value">{format(value)}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="slider"
                style={
                    {
                        "--p": `${((value - min) / (max - min)) * 100}%`,
                    } as React.CSSProperties
                }
            />
            <div className="slider-ticks">
                <span>{format(min)}</span>
                <span>{format(max)}</span>
            </div>
        </div>
    );
}

export default function DCASimulator() {
    const [etfs, setEtfs] = useState<ETFResponse[]>([]);
    const [ticker, setTicker] = useState("");
    const [capital, setCapital] = useState(1000);
    const [versement, setVersement] = useState(200);
    const [dateDebut, setDateDebut] = useState("2015-01-01");
    const [dateFin, setDateFin] = useState("2024-12-31");
    const [result, setResult] = useState<SimulationResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showTable, setShowTable] = useState(false);

    useEffect(() => {
        searchETFs("")
            .then((data) => {
                setEtfs(data);
                if (data.length) setTicker(data[0].ticker);
            })
            .catch(() => {});
    }, []);

    const selectedETF = etfs.find((e) => e.ticker === ticker);

    const handleRun = useCallback(async () => {
        if (!ticker) return;
        setLoading(true);
        setError(null);
        try {
            const data = await runSimulation({
                etf_ticker: ticker,
                capital_initial: capital,
                versement_mensuel: versement,
                date_debut: dateDebut,
                date_fin: dateFin,
                ter: selectedETF?.ter ?? 0.002,
            });
            setResult(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Erreur de simulation");
        } finally {
            setLoading(false);
        }
    }, [ticker, capital, versement, dateDebut, dateFin, selectedETF]);

    return (
        <div className="module-layout">
            <div className="module-hero">
                <h1 className="hero-title">Simulateur DCA</h1>
                <p className="hero-sub">
                    Simulez une stratégie d'investissement programmé mensuel
                    (Dollar-Cost Averaging) en backtesting sur données réelles.
                </p>
            </div>

            <div className="dca-layout">
                <div className="dca-controls glass">
                    <h2 className="section-title">Paramètres</h2>

                    <div className="form-group">
                        <label className="form-label">ETF cible</label>
                        <select
                            className="form-select"
                            value={ticker}
                            onChange={(e) => setTicker(e.target.value)}
                        >
                            {etfs.map((e) => (
                                <option key={e.ticker} value={e.ticker}>
                                    {e.ticker} — {e.nom || e.indice || ""}
                                </option>
                            ))}
                        </select>
                    </div>

                    <SliderField
                        label="Capital initial"
                        value={capital}
                        min={0}
                        max={50000}
                        step={500}
                        onChange={setCapital}
                        format={(v) => fmt(v)}
                    />

                    <SliderField
                        label="Versement mensuel"
                        value={versement}
                        min={50}
                        max={2000}
                        step={50}
                        onChange={setVersement}
                        format={(v) => fmt(v)}
                    />

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Date de début</label>
                            <input
                                type="date"
                                className="form-input"
                                value={dateDebut}
                                min="2000-01-01"
                                max={dateFin}
                                onChange={(e) => setDateDebut(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Date de fin</label>
                            <input
                                type="date"
                                className="form-input"
                                value={dateFin}
                                min={dateDebut}
                                max="2025-12-31"
                                onChange={(e) => setDateFin(e.target.value)}
                            />
                        </div>
                    </div>

                    {selectedETF?.ter != null && (
                        <div className="form-info">
                            TER appliqué :{" "}
                            <strong>
                                {(selectedETF.ter * 100).toFixed(2)}%
                            </strong>
                            /an (prélevé mensuellement)
                        </div>
                    )}

                    <button
                        className="btn-primary"
                        onClick={handleRun}
                        disabled={loading || !ticker}
                    >
                        {loading ? "Calcul en cours…" : "Lancer la simulation"}
                    </button>

                    {error && <div className="warning-box">{error}</div>}
                </div>

                <div className="dca-results">
                    {!result && !loading && (
                        <div className="empty-state glass">
                            <span className="empty-icon">◈</span>
                            <p>
                                Configurez vos paramètres et lancez la
                                simulation pour voir les résultats.
                            </p>
                        </div>
                    )}

                    {loading && (
                        <div className="glass" style={{ padding: 24 }}>
                            <div
                                className="skeleton"
                                style={{
                                    height: 32,
                                    width: "60%",
                                    marginBottom: 16,
                                }}
                            />
                            <div className="skeleton" style={{ height: 300 }} />
                        </div>
                    )}

                    {result && (
                        <>
                            <div className="kpi-grid">
                                <div className="kpi-card glass">
                                    <span className="kpi-label">
                                        Valeur finale nette
                                    </span>
                                    <span className="kpi-value kpi-primary">
                                        {fmt(result.valeur_finale_nette)}
                                    </span>
                                    <span className="kpi-sub">
                                        {fmtPct(result.gain_net_pct)} de gain
                                        net
                                    </span>
                                </div>
                                <div className="kpi-card glass">
                                    <span className="kpi-label">
                                        Capital investi
                                    </span>
                                    <span className="kpi-value">
                                        {fmt(result.capital_total_investi)}
                                    </span>
                                    <span className="kpi-sub">
                                        {result.nb_mois} versements
                                    </span>
                                </div>
                                <div className="kpi-card glass">
                                    <span className="kpi-label">Gain net</span>
                                    <span
                                        className={`kpi-value ${result.gain_net_euros >= 0 ? "kpi-pos" : "kpi-neg"}`}
                                    >
                                        {fmt(result.gain_net_euros)}
                                    </span>
                                    <span className="kpi-sub">
                                        CAGR net{" "}
                                        {(result.cagr_net * 100).toFixed(2)}%/an
                                    </span>
                                </div>
                                <div className="kpi-card glass">
                                    <span className="kpi-label">
                                        Livret A (3%)
                                    </span>
                                    <span className="kpi-value kpi-livret">
                                        {fmt(result.valeur_livret_a)}
                                    </span>
                                    <span className="kpi-sub">
                                        ETF{" "}
                                        {result.valeur_finale_nette >=
                                        result.valeur_livret_a
                                            ? "+"
                                            : ""}
                                        {fmt(
                                            result.valeur_finale_nette -
                                                result.valeur_livret_a,
                                        )}{" "}
                                        vs Livret A
                                    </span>
                                </div>
                            </div>

                            <div className="glass" style={{ padding: 20, borderRadius: 16 }}>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        marginBottom: 14,
                                        flexWrap: "wrap",
                                        gap: 8,
                                    }}
                                >
                                    <h2 className="section-title" style={{ margin: 0 }}>
                                        Profil de risque de l'actif
                                    </h2>
                                    <span
                                        style={{
                                            padding: "4px 14px",
                                            borderRadius: 999,
                                            fontSize: 13,
                                            fontWeight: 600,
                                            textTransform: "capitalize",
                                            ...(RISK_COLORS[result.metriques_risque.profil_risque] ??
                                                RISK_COLORS["indéterminé"]),
                                        }}
                                    >
                                        Risque {result.metriques_risque.profil_risque}
                                    </span>
                                </div>
                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns:
                                            "repeat(auto-fit, minmax(120px, 1fr))",
                                        gap: 12,
                                    }}
                                >
                                    <MetricCell
                                        label="Volatilité (annualisée)"
                                        value={fmtRatioPct(
                                            result.metriques_risque.volatilite_annualisee,
                                        ).replace("+", "")}
                                    />
                                    <MetricCell
                                        label="Ratio de Sharpe"
                                        value={result.metriques_risque.sharpe.toFixed(2)}
                                        hint="rendement / risque"
                                    />
                                    <MetricCell
                                        label="Ratio de Sortino"
                                        value={result.metriques_risque.sortino.toFixed(2)}
                                        hint="risque baissier"
                                    />
                                    <MetricCell
                                        label="Max drawdown"
                                        value={fmtRatioPct(
                                            result.metriques_risque.max_drawdown,
                                        )}
                                        tone="neg"
                                        hint="pire pic → creux"
                                    />
                                    <MetricCell
                                        label="Meilleur mois"
                                        value={fmtRatioPct(
                                            result.metriques_risque.meilleur_mois,
                                        )}
                                        tone="pos"
                                    />
                                    <MetricCell
                                        label="Pire mois"
                                        value={fmtRatioPct(result.metriques_risque.pire_mois)}
                                        tone="neg"
                                    />
                                </div>
                                <p
                                    style={{
                                        fontSize: 12,
                                        opacity: 0.55,
                                        marginTop: 12,
                                        marginBottom: 0,
                                    }}
                                >
                                    {result.metriques_risque.note}
                                </p>
                            </div>

                            <div
                                className="glass-strong"
                                style={{ padding: 24, borderRadius: 16 }}
                            >
                                <DCAChart
                                    data={result.resultats_mensuels}
                                    livretA={result.valeur_livret_a}
                                    capitalInvesti={
                                        result.capital_total_investi
                                    }
                                />
                            </div>

                            <div
                                className="glass"
                                style={{ padding: 16, borderRadius: 12 }}
                            >
                                <button
                                    className="btn-ghost"
                                    onClick={() => setShowTable((v) => !v)}
                                >
                                    {showTable
                                        ? "▲ Masquer le tableau détaillé"
                                        : "▼ Voir le tableau détaillé"}
                                </button>

                                {showTable && (
                                    <div
                                        className="table-wrapper"
                                        style={{ marginTop: 12 }}
                                    >
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th>Mois</th>
                                                    <th>Date</th>
                                                    <th>Prix clôture</th>
                                                    <th>Parts achetées</th>
                                                    <th>Parts cumulées</th>
                                                    <th>Valeur brute</th>
                                                    <th>Valeur nette</th>
                                                    <th>Capital investi</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {result.resultats_mensuels.map(
                                                    (r) => (
                                                        <tr key={r.mois}>
                                                            <td>{r.mois}</td>
                                                            <td>
                                                                {new Date(
                                                                    r.date,
                                                                ).toLocaleDateString(
                                                                    "fr-FR",
                                                                    {
                                                                        month: "short",
                                                                        year: "numeric",
                                                                    },
                                                                )}
                                                            </td>
                                                            <td>
                                                                {fmt(
                                                                    r.prix_cloture,
                                                                    2,
                                                                )}
                                                            </td>
                                                            <td>
                                                                {r.parts_achetees.toFixed(
                                                                    4,
                                                                )}
                                                            </td>
                                                            <td>
                                                                {r.parts_cumulees.toFixed(
                                                                    4,
                                                                )}
                                                            </td>
                                                            <td>
                                                                {fmt(
                                                                    r.valeur_brute,
                                                                )}
                                                            </td>
                                                            <td>
                                                                {fmt(
                                                                    r.valeur_nette,
                                                                )}
                                                            </td>
                                                            <td>
                                                                {fmt(
                                                                    r.capital_investi,
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ),
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
