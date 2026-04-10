import { useState, useEffect } from 'react'
import { LayoutDashboard, Upload, TrendingUp, FileText, Settings, BarChart3 } from 'lucide-react'
import Dashboard from './pages/Dashboard.jsx'
import ImportPage from './pages/ImportPage.jsx'
import ForecastPage from './pages/ForecastPage.jsx'
import HistoryPage from './pages/HistoryPage.jsx'
import StatsPage from './pages/StatsPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import { getAllPayslips } from './lib/db.js'

const NAV = [
  { id: 'dashboard', label: 'Home',      icon: LayoutDashboard },
  { id: 'forecast',  label: 'Previsione', icon: TrendingUp },
  { id: 'stats',     label: 'Statistiche', icon: BarChart3 },
  { id: 'history',   label: 'Cedolini',  icon: FileText },
  { id: 'import',    label: 'Importa',   icon: Upload },
]

const SIDEBAR_EXTRA = [
  { id: 'settings', label: 'Impostazioni', icon: Settings },
]

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [payslips, setPayslips] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    const data = await getAllPayslips()
    setPayslips(data)
    setLoading(false)
  }

  useEffect(() => { refresh() }, [])

  const pageProps = { payslips, onRefresh: refresh, onNavigate: setPage }

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard {...pageProps} />
      case 'import':    return <ImportPage {...pageProps} />
      case 'forecast':  return <ForecastPage {...pageProps} />
      case 'stats':     return <StatsPage {...pageProps} />
      case 'history':   return <HistoryPage {...pageProps} />
      case 'settings':  return <SettingsPage {...pageProps} />
      default:          return <Dashboard {...pageProps} />
    }
  }

  const currentLabel = [...NAV, ...SIDEBAR_EXTRA].find(n => n.id === page)?.label ?? 'Cedolino'

  return (
    <div className="app">

      {/* ── Desktop sidebar ─────────────────────── */}
      <aside className="sidebar-desktop">
        <div className="sidebar-logo">
          <h1>Cedolino<br/>Tracker</h1>
          <span>v1.0 · Italia</span>
        </div>

        <nav className="nav-section">
          <div className="nav-label">Navigazione</div>
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => setPage(id)}>
              <Icon size={15} />{label}
            </button>
          ))}
          {SIDEBAR_EXTRA.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => setPage(id)}>
              <Icon size={15} />{label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-stat">Cedolini: <strong>{payslips.length}</strong></div>
          {payslips.length > 0 && (
            <div className="sidebar-stat">Dal: <strong>{payslips[0]?.month}/{payslips[0]?.year}</strong></div>
          )}
        </div>
      </aside>

      {/* ── Mobile top bar ──────────────────────── */}
      <header className="top-bar">
        <div className="top-bar-logo">Cedolino<span>.</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="top-bar-count">{currentLabel}</span>
          <button
            className="nav-btn"
            style={{ flexDirection: 'row', gap: 4, minHeight: 'unset', padding: '6px 10px',
              background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)', color: 'var(--text2)' }}
            onClick={() => setPage('settings')}
          >
            <Settings size={15} />
          </button>
        </div>
      </header>

      {/* ── Main scroll area ────────────────────── */}
      <main className="scroll-area">
        {loading ? (
          <div className="loading-page">
            <div className="loading-spin" style={{ width: 28, height: 28 }} />
            <span>Caricamento...</span>
          </div>
        ) : renderPage()}
      </main>

      {/* ── Mobile bottom nav ───────────────────── */}
      <nav className="bottom-nav">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`nav-btn ${page === id ? 'active' : ''}`} onClick={() => setPage(id)}>
            <Icon size={20} />
            <span>{label}</span>
            <div className="nav-btn-dot" />
          </button>
        ))}
      </nav>

    </div>
  )
}
