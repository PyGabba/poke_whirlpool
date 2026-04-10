// ============================================================
// ITALIAN TAX ENGINE - 2025/2026
// Based on art. 13 TUIR, Legge 207/24, art. 2120 c.c.
// ============================================================

// IRPEF Brackets
export const IRPEF_BRACKETS = {
  2025: [
    { max: 28000, rate: 0.23 },
    { max: 50000, rate: 0.35 },
    { max: Infinity, rate: 0.43 },
  ],
  2026: [
    { max: 28000, rate: 0.23 },
    { max: 50000, rate: 0.33 }, // L.207/24 reform
    { max: Infinity, rate: 0.43 },
  ],
}

// Italian regions with default addizionale rates (2025)
export const REGIONI = {
  'Abruzzo': 0.0173,
  'Basilicata': 0.0123,
  'Calabria': 0.0323,
  'Campania': 0.0323,
  'Emilia-Romagna': 0.0133,
  'Friuli-Venezia Giulia': 0.007,
  'Lazio': 0.0333,
  'Liguria': 0.0123,
  'Lombardia': 0.0173,
  'Marche': 0.0143,
  'Molise': 0.0223,
  'Piemonte': 0.0163,
  'Puglia': 0.0323,
  'Sardegna': 0.0173,
  'Sicilia': 0.0323,
  'Toscana': 0.0143,
  'Trentino-Alto Adige': 0.0123,
  'Umbria': 0.0133,
  'Valle d\'Aosta': 0.007,
  'Veneto': 0.0173,
}

// Calculate IRPEF gross from annual taxable income
export function calcIRPEF(annualIncome, year = 2026) {
  const brackets = IRPEF_BRACKETS[year] || IRPEF_BRACKETS[2026]
  let tax = 0
  let prev = 0
  for (const b of brackets) {
    if (annualIncome <= prev) break
    const taxable = Math.min(annualIncome, b.max) - prev
    tax += taxable * b.rate
    prev = b.max
  }
  return tax
}

// Detrazioni lavoro dipendente (art. 13 TUIR - 2025/2026)
export function calcDetrazioni(annualIncome, daysWorked = 365) {
  const ratio = daysWorked / 365
  let detrazione = 0

  if (annualIncome <= 15000) {
    detrazione = Math.max(1955 * ratio, 690 * ratio)
    if (annualIncome > 0) detrazione = Math.max(detrazione, 690)
  } else if (annualIncome <= 28000) {
    detrazione = (1910 + 1190 * ((28000 - annualIncome) / 13000)) * ratio
  } else if (annualIncome <= 50000) {
    detrazione = 1910 * ((50000 - annualIncome) / 22000) * ratio
  }

  // Extra €65 for income 25001-35000 (L.207/24)
  if (annualIncome > 25000 && annualIncome <= 35000) {
    detrazione += 65
  }

  return Math.max(0, detrazione)
}

// Ulteriore detrazione L.207/24 (tranche bonus for 8-35k)
export function calcUlterioreDet(annualIncome) {
  if (annualIncome <= 8500) return 0
  if (annualIncome <= 28000) return 1000
  if (annualIncome <= 35000) {
    return 1000 * ((35000 - annualIncome) / 7000)
  }
  return 0
}

// INPS employee contribution (9.19%, +1% above 55448)
export function calcINPS(grossMonthly, annualGross) {
  const baseRate = 0.0919
  const extraRate = 0.01
  const threshold = 55448 / 12

  if (annualGross / 12 > threshold) {
    return grossMonthly * baseRate + Math.max(0, grossMonthly - threshold) * extraRate
  }
  return grossMonthly * baseRate
}

// TFR monthly accrual (art. 2120 c.c.)
// Quota = Retribuzione utile / 13.5 - 0.5% INPS base
export function calcTFRMonthly(retribUtile, inpsBase) {
  const quota = retribUtile / 13.5
  const inpsDeduction = inpsBase * 0.005 / 12
  return Math.max(0, quota - inpsDeduction)
}

// TFR revaluation (1.5% fixed + 75% * ISTAT FOI)
// Using estimated ISTAT ~2% for forecast
export function calcTFRRevaluation(fundBalance, istatFOI = 0.02) {
  return fundBalance * (0.015 + 0.75 * istatFOI)
}

// Full monthly net pay calculation
export function calcNetoPaga({
  grossMonthly,       // lordo mensile
  extraItems = 0,     // trasferte, ticket, etc. (already in gross or added)
  addRegionale = 0.0173, // Lombardia default
  addComunale = 0.006,
  year = 2026,
  daysWorked = 26,
  totalMonthsWorked = 12,
  priorYearTaxCredit = 0, // conguaglio
}) {
  // Annualize for bracket calculation
  const annualGross = grossMonthly * 12

  // INPS
  const inpsMonthly = calcINPS(grossMonthly, annualGross)

  // IRPEF taxable
  const annualTaxable = (grossMonthly - inpsMonthly) * 12
  const monthlyTaxable = grossMonthly - inpsMonthly

  // IRPEF
  const annualIRPEF = calcIRPEF(annualTaxable, year)
  const detrazioni = calcDetrazioni(annualTaxable, Math.min(daysWorked * 14, 365))
  const ulterioreDet = calcUlterioreDet(annualTaxable)
  const netIRPEF = Math.max(0, annualIRPEF - detrazioni - ulterioreDet) / 12

  // Addizionali (paid as residuo from prior year across 11 months)
  const annualAddReg = annualTaxable * addRegionale
  const annualAddCom = annualTaxable * addComunale
  const monthlyAddReg = annualAddReg / 11
  const monthlyAddCom = annualAddCom / 11

  // TFR
  const tfrQuota = calcTFRMonthly(grossMonthly, grossMonthly - inpsMonthly)

  const netPay = grossMonthly
    - inpsMonthly
    - netIRPEF
    - monthlyAddReg
    - monthlyAddCom

  return {
    gross: grossMonthly,
    inps: inpsMonthly,
    irpefLorda: annualIRPEF / 12,
    detrazioni: (detrazioni + ulterioreDet) / 12,
    irpefNetta: netIRPEF,
    addRegionale: monthlyAddReg,
    addComunale: monthlyAddCom,
    tfrQuota,
    net: Math.round(netPay * 100) / 100,
    taxable: monthlyTaxable,
    effectiveTaxRate: netIRPEF / monthlyTaxable,
  }
}

