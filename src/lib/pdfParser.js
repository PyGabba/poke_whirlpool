// ─────────────────────────────────────────────────────────────────────────────
// ZUCCHETTI PAYSLIP PARSER — High-accuracy engine
// Trained on: Felici Gabriele cedolini Giu 2024 – Feb 2026 (ALBELISSA SRL)
// ─────────────────────────────────────────────────────────────────────────────

let pdfjsLib = null

async function getPdfJs() {
  if (pdfjsLib) return pdfjsLib
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
      pdfjsLib = window.pdfjsLib; resolve(pdfjsLib); return
    }
    const load = (src, fallback) => {
      const s = document.createElement('script')
      s.src = src
      s.onload = () => {
        if (!window.pdfjsLib) { reject(new Error('pdf.js non caricato')); return }
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = src.replace('pdf.min.js', 'pdf.worker.min.js')
        pdfjsLib = window.pdfjsLib; resolve(pdfjsLib)
      }
      s.onerror = fallback
      document.head.appendChild(s)
    }
    load(
      'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js',
      () => load(
        'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
        () => reject(new Error('CDN non raggiungibile. Verifica la connessione.'))
      )
    )
  })
}

// ── Number utils ──────────────────────────────────────────────────────────────
function it(str) {
  if (str == null) return null
  const n = parseFloat(str.toString().trim().replace(/\./g, '').replace(',', '.'))
  return isNaN(n) ? null : n
}
function after(text, label, maxChars = 60) {
  const idx = text.indexOf(label)
  if (idx === -1) return null
  const chunk = text.slice(idx + label.length, idx + label.length + maxChars)
  const m = chunk.match(/([\d]+(?:\.[\d]{3})*,[\d]{1,5})/)
  return m ? it(m[1]) : null
}

// ── Extract all text ──────────────────────────────────────────────────────────
async function extractText(file) {
  const pdfjs = await getPdfJs()
  const buf = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise
  let full = ''
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const tc = await page.getTextContent()
    full += tc.items.map(i => i.str).join(' ') + '\n'
  }
  return full
}

const MESI_MAP = { Gennaio:1,Febbraio:2,Marzo:3,Aprile:4,Maggio:5,Giugno:6,Luglio:7,Agosto:8,Settembre:9,Ottobre:10,Novembre:11,Dicembre:12 }

