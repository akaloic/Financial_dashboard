import { useState } from 'react'
import { LayoutDashboard, BarChart2, TrendingUp, Activity, BookOpen, Layers } from 'lucide-react'
import { useLiquidGlass } from './hooks/useLiquidGlass'
import { useT, LangToggle } from './i18n'
import ApiBanner from './components/ApiBanner'
import Overview from './pages/Overview'
import ETFExplorer from './pages/ModuleA/ETFExplorer'
import DCASimulator from './pages/ModuleB/DCASimulator'
import OLSRegression from './pages/ModuleC/OLSRegression'
import Documentation from './pages/Documentation'
import type { TabId } from './types'

const NAV: { id: TabId; label: string; Icon: React.ElementType }[] = [
  { id: 'overview',  label: "Vue d'ensemble", Icon: LayoutDashboard },
  { id: 'explorer',  label: 'Explorer',        Icon: BarChart2   },
  { id: 'dca',       label: 'Simulateur DCA',   Icon: TrendingUp  },
  { id: 'ols',       label: 'Régression OLS',   Icon: Activity    },
  { id: 'doc',       label: 'Documentation',    Icon: BookOpen    },
]

export default function App() {
  const t = useT()
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  useLiquidGlass()

  return (
    <div className="fin-shell">
      <aside className="fin-sidebar">
        <div className="fin-brand">
          <div className="fin-brand-mark"><Layers size={18} strokeWidth={2} /></div>
          <div className="fin-brand-text">
            <span className="fin-brand-name">{t('Portefeuille')}</span>
            <span className="fin-brand-tag">{t('Passif')}</span>
          </div>
        </div>

        <nav className="fin-nav">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`fin-nav-item${activeTab === id ? ' active' : ''}`}
              onClick={() => setActiveTab(id)}
              aria-current={activeTab === id}
            >
              <Icon size={18} strokeWidth={1.9} className="fin-nav-icon" />
              <span className="fin-nav-label">{t(label)}</span>
            </button>
          ))}
        </nav>

        <div className="fin-sidebar-foot">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><LangToggle /></div>
          <ApiBanner />
          <div className="fin-credit">M2 MIAGE · Projet DATA</div>
          <a
            href="https://akaloic.github.io/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              margin: '10px 10px 4px',
              padding: '9px 12px',
              borderRadius: 8,
              border: '1px solid var(--primary)',
              background: 'rgba(61,220,151,0.08)',
              color: 'var(--primary)',
              fontSize: 12,
              fontWeight: 600,
              textDecoration: 'none',
              letterSpacing: '0.02em',
              transition: 'background 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLAnchorElement
              el.style.background = 'rgba(61,220,151,0.18)'
              el.style.boxShadow = '0 0 14px rgba(61,220,151,0.25)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLAnchorElement
              el.style.background = 'rgba(61,220,151,0.08)'
              el.style.boxShadow = 'none'
            }}
          >
            ↗ Voir le Portfolio
          </a>
        </div>
      </aside>

      <div className="fin-main">
        {NAV.map(({ id }) => (
          <div key={id} className={`screen${activeTab === id ? ' screen-active' : ''}`} hidden={activeTab !== id}>
            {id === 'overview'  && <Overview onNavigate={setActiveTab} />}
            {id === 'explorer'  && <ETFExplorer />}
            {id === 'dca'       && <DCASimulator />}
            {id === 'ols'       && <OLSRegression />}
            {id === 'doc'       && <Documentation />}
          </div>
        ))}
      </div>
    </div>
  )
}
