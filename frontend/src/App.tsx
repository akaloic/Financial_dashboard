import { useState, useRef, useEffect, useCallback } from 'react'
import { BarChart2, TrendingUp, Activity, BookOpen, Layers } from 'lucide-react'
import { useLiquidGlass } from './hooks/useLiquidGlass'
import ApiBanner from './components/ApiBanner'
import ETFExplorer from './pages/ModuleA/ETFExplorer'
import DCASimulator from './pages/ModuleB/DCASimulator'
import OLSRegression from './pages/ModuleC/OLSRegression'
import Documentation from './pages/Documentation'
import type { TabId } from './types'

const TABS: { id: TabId; label: string; Icon: React.ElementType }[] = [
  { id: 'explorer',  label: 'Explorer',        Icon: BarChart2   },
  { id: 'dca',       label: 'Simulateur DCA',   Icon: TrendingUp  },
  { id: 'ols',       label: 'Régression OLS',   Icon: Activity    },
  { id: 'doc',       label: 'Documentation',    Icon: BookOpen    },
]

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('explorer')
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 })
  const navRef = useRef<HTMLDivElement>(null)
  const btnRefs = useRef<Map<TabId, HTMLButtonElement>>(new Map())

  useLiquidGlass()

  const updatePill = useCallback((id: TabId) => {
    const btn = btnRefs.current.get(id)
    const nav = navRef.current
    if (!btn || !nav) return
    const btnRect = btn.getBoundingClientRect()
    const navRect = nav.getBoundingClientRect()
    setPillStyle({ left: btnRect.left - navRect.left, width: btnRect.width })
  }, [])

  useEffect(() => { updatePill(activeTab) }, [activeTab, updatePill])

  useEffect(() => {
    const onResize = () => updatePill(activeTab)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [activeTab, updatePill])

  return (
    <div className="app-layout">
      <header className="app-header glass">
        <div className="header-inner">
          <div className="brand">
            <Layers size={18} strokeWidth={1.5} className="brand-icon-svg" />
            <span className="brand-name">Portefeuille Passif</span>
            {/* <span className="brand-badge">M2 MIAGE</span> */}
          </div>
          <nav className="nav-tabs" ref={navRef} role="tablist">
            <span
              className="pill-indicator"
              style={{ transform: `translateX(${pillStyle.left}px)`, width: pillStyle.width }}
              aria-hidden="true"
            />
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={activeTab === id}
                className={`nav-tab${activeTab === id ? ' active' : ''}`}
                onClick={() => setActiveTab(id)}
                ref={el => { if (el) btnRefs.current.set(id, el) }}
              >
                <Icon size={15} strokeWidth={1.8} className="tab-icon-svg" />
                <span className="tab-label">{label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <ApiBanner />

      <main className="app-main">
        {TABS.map(({ id }) => (
          <div
            key={id}
            className={`screen${activeTab === id ? ' screen-active' : ''}`}
            role="tabpanel"
            hidden={activeTab !== id}
          >
            {id === 'explorer'  && <ETFExplorer />}
            {id === 'dca'       && <DCASimulator />}
            {id === 'ols'       && <OLSRegression />}
            {id === 'doc'       && <Documentation />}
          </div>
        ))}
      </main>
    </div>
  )
}
