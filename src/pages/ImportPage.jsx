import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, Check, X, AlertCircle, ChevronRight, Edit3, PenLine, ChevronDown, ChevronUp } from 'lucide-react'
import { parseZucchettiPDF } from '../lib/pdfParser.js'
import { savePayslip } from '../lib/db.js'
import { fmtEur, MESI } from '../lib/taxEngine.js'

// ── Confidence badge ────────────────────────────
function ConfBadge({ score }) {
  if (score >= 80) return <span className="badge green">✓ {score}% accuratezza</span>
  if (score >= 50) return <span className="badge yellow">⚠ {score}% accuratezza</span>
  return <span className="badge red">✗ {score}% bassa accuratezza</span>
}

// ── Parsed PDF preview + edit form ─────────────
function ParsedPreview({ data, onSave, onDiscard }) {
  const [edited, setEdited] = useState(data)
  const upd = (key, val) => setEdited(p => ({ ...p, [key]: val }))

  return (
    <div className="chart-card" style={{ marginBottom: 12 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{data.fileName}</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <ConfBadge score={data.parsingConfidence} />
          {data.period && <span className="tag">{data.period}</span>}
        </div>
      </div>

      {data.parsingConfidence < 70 && (
        <div className="info-box warning" style={{ marginBottom: 12 }}>
          <AlertCircle size={11} style={{ display: 'inline', marginRight: 5 }} />
          Accuratezza bassa — verifica e correggi i valori prima di salvare.
        </div>
      )}

      <div className="form-row" style={{ marginBottom: 10 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Anno</label>
          <input type="number" className="form-input" value={edited.year ?? ''} onChange={e => upd('year', parseInt(e.target.value))} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Mese</label>
          <select className="form-input" value={edited.month ?? 1} onChange={e => upd('month', parseInt(e.target.value))}>
            {MESI.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="parsed-summary" style={{ marginBottom: 14 }}>
        {[
          ['Lordo (€)', 'gross'],
          ['Netto (€)', 'net'],
          ['INPS (€)', 'contributoINPS'],
          ['IRPEF (€)', 'ritenureIRPEF'],
        ].map(([label, key]) => (
          <div key={key} className="parsed-field">
            <div className="parsed-field-label">{label}</div>
            <input type="number" step="0.01"
              style={{ background: 'none', border: 'none', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: 14, color: key === 'net' ? 'var(--accent)' : 'var(--text)', width: '100%', padding: 0 }}
              value={edited[key] ?? ''}
              onChange={e => upd(key, parseFloat(e.target.value))}
            />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onSave(edited)}>
          <Check size={13} /> Salva
        </button>
        <button className="btn btn-ghost" onClick={onDiscard}>
          <X size={13} /> Scarta
        </button>
      </div>
    </div>
  )
}

// ── Manual entry form ───────────────────────────
const EMPTY_MANUAL = {
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  gross: '', net: '', contributoINPS: '', ritenureIRPEF: '',
  addRegionale: '', addComunale: '', tfrQuota: '',
  ferieResiduo: '', permessiResiduo: '',
  fileName: 'inserimento_manuale',
  parsingConfidence: 100,
}

function ManualForm({ onSave }) {
  const [d, setD] = useState(EMPTY_MANUAL)
  const upd = (k, v) => setD(p => ({ ...p, [k]: v }))
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    if (!d.year || !d.month || !d.net) {
      alert('Inserisci almeno Anno, Mese e Netto.')
      return
    }
    const payload = { ...d, fileName: `manuale_${MESI[d.month-1]}_${d.year}` }
    // Convert string fields to numbers
    for (const k of ['gross','net','contributoINPS','ritenureIRPEF','addRegionale','addComunale','tfrQuota','ferieResiduo','permessiResiduo']) {
      if (payload[k] !== '') payload[k] = parseFloat(payload[k]) || 0
    }
    await onSave(payload)
    setD(EMPTY_MANUAL)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="chart-card">
      <div className="chart-title" style={{ marginBottom: 4 }}>Inserimento manuale</div>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>
        Compila i dati leggendoli direttamente dal cedolino
      </div>

      <div className="form-row" style={{ marginBottom: 10 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Anno *</label>
          <input type="number" className="form-input" value={d.year} onChange={e => upd('year', parseInt(e.target.value))} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Mese *</label>
          <select className="form-input" value={d.month} onChange={e => upd('month', parseInt(e.target.value))}>
            {MESI.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="form-row" style={{ marginBottom: 10 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Lordo (€)</label>
          <input type="number" step="0.01" placeholder="2017.49" className="form-input" value={d.gross} onChange={e => upd('gross', e.target.value)} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Netto (€) *</label>
          <input type="number" step="0.01" placeholder="1767.00" className="form-input" value={d.net} onChange={e => upd('net', e.target.value)} />
        </div>
      </div>

      <div className="form-row" style={{ marginBottom: 10 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">INPS (€)</label>
          <input type="number" step="0.01" placeholder="185.36" className="form-input" value={d.contributoINPS} onChange={e => upd('contributoINPS', e.target.value)} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">IRPEF (€)</label>
          <input type="number" step="0.01" placeholder="161.18" className="form-input" value={d.ritenureIRPEF} onChange={e => upd('ritenureIRPEF', e.target.value)} />
        </div>
      </div>

      <div className="form-row" style={{ marginBottom: 10 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Add. Regionale (€)</label>
          <input type="number" step="0.01" placeholder="29.68" className="form-input" value={d.addRegionale} onChange={e => upd('addRegionale', e.target.value)} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Add. Comunale (€)</label>
          <input type="number" step="0.01" placeholder="12.17" className="form-input" value={d.addComunale} onChange={e => upd('addComunale', e.target.value)} />
        </div>
      </div>

      <div className="form-row" style={{ marginBottom: 14 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">TFR quota (€)</label>
          <input type="number" step="0.01" placeholder="149.72" className="form-input" value={d.tfrQuota} onChange={e => upd('tfrQuota', e.target.value)} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Ferie residue (gg)</label>
          <input type="number" step="0.01" placeholder="8.67" className="form-input" value={d.ferieResiduo} onChange={e => upd('ferieResiduo', e.target.value)} />
        </div>
      </div>

      <button className="btn btn-primary btn-full" onClick={handleSave}>
        {saved ? <><Check size={13} /> Salvato!</> : <><Check size={13} /> Salva cedolino</>}
      </button>
    </div>
  )
}

// ── Main ImportPage ─────────────────────────────
export default function ImportPage({ onRefresh, onNavigate }) {
  const [isDragging, setIsDragging] = useState(false)
  const [processing, setProcessing] = useState([])
  const [parsed, setParsed] = useState([])
  const [saved, setSaved] = useState([])
  const [showManual, setShowManual] = useState(false)
  const fileInputRef = useRef()

  const processFiles = useCallback(async (files) => {
    const pdfs = Array.from(files).filter(f => f.type === 'application/pdf')
    if (!pdfs.length) return
    for (const file of pdfs) {
      setProcessing(prev => [...prev, { name: file.name, status: 'parsing' }])
      try {
        const data = await parseZucchettiPDF(file)
        setParsed(prev => [...prev, data])
        setProcessing(prev => prev.filter(p => p.name !== file.name))
      } catch (err) {
        console.error('Parse error:', err)
        setProcessing(prev => prev.map(p =>
          p.name === file.name ? { ...p, status: 'error', error: err.message } : p
        ))
      }
    }
  }, [])

  const handleSaveParsed = async (data) => {
    await savePayslip(data)
    setParsed(prev => prev.filter(p => p.fileName !== data.fileName))
    setSaved(prev => [...prev, data])
    await onRefresh()
  }

  const handleSaveManual = async (data) => {
    await savePayslip(data)
    setSaved(prev => [...prev, data])
    await onRefresh()
  }

  const hasErrors = processing.some(p => p.status === 'error')

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>Importa</h2>
        <p>PDF automatico o inserimento manuale</p>
      </div>

      {/* Drop zone */}
      <div
        className={`upload-zone ${isDragging ? 'drag-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => { e.preventDefault(); setIsDragging(false); processFiles(e.dataTransfer.files) }}
        onClick={() => fileInputRef.current?.click()}
        style={{ marginBottom: 14 }}
      >
        <input ref={fileInputRef} type="file" multiple accept=".pdf" style={{ display: 'none' }}
          onChange={e => processFiles(e.target.files)} />
        <Upload size={32} style={{ color: isDragging ? 'var(--accent)' : 'var(--text3)', margin: '0 auto' }} />
        <h3>{isDragging ? 'Rilascia qui' : 'Seleziona PDF'}</h3>
        <p>Cedolini Zucchetti · Multi-file supportato</p>
      </div>

      {/* Processing / errors */}
      {processing.map(p => (
        <div key={p.name} className="chart-card" style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {p.status === 'parsing'
              ? <div className="loading-spin" />
              : <X size={14} style={{ color: 'var(--red)', flexShrink: 0 }} />
            }
            <FileText size={13} style={{ color: 'var(--text3)', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--text2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.name}
            </span>
            {p.status === 'parsing' && <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>Analisi...</span>}
          </div>
          {p.status === 'error' && (
            <div style={{ marginTop: 8, padding: '8px 10px', background: 'var(--red-dim)', borderRadius: 6, fontSize: 12, color: 'var(--red)', lineHeight: 1.5 }}>
              <strong>Errore:</strong> {p.error || 'impossibile leggere il PDF'}
            </div>
          )}
        </div>
      ))}

      {/* Suggest manual entry after error */}
      {hasErrors && (
        <div className="info-box warning" style={{ marginBottom: 14 }}>
          <AlertCircle size={11} style={{ display: 'inline', marginRight: 5 }} />
          Il parser non riesce a leggere il PDF. Usa l'<strong>inserimento manuale</strong> qui sotto per aggiungere i dati a mano.
        </div>
      )}

      {/* Manual entry toggle */}
      <button
        className="btn btn-ghost btn-full"
        style={{ marginBottom: 14 }}
        onClick={() => setShowManual(s => !s)}
      >
        <PenLine size={13} />
        {showManual ? 'Nascondi inserimento manuale' : 'Inserisci manualmente'}
        {showManual ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {showManual && <ManualForm onSave={handleSaveManual} />}

      {/* Da confermare (parsed PDFs) */}
      {parsed.length > 0 && (
        <>
          <div className="section-divider">
            <h3>Da confermare ({parsed.length})</h3>
            <div className="section-divider-line" />
          </div>
          <div className="info-box">
            <Edit3 size={11} style={{ display: 'inline', marginRight: 6 }} />
            Verifica e correggi i dati estratti prima di salvare.
          </div>
          {parsed.map((data, i) => (
            <ParsedPreview key={i} data={data} onSave={handleSaveParsed}
              onDiscard={() => setParsed(prev => prev.filter(p => p.fileName !== data.fileName))} />
          ))}
        </>
      )}

      {/* Salvati questa sessione */}
      {saved.length > 0 && (
        <>
          <div className="section-divider">
            <h3>Salvati ({saved.length})</h3>
            <div className="section-divider-line" />
          </div>
          {saved.map((s, i) => (
            <div key={i} className="chart-card" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: 12 }}>
              <Check size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, color: 'var(--text2)' }}>{MESI[s.month - 1]} {s.year}</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontSize: 14 }}>{fmtEur(s.net)}</span>
            </div>
          ))}
          <button className="btn btn-primary btn-full" onClick={() => onNavigate('dashboard')}>
            <ChevronRight size={13} /> Vai alla Dashboard
          </button>
        </>
      )}

      {/* How-to (solo se non c'è niente in corso) */}
      {!processing.length && !parsed.length && !saved.length && !showManual && (
        <div className="chart-card" style={{ marginTop: 4 }}>
          <div className="chart-title" style={{ marginBottom: 14 }}>Come funziona</div>
          {[
            ['1', 'PDF automatico', 'Tocca "Seleziona PDF" e scegli i tuoi cedolini Zucchetti. Il parser estrae i dati automaticamente.'],
            ['2', 'Manuale', 'Se il PDF non funziona, usa "Inserisci manualmente" per inserire i valori chiave a mano.'],
            ['3', 'Verifica e salva', 'Controlla i valori estratti, correggili se necessario, poi salva. Tutto rimane nel browser.'],
          ].map(([n, title, desc]) => (
            <div key={n} style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent-dim)', border: '1px solid rgba(62,232,181,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--accent)', flexShrink: 0, fontFamily: 'var(--font-display)', fontWeight: 700 }}>{n}</div>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
