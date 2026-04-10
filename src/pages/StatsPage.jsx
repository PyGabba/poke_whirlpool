import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from 'recharts'
import { fmtEur, fmtNum, MESI } from '../lib/taxEngine.js'
import { BarChart3 } from 'lucide-react'

function CT({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="custom-tooltip">
      <div className="label">{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color: p.color || 'var(--text)', fontSize: 12 }}>{p.name}: {p.value > 100 ? fmtEur(p.value) : fmtNum(p.value)}%</div>)}
    </div>
  )
}

export default function StatsPage({ payslips }) {
  const [selectedYear, setSelectedYear] = useState(null)

  const data = useMemo(() => {
    if (!payslips.length) return null

    const byYear = {}
    payslips.forEach(p => {
      if (!byYear[p.year]) byYear[p.year] = { year: p.year, months: [], totalNet: 0, totalGross: 0, totalIRPEF: 0, totalINPS: 0, totalTFR: 0 }
      byYear[p.year].months.push(p)
      byYear[p.year].totalNet += p.net || 0
      byYear[p.year].totalGross += p.gross || 0
      byYear[p.year].totalIRPEF += p.ritenureIRPEF || 0
      byYear[p.year].totalINPS += p.contributoINPS || 0
      byYear[p.year].totalTFR += p.tfrQuota || 0
    })

    const yearlyData = Object.values(byYear).sort((a, b) => a.year - b.year).map(y => ({
      ...y,
      avgNet: y.totalNet / y.months.length,
      taxRate: y.totalGross > 0 ? (y.totalGross - y.totalNet) / y.totalGross * 100 : 0,
    }))

    const byMonth = Array.from({ length: 12 }, (_, i) => ({ month: MESI[i].slice(0,3), count: 0, totalNet: 0 }))
    payslips.forEach(p => { byMonth[p.month-1].count++; byMonth[p.month-1].totalNet += p.net||0 })
    const seasonality = byMonth.map(m => ({ ...m, avgNet: m.count > 0 ? m.totalNet / m.count : 0 }))

    const allNets = payslips.map(p => p.net || 0).filter(v => v > 0)
    const avgNet = allNets.reduce((s,v) => s+v, 0) / allNets.length
    const minNet = Math.min(...allNets)
    const maxNet = Math.max(...allNets)

    const n = payslips.length
    const xMean = (n-1)/2
    const yMean = avgNet
    let num = 0, den = 0
    payslips.forEach((p, i) => { num += (i-xMean)*((p.net||0)-yMean); den += (i-xMean)**2 })
    const slope = den !== 0 ? num/den : 0

    const avgIRPEF = payslips.filter(p=>p.ritenureIRPEF).reduce((s,p)=>s+p.ritenureIRPEF,0)/Math.max(1,payslips.filter(p=>p.ritenureIRPEF).length)
    const totalTFR = payslips.reduce((s,p)=>s+(p.tfrQuota||0),0)

    return { yearlyData, seasonality, avgNet, minNet, maxNet, slope, avgIRPEF, totalTFR }
  }, [payslips])

  if (!payslips.length) {
    return (
      <div className="fade-in">
        <div className="page-header"><h2>Statistiche</h2></div>
        <div className="empty-state"><BarChart3 size={44} /><h3>Nessun dato</h3><p>Importa i cedolini per le statistiche</p></div>
      </div>
    )
  }

  const { yearlyData, seasonality, avgNet, minNet, maxNet, slope, avgIRPEF, totalTFR } = data
  const activeYear = selectedYear ? yearlyData.find(y => y.year === selectedYear) : yearlyData[yearlyData.length - 1]

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>Statistiche</h2>
        <p>{payslips.length} cedolini · {yearlyData.length} anni</p>
      </div>

      {/* KPI cards */}
      <div className="cards-scroll stagger">
        <div className="kpi-card accent">
          <div className="kpi-label">Netto medio</div>
          <div className="kpi-value">{fmtEur(avgNet)}</div>
          <div className="kpi-sub">Min {fmtEur(minNet)} / Max {fmtEur(maxNet)}</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-label">IRPEF media</div>
          <div className="kpi-value">{fmtEur(avgIRPEF)}</div>
          <div className="kpi-sub">Mensile</div>
        </div>
        <div className="kpi-card yellow">
          <div className="kpi-label">TFR totale</div>
          <div className="kpi-value">{fmtEur(totalTFR)}</div>
          <div className="kpi-sub">Da {payslips.length} mesi</div>
        </div>
        <div className="kpi-card blue">
          <div className="kpi-label">Trend mensile</div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{slope >= 0 ? '+' : ''}{fmtEur(slope)}</div>
          <div className={`kpi-delta ${slope >= 0 ? 'pos' : 'neg'}`}>{slope >= 0 ? '↗ Crescita' : '↘ Calo'}</div>
        </div>
      </div>

      {/* Year tabs */}
      <div className="year-tabs">
        {yearlyData.map(y => (
          <button key={y.year} className={`year-tab ${(selectedYear ?? yearlyData[yearlyData.length-1].year) === y.year ? 'active' : ''}`}
            onClick={() => setSelectedYear(y.year)}>
            {y.year}
          </button>
        ))}
      </div>

      {/* Selected year detail */}
      {activeYear && (
        <div className="chart-card">
          <div className="chart-title">{activeYear.year}</div>
          <div className="chart-subtitle">{activeYear.months.length} cedolini importati</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              ['Netto totale', fmtEur(activeYear.totalNet), 'var(--accent)'],
              ['Lordo totale', fmtEur(activeYear.totalGross), null],
              ['IRPEF totale', fmtEur(activeYear.totalIRPEF), 'var(--red)'],
              ['INPS totale', fmtEur(activeYear.totalINPS), 'var(--blue)'],
              ['TFR accantonato', fmtEur(activeYear.totalTFR), 'var(--yellow)'],
              ['Aliquota effettiva', `${fmtNum(activeYear.taxRate, 1)}%`, null],
              ['Netto medio', fmtEur(activeYear.avgNet), null],
            ].map(([l, v, c]) => (
              <div key={l} className="parsed-field">
                <div className="parsed-field-label">{l}</div>
                <div className="parsed-field-value" style={c ? { color: c } : {}}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Yearly comparison chart */}
      {yearlyData.length > 1 && (
        <div className="chart-card">
          <div className="chart-title">Confronto annuale</div>
          <div className="chart-subtitle">Netto totale per anno</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={yearlyData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="year" tick={{ fill: 'var(--text3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text3)', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CT />} />
              <Bar dataKey="totalNet" name="Netto" radius={[4, 4, 0, 0]}>
                {yearlyData.map((y, i) => <Cell key={i} fill={(selectedYear ?? yearlyData[yearlyData.length-1].year) === y.year ? 'var(--accent)' : 'var(--surface3)'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Seasonality */}
      <div className="chart-card">
        <div className="chart-title">Stagionalità</div>
        <div className="chart-subtitle">Netto medio per mese dell'anno</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={seasonality.filter(m => m.count > 0)} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: 'var(--text3)', fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text3)', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(1)}k`} />
            <Tooltip formatter={v => fmtEur(v)} contentStyle={{ background: 'var(--surface3)', border: '1px solid var(--border2)', fontFamily: 'var(--font-mono)', fontSize: 12 }} />
            <Bar dataKey="avgNet" name="Media" radius={[3, 3, 0, 0]}>
              {seasonality.filter(m => m.count > 0).map((m, i) => (
                <Cell key={i} fill={m.avgNet >= avgNet ? 'var(--accent)' : 'var(--surface3)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tax rate trend */}
      {yearlyData.length > 1 && (
        <div className="chart-card">
          <div className="chart-title">Aliquota effettiva</div>
          <div className="chart-subtitle">% lordo trattenuto per anno</div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={yearlyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text3)', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `${v.toFixed(0)}%`} />
              <Tooltip formatter={v => `${v.toFixed(2)}%`} contentStyle={{ background: 'var(--surface3)', border: '1px solid var(--border2)', fontFamily: 'var(--font-mono)', fontSize: 12 }} />
              <Line type="monotone" dataKey="taxRate" stroke="var(--red)" strokeWidth={2} dot={{ fill: 'var(--red)', r: 4 }} name="Aliquota eff." />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
