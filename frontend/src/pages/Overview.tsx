import { BarChart2, TrendingUp, Activity, ArrowRight, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { SHOWCASE } from "../data/showcase";
import { HeroAreaChart, Sparkline } from "../components/charts/ShowcaseCharts";
import type { TabId } from "../types";

const ACCENT = "#3ddc97";
const DOWN = "#ff5c7c";

const eur = (v: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: v >= 100 ? 0 : 2 }).format(v) + " €";
const pctStr = (v: number) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)} %`;

/** Perf sur `monthsBack` mois (null si historique insuffisant). monthsBack=0 → depuis le début. */
function perf(points: { c: number }[], monthsBack: number): number | null {
  if (points.length < 2) return null;
  const last = points[points.length - 1].c;
  const idx = monthsBack === 0 ? 0 : points.length - 1 - monthsBack;
  if (idx < 0) return null;
  const base = points[idx].c;
  return base > 0 ? last / base - 1 : null;
}

function MarketCard({ etf, onClick }: { etf: (typeof SHOWCASE)[number]; onClick: () => void }) {
  const last = etf.points[etf.points.length - 1].c;
  const p1y = perf(etf.points, 12);
  const color = (p1y ?? 0) >= 0 ? ACCENT : DOWN;
  const values = etf.points.slice(-36).map((p) => p.c);
  return (
    <button className="ov-market" onClick={onClick}>
      <div className="ov-market-top">
        <div>
          <div className="ov-market-ticker">{etf.ticker}</div>
          <div className="ov-market-name">{etf.indice}</div>
        </div>
        <div className={`ov-chip ${(p1y ?? 0) >= 0 ? "up" : "down"}`}>
          {(p1y ?? 0) >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          {p1y != null ? pctStr(p1y) : "—"}
        </div>
      </div>
      <div className="ov-market-spark">
        <Sparkline values={values} color={color} />
      </div>
      <div className="ov-market-foot">
        <span className="ov-market-price">{eur(last)}</span>
        <span className="ov-market-cap">1 an</span>
      </div>
    </button>
  );
}

const MODULES: { tab: TabId; Icon: typeof BarChart2; title: string; desc: string }[] = [
  { tab: "explorer", Icon: BarChart2, title: "Explorer les ETF", desc: "Recherche, fiche détaillée et historique de cours sur 1 / 3 / 10 ans." },
  { tab: "dca", Icon: TrendingUp, title: "Simulateur DCA", desc: "Backteste un investissement programmé et compare au Livret A, avec profil de risque." },
  { tab: "ols", Icon: Activity, title: "Régression OLS", desc: "Tendance linéaire, R², Durbin-Watson et projection — avec les bons avertissements." },
];

export default function Overview({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const hero = SHOWCASE.find((e) => e.hero) ?? SHOWCASE[0];
  const heroLast = hero.points[hero.points.length - 1].c;
  const heroAll = perf(hero.points, 0);
  const heroColor = (heroAll ?? 0) >= 0 ? ACCENT : DOWN;
  const heroPerfs: { label: string; v: number | null }[] = [
    { label: "1 an", v: perf(hero.points, 12) },
    { label: "3 ans", v: perf(hero.points, 36) },
    { label: "Max", v: heroAll },
  ];

  return (
    <div className="overview">
      {/* ── HERO ── */}
      <section className="ov-hero">
        <div className="ov-hero-left">
          <div className="ov-eyebrow">
            <span className="ov-pulse" /> Données réelles · {SHOWCASE.length} indices · 10 ans d'historique
          </div>
          <h1 className="ov-title">
            Investis passivement.
            <br />
            <span className="ov-title-accent">Décide avec des données.</span>
          </h1>
          <p className="ov-lead">
            Explore les ETF, backteste ta stratégie d'investissement programmé et analyse les
            tendances — sur des cours réels, gratuitement. Sans jargon, sans frais cachés.
          </p>
          <div className="ov-cta-row">
            <button className="ov-btn ov-btn-primary" onClick={() => onNavigate("dca")}>
              Simuler mon investissement <ArrowRight size={17} />
            </button>
            <button className="ov-btn ov-btn-ghost" onClick={() => onNavigate("explorer")}>
              Explorer les ETF
            </button>
          </div>
          <div className="ov-hero-stats">
            <div className="ov-hstat">
              <div className="ov-hstat-val" style={{ color: ACCENT }}>
                {heroAll != null ? pctStr(heroAll) : "—"}
              </div>
              <div className="ov-hstat-lbl">MSCI World · 10 ans</div>
            </div>
            <div className="ov-hstat">
              <div className="ov-hstat-val">0,07 %</div>
              <div className="ov-hstat-lbl">TER à partir de</div>
            </div>
            <div className="ov-hstat">
              <div className="ov-hstat-val">PEA</div>
              <div className="ov-hstat-lbl">Enveloppe éligible</div>
            </div>
          </div>
        </div>

        <div className="ov-hero-card">
          <div className="ov-hero-card-head">
            <div>
              <div className="ov-hero-card-ticker">{hero.ticker}</div>
              <div className="ov-hero-card-name">{hero.nom}</div>
            </div>
            <div className="ov-hero-card-price">
              <div className="ov-hero-card-val">{eur(heroLast)}</div>
              <div className={`ov-chip ${(heroAll ?? 0) >= 0 ? "up" : "down"}`}>
                {(heroAll ?? 0) >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                {heroAll != null ? pctStr(heroAll) : "—"}
              </div>
            </div>
          </div>
          <HeroAreaChart points={hero.points} color={heroColor} />
          <div className="ov-hero-perfs">
            {heroPerfs.map((p) => (
              <div key={p.label} className="ov-hero-perf">
                <span className="ov-hero-perf-lbl">{p.label}</span>
                <span
                  className="ov-hero-perf-val"
                  style={{ color: (p.v ?? 0) >= 0 ? ACCENT : DOWN }}
                >
                  {p.v != null ? pctStr(p.v) : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MARCHÉS ── */}
      <section className="ov-section">
        <div className="ov-section-head">
          <h2 className="ov-section-title">Les marchés en un coup d'œil</h2>
          <button className="ov-link" onClick={() => onNavigate("explorer")}>
            Tout explorer <ArrowRight size={15} />
          </button>
        </div>
        <div className="ov-market-grid">
          {SHOWCASE.map((etf) => (
            <MarketCard key={etf.ticker} etf={etf} onClick={() => onNavigate("explorer")} />
          ))}
        </div>
      </section>

      {/* ── OUTILS ── */}
      <section className="ov-section">
        <div className="ov-section-head">
          <h2 className="ov-section-title">Tes outils</h2>
        </div>
        <div className="ov-module-grid">
          {MODULES.map(({ tab, Icon, title, desc }) => (
            <button key={tab} className="ov-module" onClick={() => onNavigate(tab)}>
              <div className="ov-module-icon">
                <Icon size={22} strokeWidth={1.8} />
              </div>
              <div className="ov-module-title">{title}</div>
              <div className="ov-module-desc">{desc}</div>
              <div className="ov-module-cta">
                Ouvrir <ArrowRight size={15} />
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
