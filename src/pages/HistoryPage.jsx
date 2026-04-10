import { useState } from 'react'
import { Trash2, ChevronDown, ChevronUp, FileText, Search } from 'lucide-react'
import { deletePayslip } from '../lib/db.js'
import { fmtEur, fmtNum, MESI } from '../lib/taxEngine.js'

export default function HistoryPage({ payslips, onRefresh }) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const sorted = [...payslips]
    .sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month)
    .filter(p => !search || `${MESI[p.month - 1]} ${p.year}`.toLowerCase().includes(search.toLowerCase()))

  const handleDelete = async (p) => {
    if (!confirm(`Eliminare ${MESI[p.month - 1]} ${p.year}?`)) return
    setDeleting(p.id)
    await deletePayslip(p.id)
    await onRefresh()
    setDeleting(null)
  }

  if (!payslips.length) {
    return (
      <div className="fade-in">
        <div className="page-header"><h2>Cedolini</h2><p>Storico importati</p></div>
        <div className="empty-state">
          <FileText size={44} />
          <h3>Nessun cedolino</h3>
          <p>Importa i tuoi PDF dalla scheda Importa</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>Cedolini</h2>
        <p>{payslips.length} importati</p>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
        <input className="form-input" placeholder="Cerca mese / anno..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36, fontSize: 15 }} />
      </div>

      {/* Mobile card list */}
      <div className="payslip-list">
        {sorted.map(p => (
          <div key={p.id} className="payslip-row">
            <div className="payslip-row-header" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
              <div>
                <div className="payslip-row-period">{MESI[p.month - 1]} {p.year}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>Lordo {fmtEur(p.gross)}</div>
              </div>
              <div style={{ flex: 1 }} />
              <div className="payslip-row-net">{fmtEur(p.net)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
                <button className="btn btn-danger" style={{ padding: '6px 10px', minHeight: 36 }}
                  onClick={e => { e.stopPropagation(); handleDelete(p) }} disabled={deleting === p.id}>
                  {deleting === p.id ? <span className="loading-spin" style={{ width: 12, height: 12 }} /> : <Trash2 size={13} />}
                </button>
                {expanded === p.id ? <ChevronUp size={14} style={{ color: 'var(--text3)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text3)' }} />}
              </div>
            </div>

            {expanded === p.id && (
              <div className="payslip-row-detail">
                {[
                  ['INPS', fmtEur(p.contributoINPS), 'var(--blue)'],
                  ['IRPEF', fmtEur(p.ritenureIRPEF), 'var(--red)'],
                  ['Add. Reg.', fmtEur(p.addRegionale), null],
                  ['Add. Com.', fmtEur(p.addComunale), null],
                  ['TFR quota', fmtEur(p.tfrQuota), 'var(--yellow)'],
                  ['Ferie res.', p.ferieResiduo != null ? `${fmtNum(p.ferieResiduo, 1)} gg` : '—', null],
                  ['Impon. IRPEF', fmtEur(p.imponibileIRPEF), null],
                  ['Paga base', fmtEur(p.pagaBase), null],
                ].map(([label, val, color]) => (
                  <div key={label} className="payslip-detail-cell">
                    <div className="payslip-detail-label">{label}</div>
                    <div className="payslip-detail-value" style={color ? { color } : {}}>{val ?? '—'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
