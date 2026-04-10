import { useState, useEffect } from 'react'
import { Save, Trash2, Download, Upload, Info, ChevronRight } from 'lucide-react'
import { getSetting, setSetting, db } from '../lib/db.js'
import { REGIONI, fmtEur } from '../lib/taxEngine.js'

function SettingsSection({ title, children }) {
  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <div className="settings-section-title">{title}</div>
      </div>
      <div className="settings-section-body">{children}</div>
    </div>
  )
}

export default function SettingsPage({ payslips, onRefresh }) {
  const [s, setS] = useState({ regione: 'Lombardia', comune: 'Lonate Pozzolo', addRegionale: 0.0173, addComunale: 0.006, hireDate: '', livello: '3', scattoAmount: 21.95 })
  const [msg, setMsg] = useState('')

  useEffect(() => { getSetting('userSettings').then(v => { if (v) setS(p => ({ ...p, ...v })) }) }, [])

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const save = async () => { await setSetting('userSettings', s); flash('✓ Salvato!') }

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(payslips, null, 2)], { type: 'application/json' })
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `cedolini_${new Date().toISOString().split('T')[0]}.json` })
    a.click()
  }

  const importJSON = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    try {
      const data = JSON.parse(await file.text())
      if (!Array.isArray(data)) throw new Error('Formato non valido')
      for (const p of data) { if (p.year && p.month) { const { id, ...r } = p; await db.payslips.add(r) } }
      await onRefresh()
      flash(`✓ ${data.length} cedolini importati`)
    } catch (err) { flash(`✗ Errore: ${err.message}`) }
  }

  const clearAll = async () => {
    if (!confirm('Eliminare TUTTI i dati?')) return
    await db.payslips.clear()
    await onRefresh()
    flash('Dati eliminati')
  }

  return (
    <div className="fade-in">
      <div className="page-header"><h2>Impostazioni</h2><p>Parametri fiscali e gestione dati</p></div>

      {msg && <div className="info-box" style={{ marginBottom: 16 }}>{msg}</div>}

      <SettingsSection title="Fiscale">
        <div className="form-group">
          <label className="form-label">Regione</label>
          <select className="form-input" value={s.regione}
            onChange={e => setS(p => ({ ...p, regione: e.target.value, addRegionale: REGIONI[e.target.value] ?? p.addRegionale }))}>
            {Object.keys(REGIONI).sort().map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Comune</label>
          <input className="form-input" value={s.comune} onChange={e => setS(p => ({ ...p, comune: e.target.value }))} placeholder="Es. Milano" />
        </div>
        <div className="form-row">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Add. Reg. (%)</label>
            <input type="number" step="0.001" className="form-input"
              value={(s.addRegionale * 100).toFixed(3)}
              onChange={e => setS(p => ({ ...p, addRegionale: parseFloat(e.target.value)/100||0 }))} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Add. Com. (%)</label>
            <input type="number" step="0.001" className="form-input"
              value={(s.addComunale * 100).toFixed(3)}
              onChange={e => setS(p => ({ ...p, addComunale: parseFloat(e.target.value)/100||0 }))} />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Contratto">
        <div className="form-group">
          <label className="form-label">Data assunzione</label>
          <input type="date" className="form-input" value={s.hireDate} onChange={e => setS(p => ({ ...p, hireDate: e.target.value }))} />
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Usata per calcolare gli scatti di anzianità (ogni 3 anni)</div>
        </div>
        <div className="form-row">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Livello</label>
            <select className="form-input" value={s.livello} onChange={e => setS(p => ({ ...p, livello: e.target.value }))}>
              {['1','1S','2','3','4','4S','5','6','7'].map(l => <option key={l} value={l}>Liv. {l}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Valore scatto (€)</label>
            <input type="number" step="0.01" className="form-input" value={s.scattoAmount} onChange={e => setS(p => ({ ...p, scattoAmount: parseFloat(e.target.value)||0 }))} />
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>CCNL Commercio: Liv.2 €22.83 · Liv.3 €21.95 · Liv.4 €20.66</div>
      </SettingsSection>

      <button className="btn btn-primary btn-full" onClick={save} style={{ marginBottom: 14 }}>
        <Save size={14} /> Salva impostazioni
      </button>

      <SettingsSection title="Dati">
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>
          {payslips.length} cedolini · salvati localmente nel browser
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn btn-ghost btn-full" onClick={exportJSON} disabled={!payslips.length}>
            <Download size={13} /> Esporta JSON (backup)
          </button>
          <label className="btn btn-ghost btn-full" style={{ cursor: 'pointer' }}>
            <Upload size={13} /> Importa JSON (ripristino)
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={importJSON} />
          </label>
          <button className="btn btn-danger btn-full" onClick={clearAll} disabled={!payslips.length}>
            <Trash2 size={13} /> Elimina tutti i dati
          </button>
        </div>
      </SettingsSection>

      <SettingsSection title="IRPEF 2026">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            ['Fino a €28.000', '23%', '23%', null],
            ['€28.001 – €50.000', '35%', '33%', 'var(--accent)'],
            ['Oltre €50.000', '43%', '43%', null],
          ].map(([range, r25, r26, c]) => (
            <div key={range} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text)' }}>{range}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>2025: {r25}</div>
              </div>
              <div style={{ fontSize: 18, fontFamily: 'var(--font-display)', fontWeight: 700, color: c || 'var(--text2)' }}>{r26}</div>
            </div>
          ))}
        </div>
        <div className="info-box mt-12" style={{ marginBottom: 0 }}>
          <Info size={11} style={{ display: 'inline', marginRight: 5 }} />
          La riforma L.207/24 riduce il 2° scaglione dal 35% al 33% dal 2026. Risparmio fino a €440/anno.
        </div>
      </SettingsSection>
    </div>
  )
}
