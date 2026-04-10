import { useState, useEffect, useMemo } from 'react'
import { TrendingUp, Calendar, Star, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { forecastMonths, fmtEur, fmtNum, MESI, REGIONI, getWorkingDays } from '../lib/taxEngine.js'
import { getSetting, setSetting } from '../lib/db.js'

function CT({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="custom-tooltip">
      <div className="label">{label}</div>
      {payload.map((p, i) => p.value != null && <div key={i} style={{ color: p.color }}>{p.name}: {fmtEur(p.value)}</div>)}
    </div>
  )
}

export default function ForecastPage({ payslips }) {
  const [settings, setSettings] = useState({ addRegionale: 0.0173, addComunale: 0.006, hireDate: '', scattoAmount: 21.95, monthsAhead: 12, regione: 'Lombardia' })
  const [expanded, setExpanded] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getSetting('forecastSettings').then(s => { if (s) setSettings(p => ({ ...p, ...s })); setLoaded(true) })
  }, [])

  const saveSettings = async (s) => { await setSetting('forecastSettings', s) }

  const forecasts = useMemo(() => {
    if (!payslips.length || !loaded) return []
    return forecastMonths({ payslips, monthsAhead: settings.monthsAhead, settings })
  }, [payslips, settings, loaded])

  const historicalAvg = useMemo(() => {
    if (!payslips.length) return 0
    const last6 = payslips.slice(-6)
    return last6.reduce((s, p) => s + (p.net || 0), 0) / last6.length
  }, [payslips])

  const totalNet = forecasts.reduce((s, f) => s + f.net, 0)
  const avgNet = forecasts.length ? totalNet / forecasts.length : 0
  const totalTFR = forecasts.reduce((s, f) => s + f.tfr, 0)

  const chartData = useMemo(() => {
    const hist = payslips.slice(-3).map(p => ({ name: `${MESI[p.month-1]?.slice(0,3)}`, Storico: p.net || 0, Previsto: null }))
    const fore = forecasts.map(f => ({ name: `${MESI[f.month-1]?.slice(0,3)} ${f.year}`, Storico: null, Previsto: f.net }))
    return [...hist, ...fore]
  }, [payslips, forecasts])

  if (!payslips.length) {
    return (
      <div className="fade-in">
        <div className="page-header"><h2>Previsione</h2></div>
        <div className="empty-state"><TrendingUp size={44} /><h3>Nessun dato storico</h3><p>Importa almeno un cedolino per le previsioni</p></div>
      </div>
    )
  }

  const nextScatto = (() => {
    if (!settings.hireDate) return null
    const hire = new Date(settings.hireDate)
    const now = new Date()
    const m = (now.getFullYear() - hire.getFullYear()) * 12 + now.getMonth() - hire.getMonth()
    const rem = 36 - (m % 36)
    const d = new Date(now.getFullYear(), now.getMonth() + rem, 1)
    return { label: `${MESI[d.getMonth()]} ${d.getFullYear()}`, months: rem }
  })()

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>Previsione</h2>
        <p>Basata su {payslips.length} cedolini · IRPEF 2026</p>
      </div>

      {/* KPI cards */}
      <div className="cards-scroll stagger">
        <div className="kpi-card accent">
          <div className="kpi-icon accent-icon"><TrendingUp size={14} /></div>
          <div className="kpi-label">Media prevista</div>
          <div className="kpi-value">{fmtEur(avgNet)}</div>
          <div className={`kpi-delta ${avgNet >= historicalAvg ? 'pos' : 'neg'}`}>
            {fmtEur(avgNet - historicalAvg)} vs storico
          </div>
        </div>
        <div className="kpi-card blue">
          <div className="kpi-icon blue-icon"><Calendar size={14} /></div>
          <div className="kpi-label">Totale netto</div>
          <div className="kpi-value">{fmtEur(totalNet)}</div>
          <div className="kpi-sub">{settings.monthsAhead} mesi</div>
        </div>
        <div className="kpi-card yellow">
          <div className="kpi-icon yellow-icon"><Star size={14} /></div>
          <div className="kpi-label">TFR previsto</div>
          <div className="kpi-value">{fmtEur(totalTFR)}</div>
          <div className="kpi-sub">{settings.monthsAhead} mesi</div>
        </div>
        {nextScatto && (
          <div className="kpi-card purple">
            <div className="kpi-icon purple-icon"><Calendar size={14} /></div>
            <div className="kpi-label">Prossimo scatto</div>
            <div className="kpi-value" style={{ fontSize: 16 }}>{nextScatto.label}</div>
            <div className="kpi-sub">tra {nextScatto.months} mesi</div>
          </div>
        )}
      </div>

      {/* Settings toggle */}
      <button className="btn btn-ghost btn-full" style={{ marginBottom: 14 }} onClick={() => setShowSettings(s => !s)}>
        {showSettings ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {showSettings ? 'Nascondi parametri' : 'Parametri di calcolo'}
      </button>

      {showSettings && (
        <div className="chart-card" style={{ marginBottom: 14 }}>
          <div className="form-row" style={{ marginBottom: 10 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Regione</label>
              <select className="form-input" value={settings.regione}
                onChange={e => { const s = { ...settings, regione: e.target.value, addRegionale: REGIONI[e.target.value] ?? settings.addRegionale }; setSettings(s); saveSettings(s) }}>
                {Object.keys(REGIONI).map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Mesi</label>
              <select className="form-input" value={settings.monthsAhead}
                onChange={e => { const s = { ...settings, monthsAhead: parseInt(e.target.value) }; setSettings(s); saveSettings(s) }}>
                {[6, 12, 24].map(m => <option key={m} value={m}>{m} mesi</option>)}
              </select>
            </div>
          </div>
          <div className="form-row" style={{ marginBottom: 10 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Add. Reg. (%)</label>
              <input type="number" step="0.001" className="form-input"
                value={(settings.addRegionale * 100).toFixed(3)}
                onChange={e => { const s = { ...settings, addRegionale: parseFloat(e.target.value)/100||0 }; setSettings(s); saveSettings(s) }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Add. Com. (%)</label>
              <input type="number" step="0.001" className="form-input"
                value={(settings.addComunale * 100).toFixed(3)}
                onChange={e => { const s = { ...settings, addComunale: parseFloat(e.target.value)/100||0 }; setSettings(s); saveSettings(s) }} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Data assunzione</label>
              <input type="date" className="form-input" value={settings.hireDate}
                onChange={e => { const s = { ...settings, hireDate: e.target.value }; setSettings(s); saveSettings(s) }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Valore scatto (€)</label>
              <input type="number" step="0.01" className="form-input" value={settings.scattoAmount}
                onChange={e => { const s = { ...settings, scattoAmount: parseFloat(e.target.value)||0 }; setSettings(s); saveSettings(s) }} />
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="chart-card">
        <div className="chart-title">Andamento netto previsto</div>
        <div className="chart-subtitle">Storico + previsione {settings.monthsAhead} mesi</div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gF" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3ee8b5" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3ee8b5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fill: 'var(--text3)', fontSize: 9 }} axisLine={false} tickLine={false} interval={2} />
            <YAxis tick={{ fill: 'var(--text3)', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(1)}k`} />
            <Tooltip content={<CT />} />
            <ReferenceLine y={historicalAvg} stroke="var(--text3)" strokeDasharray="4 4" />
            <Area type="monotone" dataKey="Storico" stroke="#5b8af0" fill="none" strokeWidth={2} connectNulls={false} />
            <Area type="monotone" dataKey="Previsto" stroke="#3ee8b5" fill="url(#gF)" strokeWidth={2} strokeDasharray="6 3" connectNulls={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly cards */}
      <div className="section-divider"><h3>Dettaglio mensile</h3><div className="section-divider-line" /></div>

      <div className="months-grid">
        {forecasts.map((f, i) => (
          <div key={i} className={`forecast-card ${f.highlight ? 'highlight' : ''}`} onClick={() => setExpanded(expanded === i ? null : i)}>
            <div className="forecast-month">
              {MESI[f.month-1]?.slice(0,3)} {f.year}
              {f.hasScatto && <span className="badge green" style={{ marginLeft: 4, fontSize: 8 }}>↑</span>}
            </div>
            <div className="forecast-net">{fmtEur(f.net)}</div>
            <div className="forecast-days">{f.workDays} gg lav.</div>

            {expanded === i && (
              <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                {[['Lordo', f.gross], ['INPS', f.inps], ['IRPEF', f.irpef], ['Add.', f.addRegionale + f.addComunale], ['TFR', f.tfr]].map(([l, v]) => (
                  <div key={l} className="forecast-detail-row"><span>{l}</span><span>{fmtEur(v)}</span></div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="info-box mt-16">
        <Info size={11} style={{ display: 'inline', marginRight: 5 }} />
        Stime basate sulla media degli ultimi 6 cedolini. Non includono straordinari o variazioni contrattuali impreviste.
      </div>
    </div>
  )
}
