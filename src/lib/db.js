import Dexie from 'dexie'

export const db = new Dexie('CedolinoTracker')

db.version(1).stores({
  payslips: '++id, year, month, [year+month]',
  settings: 'key'
})

// Helper to get all payslips sorted
export async function getAllPayslips() {
  return db.payslips.orderBy('[year+month]').toArray()
}

export async function getPayslip(year, month) {
  return db.payslips.where('[year+month]').equals([year, month]).first()
}

export async function savePayslip(data) {
  const existing = await getPayslip(data.year, data.month)
  if (existing) {
    await db.payslips.update(existing.id, data)
    return existing.id
  }
  return db.payslips.add(data)
}

export async function deletePayslip(id) {
  return db.payslips.delete(id)
}

export async function getSetting(key, defaultVal = null) {
  const row = await db.settings.get(key)
  return row ? row.value : defaultVal
}

export async function setSetting(key, value) {
  await db.settings.put({ key, value })
}
