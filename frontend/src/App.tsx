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
              display: 'block',
              fontSize: 11,
              color: 'var(--text-3)',
              textDecoration: 'none',
              padding: '6px 10px 10px',
              opacity: 0.8,
              transition: 'color 0.15s, opacity 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--primary)'; (e.currentTarget as HTMLAnchorElement).style.opacity = '1' }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-3)'; (e.currentTarget as HTMLAnchorElement).style.opacity = '0.8' }}
          >
            ↗ Portfolio · akaloic.github.io
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
