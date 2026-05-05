import { useState, useRef, useEffect, useCallback } from 'react'
import { useLiquidGlass } from './hooks/useLiquidGlass'
import ETFExplorer from './pages/ModuleA/ETFExplorer'
import DCASimulator from './pages/ModuleB/DCASimulator'
import OLSRegression from './pages/ModuleC/OLSRegression'
import Documentation from './pages/Documentation'
import type { TabId } from './types'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'explorer', label: 'Explorer', icon: '◎' },
  { id: 'dca', label: 'Simulateur DCA', icon: '◈' },
  { id: 'ols', label: 'Régression OLS', icon: '◇' },
  { id: 'doc', label: 'Documentation', icon: '◻' },
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

  useEffect(() => {
    updatePill(activeTab)
  }, [activeTab, updatePill])

  useEffect(() => {
    const handleResize = () => updatePill(activeTab)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [activeTab, updatePill])

  const handleTabClick = (id: TabId) => {
    setActiveTab(id)
  }

  return (
    <div className="app-layout">
      <header className="app-header glass">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-icon">◈</span>
            <span className="brand-name">Portefeuille Passif</span>
            <span className="brand-badge">M2 MIAGE</span>
          </div>
          <nav className="nav-tabs" ref={navRef} role="tablist">
            <span
              className="pill-indicator"
              style={{ transform: `translateX(${pillStyle.left}px)`, width: pillStyle.width }}
              aria-hidden="true"
            />
            {TABS.map(tab => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`nav-tab${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => handleTabClick(tab.id)}
                ref={el => { if (el) btnRefs.current.set(tab.id, el) }}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="app-main">
        <div className={`screen${activeTab === 'explorer' ? ' screen-active' : ''}`} role="tabpanel" hidden={activeTab !== 'explorer'}>
          <ETFExplorer />
        </div>
        <div className={`screen${activeTab === 'dca' ? ' screen-active' : ''}`} role="tabpanel" hidden={activeTab !== 'dca'}>
          <DCASimulator />
        </div>
        <div className={`screen${activeTab === 'ols' ? ' screen-active' : ''}`} role="tabpanel" hidden={activeTab !== 'ols'}>
          <OLSRegression />
        </div>
        <div className={`screen${activeTab === 'doc' ? ' screen-active' : ''}`} role="tabpanel" hidden={activeTab !== 'doc'}>
          <Documentation />
        </div>
      </main>
    </div>
  )
}
