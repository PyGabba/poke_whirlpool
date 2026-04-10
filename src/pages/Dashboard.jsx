import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Euro, Shield, PiggyBank, Calendar, Upload } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { fmtEur, fmtNum, MESI } from '../lib/taxEngine.js'

const COLORS = ['#3ee8b5', '#ff5f6d', '#5b8af0', '#f5c518', '#a78bfa']

function CT({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="custom-tooltip">
      <div className="label">{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color: p.color }}>{p.name}: {fmtEur(p.value)}</div>)}
    </div>
  )
}

export default function Dashboard({ payslips, onNavigate }) {
  const stats = useMemo(() => {
    if (!payslips.length) return null
    const recent = payslips[payslips.length - 1]
    const prev = payslips.length > 1 ? payslips[payslips.length - 2] : null
    const thisYear = new Date().getFullYear()
    const thisYearData = payslips.filter(p => p.year === thisYear)
    const avgNet = thisYearData.length
      ? thisYearData.reduce((s, p) => s + (p.net || 0), 0) / thisYearData.length
      : payslips.reduce((s, p) => s + (p.net || 0), 0) / payslips.length
    const totalTFR = recent?.tfrFondo || payslips.reduce((s, p) => s + (p.tfrQuota || 0), 0)
    const totalNetYear = thisYearData.reduce((s, p) => s + (p.net || 0), 0)
    const netDelta = prev ? ((recent?.net || 0) - (prev?.net || 0)) : 0
    return { recent, avgNet, totalTFR, totalNetYear, netDelta }
  }, [payslips])

  const chartData = useMemo(() =>
    payslips.slice(-8).map(p => ({
      name: `${MESI[p.month - 1]?.slice(0, 3)}`,
      Netto: p.net || 0,
      Lordo: p.gross || 0,
    })), [payslips])

  const pieData = useMemo(() => {
    if (!stats?.recent) return []
    const r = stats.recent
    return [
      { name: 'Netto', value: r.net || 0 },
      { name: 'IRPEF', value: r.ritenureIRPEF || 0 },
      { name: 'INPS', value: r.contributoINPS || 0 },
      { name: 'Add.', value: (r.addRegionale || 0) + (r.addComunale || 0) },
    ].filter(d => d.value > 0)
  }, [stats])

  if (!payslips.length) {
    return (
      <div className="fade-in">
        <div className="page-header"><h2>Dashboard</h2><p>Benvenuto in Cedolino Tracker</p></div>
        <div className="empty-state">
          <Upload size={44} />
          <h3>Nessun cedolino</h3>
          <p>Importa i tuoi PDF Zucchetti per iniziare a tracciare stipendio, tasse e TFR</p>
          <button className="btn btn-primary" onClick={() => onNavigate('import')}>
            <Upload size={14} /> Importa ora
          </button>
        </div>
      </div>
    )
  }

  const { recent, netDelta, avgNet, totalTFR, totalNetYear } = stats

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>{recent ? `${MESI[recent.month - 1]} ${recent.year}` : '—'} · {payslips.length} cedolini</p>
      </div>

      {/* KPI cards — horizontal scroll */}
      <div className="cards-scroll stagger">
        <div className="kpi-card accent">
          <div className="kpi-icon accent-icon"><Euro size={14} /></div>
          <div className="kpi-label">Netto mese</div>
          <div className="kpi-value">{fmtEur(recent?.net)}</div>
          <div className={`kpi-delta ${netDelta >= 0 ? 'pos' : 'neg'}`}>
            {netDelta >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {netDelta >= 0 ? '+' : ''}{fmtEur(netDelta)}
          </div>
        </div>

        <div className="kpi-card blue">
          <div className="kpi-icon blue-icon"><Euro size={14} /></div>
          <div className="kpi-label">Lordo mese</div>
          <div className="kpi-value">{fmtEur(recent?.gross)}</div>
          <div className="kpi-sub">INPS {fmtEur(recent?.contributoINPS)}</div>
        </div>

        <div className="kpi-card red">
          <div className="kpi-icon red-icon"><Shield size={14} /></div>
          <div className="kpi-label">IRPEF mese</div>
          <div className="kpi-value">{fmtEur(recent?.ritenureIRPEF)}</div>
          <div className="kpi-sub">Impon. {fmtEur(recent?.imponibileIRPEF)}</div>
        </div>

        <div className="kpi-card yellow">
          <div className="kpi-icon yellow-icon"><PiggyBank size={14} /></div>
          <div className="kpi-label">TFR</div>
          <div className="kpi-value">{fmtEur(totalTFR)}</div>
          <div className="kpi-sub">+{fmtEur(recent?.tfrQuota)}/mese</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon accent-icon"><TrendingUp size={14} /></div>
          <div className="kpi-label">Media netto</div>
          <div className="kpi-value">{fmtEur(avgNet)}</div>
          <div className="kpi-sub">Anno: {fmtEur(totalNetYear)}</div>
        </div>

        <div className="kpi-card purple">
          <div className="kpi-icon purple-icon"><Calendar size={14} /></div>
          <div className="kpi-label">Ferie</div>
          <div className="kpi-value" style={{ fontSize: 20 }}>{fmtNum(recent?.ferieResiduo, 1)}<span style={{ fontSize: 12, color: 'var(--text2)' }}> gg</span></div>
          <div className="kpi-sub">Perm. {fmtNum(recent?.permessiResiduo, 1)} ore</div>
        </div>
      </div>

      {/* Trend chart */}
      <div className="chart-card">
        <div className="chart-title">Netto / Lordo</div>
        <div className="chart-subtitle">Ultimi {chartData.length} mesi</div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gN" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3ee8b5" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3ee8b5" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#5b8af0" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#5b8af0" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fill: 'var(--text3)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text3)', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(1)}k`} />
            <Tooltip content={<CT />} />
            <Area type="monotone" dataKey="Lordo" stroke="#5b8af0" fill="url(#gG)" strokeWidth={1.5} />
            <Area type="monotone" dataKey="Netto" stroke="#3ee8b5" fill="url(#gN)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Pie breakdown */}
      <div className="chart-card">
        <div className="chart-title">Ripartizione</div>
        <div className="chart-subtitle">{recent ? `${MESI[recent.month - 1]} ${recent.year}` : 'Ultimo mese'}</div>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" strokeWidth={2} stroke="var(--surface)">
              {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={v => fmtEur(v)} contentStyle={{ background: 'var(--surface3)', border: '1px solid var(--border2)', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 12 }} />
            <Legend formatter={v => <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--font-mono)' }}>{v}</span>} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Ratei */}
      {recent && (
        <div className="chart-card">
          <div className="chart-title">Ratei maturati</div>
          <div className="chart-subtitle">Situazione aggiornata a {MESI[recent.month - 1]}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Ferie', mat: recent.ferieMaturate, god: recent.ferieGodute, res: recent.ferieResiduo, unit: 'GG', color: 'var(--accent)' },
              { label: 'ROL/Ex-Fest.', mat: recent.permExFsMaturate, god: recent.permExFsGodute, res: recent.permExFsResiduo, unit: 'ORE', color: 'var(--blue)' },
              { label: 'Permessi', mat: recent.permessiMaturate, god: recent.permessiGodute, res: recent.permessiResiduo, unit: 'ORE', color: 'var(--purple)' },
            ].map(r => {
              const pct = r.mat > 0 ? Math.round((r.res / r.mat) * 100) : 0
              return (
                <div key={r.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>{r.label}</span>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text3)' }}>
                      {fmtNum(r.res, 1)} / {fmtNum(r.mat, 1)} {r.unit}
                    </span>
                  </div>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar-fill" style={{ width: `${pct}%`, background: r.color }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
                    Godute: {fmtNum(r.god, 1)} {r.unit} · {pct}% residuo
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