// ── Main parser ───────────────────────────────────────────────────────────────
export async function parseZucchettiPDF(file) {
  let rawText = ''
  try { rawText = await extractText(file) }
  catch (err) { throw new Error(`Impossibile leggere il PDF: ${err.message}`) }

  const r = { fileName: file.name, rawText, parsingConfidence: 0, isAggiuntivo: false }

  // 1. PERIOD
  const pm = rawText.match(/(Gennaio|Febbraio|Marzo|Aprile|Maggio|Giugno|Luglio|Agosto|Settembre|Ottobre|Novembre|Dicembre)\s+(\d{4})(\s+AGG\.?)?/i)
  if (pm) {
    const mn = pm[1].charAt(0).toUpperCase() + pm[1].slice(1).toLowerCase()
    r.month = MESI_MAP[mn] || null
    r.year = parseInt(pm[2])
    r.period = pm[0].trim()
    r.isAggiuntivo = !!(pm[3]?.trim().startsWith('AGG'))
  }

  // 2. EMPLOYEE
  const cfm = rawText.match(/[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]/)
  if (cfm) r.codiceFiscale = cfm[0]
  const dates = rawText.match(/\d{2}-\d{2}-\d{4}/g) || []
  if (dates[0]) r.dataNascita = dates[0]
  if (dates[1]) r.dataAssunzione = dates[1]
  const livm = rawText.match(/Livello\s+(\d+[A-Z]?)/i)
  if (livm) r.livello = livm[1]

  // 3. ELEMENTI BASE
  r.pagaBase       = after(rawText, 'PAGA BASE', 30)
  r.contingenza    = after(rawText, 'CONTING.', 20)
  r.terzoElemento  = after(rawText, "3'ELEMEN.", 20)
  r.enteBilaterale = after(rawText, 'ENT BIL', 20)
  const scm = rawText.match(/PROSSIMO\s*SCATTO\s+(\d{2}-\d{4})/i)
  if (scm) r.prossimoScatto = scm[1]
  // Totale elementi (5 decimals before Zucchetti or Z code)
  const tem = rawText.match(/([\d.]+,\d{5})\s*(?:Zucchetti|Z00|000|ZP)/)
  if (tem) r.totaleElementi = it(tem[1])

  // 4. VOCI VARIABILI helpers
  // Robust: extract all Italian numbers from a line, then use positional logic
  const lineNums = str => (str.match(/[\d]+(?:\.[\d]{3})*,[\d]+/g) || []).map(it)

  const voceGG = code => {
    const re = new RegExp('(' + code + '[^\n]+GG[^\n]*)', 'i')
    const m = rawText.match(re)
    if (!m) return null
    const nums = lineNums(m[1])
    if (nums.length < 2) return null
    return { rate: nums.length >= 3 ? nums[nums.length - 3] : null, qty: nums[nums.length - 2], total: nums[nums.length - 1] }
  }
  const voceORE = code => {
    const re = new RegExp('(' + code + '[^\n]+ORE[^\n]*)', 'i')
    const m = rawText.match(re)
    if (!m) return null
    const nums = lineNums(m[1])
    if (nums.length < 2) return null
    return { rate: nums.length >= 3 ? nums[nums.length - 3] : null, qty: nums[nums.length - 2], total: nums[nums.length - 1] }
  }
  const voceTrat = code => {
    const m = rawText.match(new RegExp(code + '[^\n]*\\(\\s*(\\d[\\d.,]+)\\s*\\)', 'i'))
    return m ? it(m[1]) : null
  }
  const vocePerc = code => {
    const re = new RegExp('(' + code + '[^\n]+%[^\n]*)', 'i')
    const m = rawText.match(re)
    if (!m) return null
    const nums = lineNums(m[1])
    if (nums.length < 3) return null
    return { base: nums[0], aliq: nums[nums.length - 2], importo: nums[nums.length - 1] }
  }

  const retrib = voceGG('Z00001')
  if (retrib) { r.retribuzioneGiornaliera = retrib.rate; r.giorniLavorati = retrib.qty; r.retribuzioneBase = retrib.total }

  const ferieGod = voceGG('Z00250')
  if (ferieGod) r.ferieGodutePaga = ferieGod.total

  const permROL = voceGG('Z00255')
  if (permROL) r.permROLGoduti = permROL.total

  const permExFs = voceGG('Z00260')
  if (permExFs) r.permExFsGoduti = permExFs.total

  const festNonGod = voceGG('Z01138')
  if (festNonGod) r.festivitaNonGodute = festNonGod.total

  const tredm = voceORE('Z50000')
  if (tredm) r.tredicesima = tredm.total

  const amm = voceGG('Z02094')
  if (amm) r.ammortizzatori = amm.total

  // Una Tantum (just a number at end of line)
  const utm = rawText.match(/Z42001[^\n]+(\d[\d.,]+)\s*(?:\n|$)/im)
  if (utm) r.unaTantum = it(utm[1])

  r.ticketRestaurant = voceTrat('000025')

  const trasf = voceGG('000061')
  if (trasf) r.trasferta = trasf.total

  // 5. CONTRIBUTI
  const ivs = vocePerc('Z00000')
  if (ivs) { r.imponibileINPS = ivs.base; r.aliquotaINPS = ivs.aliq; r.contributoINPS = ivs.importo }

  const cigs = vocePerc('Z00078')
  if (cigs) r.contributoCIGS = cigs.importo

  const fis = vocePerc('Z00134')
  if (fis) r.contributoFIS = fis.importo

  const esonm = rawText.match(/Z003(?:17|46)[^\n]+\d[\d.]+,\d+\s+\d+,\d+\s*%\s+(\d[\d.,]+)/)
  if (esonm) r.esoneroIVS = it(esonm[1])

  const estm = rawText.match(/Z31000[^\n]*(\d[\d.,]+)\s*$/im)
  if (estm) r.contributoEst = it(estm[1])

  // FONTE base (dipendente) — NOT the C/Ditta line
  const fbm = rawText.match(/Z20000 Contr\.\s*base FONTE[^C\n]+([\d.]+,\d+)\s+([\d.]+,\d+)\s*%\s+([\d.]+,\d+)/i)
  if (fbm) r.fonteBase = it(fbm[3])

  const fvm = rawText.match(/Z20003[^\n]+([\d.]+,\d+)\s+([\d.]+,\d+)\s*%\s+([\d.]+,\d+)/i)
  if (fvm) r.fonteVolontario = it(fvm[3])

  const f01m = rawText.match(/F0?1998[^\n]+([\d.]+,\d+)/i)
  if (f01m) r.previdCompl = it(f01m[1])

  // 6. IRPEF
  const iim = rawText.match(/F0?2000\s+Imponibile IRPEF\s+([\d.]+,\d+)/i)
  if (iim) r.imponibileIRPEF = it(iim[1])

  const ilm = rawText.match(/F0?2010\s+IRPEF lorda\s+([\d.]+,\d+)/i)
  if (ilm) r.irpefLorda = it(ilm[1])

  const dm = rawText.match(/F0?2500\s+Detrazioni lav\.dip\.\s+([\d.]+,\d+)/i)
  if (dm) r.detrazioni = it(dm[1])

  const ulm = rawText.match(/F0?2801[^\n]+([\d.]+,\d+)/i)
  if (ulm) r.ulterioreDet = it(ulm[1])

  const rim = rawText.match(/F0?3020\s+Ritenute IRPEF\s+([\d.]+,\d+)/i)
  if (rim) r.ritenureIRPEF = it(rim[1])

  // Tassazione autonoma (13a/arretrati)
  const f06m = rawText.match(/F0?6020\s+Ritenute IRPEF\s+Tass\.aut\.\s+([\d.]+,\d+)/i)
  if (f06m) r.ritenureTassAut = it(f06m[1])

  const incm = rawText.match(/F0?9100\s+IRPEF netta\s+Cong\.\s+([\d.]+,\d+)/i)
  if (incm) r.irpefNettaCong = it(incm[1])

  // 7. ADDIZIONALI
  // Reg: "F09110 Addizionale regionale 2025 LOMBARDIA Residuo 267,12 29,68"
  //   or "F09110 Addizionale regionale 2023 LOMBARDIA Residuo 102,41 25,61"
  //   or "F09110 Addizionale regionale 2023 LOMBARDIA 25,60" (no Residuo)
  const addRegRe = /F0?9110\s+Addizionale regionale\s+(\d{4})\s+([A-Z][A-Za-z\s]+?)\s+(?:Residuo\s+([\d.]+,\d+)\s+)?([\d.]+,\d+)(?!\s*%)/
  const arm = rawText.match(addRegRe)
  if (arm) {
    r.addRegionaleAnno = parseInt(arm[1])
    r.regione = arm[2].trim()
    r.addRegionaleResiduo = arm[3] ? it(arm[3]) : null
    r.addRegionale = it(arm[4])
  }

  const addComRe = /F0?9130\s+Addizionale comunale\s+(\d{4})\s+(.+?)\s+(?:Residuo\s+([\d.]+,\d+)\s+)?([\d.]+,\d+)(?!\s*%)/
  const acm = rawText.match(addComRe)
  if (acm) {
    r.addComunaleAnno = parseInt(acm[1])
    r.comune = acm[2].trim()
    r.addComunaleResiduo = acm[3] ? it(acm[3]) : null
    r.addComunale = it(acm[4])
  }

  const a24m = rawText.match(/F0?9140[^\n]*([\d.]+,\d+)\s*$/)
  if (a24m) r.accontoAddCom = it(a24m[1])

  const t730m = rawText.match(/F0?0883[^\n]+([\d.]+,\d+)/i)
  if (t730m) r.tratt730 = it(t730m[1])

  const a730m = rawText.match(/F0?0703[^\n]+([\d.]+,\d+)/i)
  if (a730m) r.acconto730 = it(a730m[1])

  // 8. CONGUAGLIO ANNUALE
  // "Annuale 24.176,57 5.560,61 2.259,98 3.300,63 329,49 LOM 142,65 E666"
  const congm = rawText.match(/Annuale\s+([\d.]+,\d+)\s+([\d.]+,\d+)\s+([\d.]+,\d+)\s+([\d.]+,\d+)\s+([\d.]+,\d+)/)
  if (congm) {
    r.congImponibile = it(congm[1]); r.congIRPEFLorda = it(congm[2])
    r.congDetrazioni = it(congm[3]); r.congIRPEFNetta = it(congm[4])
    r.congAddRegAnno = it(congm[5])
  }

  // 9. TFR
  r.tfrRetribuzione = after(rawText, 'Retribuzione utile T.F.R.', 20)
  r.tfrQuota        = after(rawText, 'Quota T.F.R.', 20)
  r.tfrFondo        = after(rawText, 'F.do 31/12', 20)
  r.tfrRivalutaz    = after(rawText, 'Rivalutaz.', 20)
  r.tfrImpRivalut   = after(rawText, 'Imp.rival.', 20)
  r.tfrQuotaAnno    = after(rawText, 'Quota anno', 20)
  r.tfrAFondi       = after(rawText, 'TFR a fondi', 20)
  r.tfrAnticipi     = after(rawText, 'Anticipi', 12)

  // 10. PROGRESSIVI
  const piim = rawText.match(/Imp\.\s*INPS\s+([\d.]+,\d+)/)
  if (piim) r.progressivoINPS = it(piim[1])
  const pirm = rawText.match(/Imp\.\s*IRPEF\s+([\d.]+,\d+)/)
  if (pirm) r.progressivoIRPEF = it(pirm[1])
  const ipm = rawText.match(/IRPEF pagata\s+([\d.]+,\d+)/)
  if (ipm) r.irpefPagataAnno = it(ipm[1])

  // 11. RATEI
  // "Ferie 4,33333 4,33333 8,66832 GG." — 4 numbers: mat, god, res (+ optional residuoAP)
  const fm = rawText.match(/Ferie\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+GG/i)
  if (fm) { r.ferieMaturate = it(fm[1]); r.ferieGodute = it(fm[2]); r.ferieResiduo = it(fm[3]) }

  const pem = rawText.match(/Perm\.Ex-Fs\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+ORE/i)
  if (pem) { r.permExFsMaturate = it(pem[1]); r.permExFsGodute = it(pem[2]); r.permExFsResiduo = it(pem[3]) }

  const prm = rawText.match(/Permessi\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+ORE/i)
  if (prm) { r.permessiMaturate = it(prm[1]); r.permessiGodute = it(prm[2]); r.permessiResiduo = it(prm[3]) }

  // Residuo AP (column 4 of ratei, after residuo)
  const rapFerie = rawText.match(/Ferie\s+[\d.,]+\s+[\d.,]+\s+[\d.,]+\s+GG\.\s*([\d.,]+)/)
  if (rapFerie) r.ferieResiduoAP = it(rapFerie[1])

  // 12. TOTALI
  const tcm = rawText.match(/TOTALE\s*COMPETENZE\s*([\d.]+,\d{2})/i)
  if (tcm) r.totaleCompetenze = it(tcm[1])
  const ttm = rawText.match(/TOTALE\s*TRATTENUTE\s*([\d.]+,\d{2})/i)
  if (ttm) r.totaleTrattenute = it(ttm[1])

  // 13. NETTO DEL MESE
  // The definitive netto appears as "X.XXX,XX €" — always last occurrence with 4-digit integer
  const nettoAll = [...rawText.matchAll(/([\d]+\.[\d]{3},\d{2})\s*€/g)]
  if (nettoAll.length > 0) r.net = it(nettoAll[nettoAll.length - 1][1])

  // Fallback: look for "NETTO DEL MESE" label
  if (!r.net) {
    const nlm = rawText.match(/NETTO\s*DEL\s*MESE[^\d]*([\d.]+,\d{2})/i)
    if (nlm) r.net = it(nlm[1])
  }

  // GROSS from totale competenze (most reliable)
  r.gross = r.totaleCompetenze || null
  // Fallback: sum voce competenze
  if (!r.gross && retrib) {
    r.gross = [retrib.total, r.ferieGodutePaga, r.permROLGoduti, r.permExFsGoduti,
      r.festivitaNonGodute, r.trasferta, r.unaTantum, r.tredicesima,
      r.ammortizzatori].reduce((s, v) => s + (v || 0), 0) || null
  }

  // 14. CONFIDENCE
  const checks = [r.year, r.month, r.gross, r.net, r.contributoINPS, r.ritenureIRPEF, r.tfrQuota, r.imponibileIRPEF, r.detrazioni]
  r.parsingConfidence = Math.round(checks.filter(v => v != null).length / checks.length * 100)

  return r
}