// Working days calculation for a month (Mon-Fri, excluding Italian holidays)
export function getWorkingDays(year, month) {
  // Italian national holidays 2026 (month is 1-based)
  const holidays = {
    '1-1': true,   // Capodanno
    '1-6': true,   // Epifania
    '4-25': true,  // Liberazione
    '5-1': true,   // Festa del Lavoro
    '6-2': true,   // Repubblica
    '8-15': true,  // Ferragosto
    '11-1': true,  // Tutti i Santi
    '12-8': true,  // Immacolata
    '12-25': true, // Natale
    '12-26': true, // Santo Stefano
    '10-4': year >= 2026 ? true : false, // San Francesco (new 2026!)
  }

  // Calculate Easter for the year
  const easter = getEaster(year)
  const easterMon = new Date(easter)
  easterMon.setDate(easterMon.getDate() + 1)
  holidays[`${easter.getMonth() + 1}-${easter.getDate()}`] = true
  holidays[`${easterMon.getMonth() + 1}-${easterMon.getDate()}`] = true

  let count = 0
  const d = new Date(year, month - 1, 1)
  while (d.getMonth() === month - 1) {
    const dow = d.getDay()
    const key = `${month}-${d.getDate()}`
    if (dow !== 0 && dow !== 6 && !holidays[key]) count++
    d.setDate(d.getDate() + 1)
  }
  return count
}

// Computus algorithm for Easter
function getEaster(year) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

// Forecast next N months based on historical average + known factors
export function forecastMonths({
  payslips,        // array of parsed payslip objects
  monthsAhead = 12,
  settings = {},
}) {
  if (!payslips || payslips.length === 0) return []

  // Use last 6 months for trend (or all if fewer)
  const recent = payslips.slice(-Math.min(6, payslips.length))
  const avgGross = recent.reduce((s, p) => s + (p.gross || 0), 0) / recent.length
  const addReg = settings.addRegionale ?? 0.0173
  const addCom = settings.addComunale ?? 0.006
  const year2026 = new Date().getFullYear() + (new Date().getMonth() > 6 ? 1 : 0)

  // Detect scatto (every 3 years from hire)
  const hireDate = settings.hireDate ? new Date(settings.hireDate) : null
  const scattoAmount = parseFloat(settings.scattoAmount || 21.95)

  const forecasts = []
  const now = new Date()

  for (let i = 1; i <= monthsAhead; i++) {
    const target = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const y = target.getFullYear()
    const m = target.getMonth() + 1

    let gross = avgGross

    // Apply scatto if hire date is known and month triggers it
    if (hireDate) {
      const monthsEmployed = (y - hireDate.getFullYear()) * 12 + m - (hireDate.getMonth() + 1)
      const scattiEarned = Math.min(Math.floor(monthsEmployed / 36), 10)
      const currentScatti = Math.min(Math.floor(((now.getFullYear() - hireDate.getFullYear()) * 12 + now.getMonth() - hireDate.getMonth()) / 36), 10)
      if (scattiEarned > currentScatti) {
        gross += (scattiEarned - currentScatti) * scattoAmount
      }
    }

    const workDays = getWorkingDays(y, m)
    const calc = calcNetoPaga({
      grossMonthly: gross,
      addRegionale: addReg,
      addComunale: addCom,
      year: y,
      daysWorked: workDays,
    })

    // Detect if there's a scatto this month
    let hasScatto = false
    if (hireDate) {
      const monthsAtTarget = (y - hireDate.getFullYear()) * 12 + m - (hireDate.getMonth() + 1)
      hasScatto = monthsAtTarget > 0 && monthsAtTarget % 36 === 0 && Math.floor(monthsAtTarget / 36) <= 10
    }

    forecasts.push({
      year: y,
      month: m,
      label: `${MESI[m - 1]} ${y}`,
      gross: Math.round(gross * 100) / 100,
      net: calc.net,
      inps: calc.inps,
      irpef: calc.irpefNetta,
      addRegionale: calc.addRegionale,
      addComunale: calc.addComunale,
      tfr: calc.tfrQuota,
      workDays,
      hasScatto,
      isNextYear: y > now.getFullYear(),
    })
  }

  return forecasts
}

export const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
]

export function fmtEur(val) {
  if (val == null || isNaN(val)) return '—'
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(val)
}

export function fmtNum(val, decimals = 2) {
  if (val == null || isNaN(val)) return '—'
  return new Intl.NumberFormat('it-IT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(val)
}
