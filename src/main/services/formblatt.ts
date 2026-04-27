import type { DB } from '../db'
import { features, gmos, organisms, plasmids, settings } from '../db/schema'
import { buildWorkbookBuffer } from './xlsx'

export type FormblattLanguage = 'de' | 'en'

export interface FormblattValidationRow {
  gmoId: number
  included: boolean
  valid: boolean
  gmoLabel: string
  messages: string[]
}

export interface FormblattValidationResult {
  fileIssues: string[]
  includedCount: number
  invalidCount: number
  rows: FormblattValidationRow[]
}

export interface FormblattReportResult {
  buffer: Buffer
  rowCount: number
}

interface DateRange {
  dateFrom?: Date | null
  dateTo?: Date | null
}

interface Context {
  settings: typeof settings.$inferSelect
  gmos: Array<typeof gmos.$inferSelect>
  plasmidsById: Map<number, typeof plasmids.$inferSelect>
  organismsById: Map<number, typeof organisms.$inferSelect>
  organismsByName: Map<string, typeof organisms.$inferSelect>
  featuresByToken: Map<string, typeof features.$inferSelect>
}

interface ReportRow {
  gmoId: number
  row: string[]
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase()
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function formatDate(value: Date | null | undefined): string {
  if (!value) return ''
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function tokenizeCassette(value: string | null | undefined): string[] {
  if (!value) return []
  return value
    .split('-')
    .map((part) => part.replace(/\[.*?\]/g, '').trim())
    .filter(Boolean)
}

function getReportHeaders(lang: FormblattLanguage): string[] {
  if (lang === 'en') {
    return [
      'No',
      'Donor designation',
      'Donor RG',
      'Recipient designation',
      'Recipient RG',
      'Source vector designation',
      'Transferred nucleic acid designation',
      'Transferred nucleic acid risk potential',
      'GMO name',
      'GMO RG',
      'GMO approval',
      'GMO generated',
      'GMO disposal',
      'Entry date'
    ]
  }

  return [
    'Nr.',
    'Spender Bezeichnung',
    'Spender RG',
    'Empfänger Bezeichnung',
    'Empfänger RG',
    'Ausgangsvektor Bezeichnung',
    'Übertragene Nukleinsäure Bezeichnung',
    'Übertragene Nukleinsäure Gefährdungspotential',
    'GVO Bezeichnung',
    'GVO RG',
    'GVO Zulassung',
    'GVO erzeugt/erhalten am',
    'GVO entsorgt am',
    'Datum des Eintrags'
  ]
}

function defaultColumnWidths(): number[] {
  return [4, 30, 12, 16, 9, 13, 28, 25, 15, 5, 9, 15, 13, 10]
}

function effectiveStartDate(row: typeof gmos.$inferSelect): Date {
  return row.createdDate ?? row.createdAt
}

function isIncludedInRange(row: typeof gmos.$inferSelect, range: DateRange): boolean {
  const from = range.dateFrom ? startOfDay(range.dateFrom) : null
  const to = range.dateTo ? endOfDay(range.dateTo) : null

  if (!from && !to) return true

  const start = effectiveStartDate(row)
  const end = row.destroyedDate ?? null

  if (from && to) return start <= to && (end == null || end >= from)
  if (from) return end == null || end >= from
  return start <= to!
}

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0)
}

function endOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999)
}

function buildContext(db: DB, range: DateRange): Context {
  const singleton = db.select().from(settings).get()
  if (!singleton) throw new Error('Settings row is missing')
  void range

  const plasmidRows = db.select().from(plasmids).all()
  const organismRows = db.select().from(organisms).all()
  const featureRows = db.select().from(features).all()

  const organismsByName = new Map<string, typeof organisms.$inferSelect>()
  for (const organism of organismRows) {
    organismsByName.set(normalizeToken(organism.name), organism)
    if (organism.shortName) organismsByName.set(normalizeToken(organism.shortName), organism)
  }

  const featuresByToken = new Map<string, typeof features.$inferSelect>()
  for (const feature of featureRows) {
    featuresByToken.set(normalizeToken(feature.name), feature)
    if (feature.alias) featuresByToken.set(normalizeToken(feature.alias), feature)
  }

  return {
    settings: singleton,
    gmos: db.select().from(gmos).all().sort((left, right) => left.id - right.id),
    plasmidsById: new Map(plasmidRows.map((row) => [row.id, row])),
    organismsById: new Map(organismRows.map((row) => [row.id, row])),
    organismsByName,
    featuresByToken
  }
}

function validateFileIssues(ctx: Context): string[] {
  const issues: string[] = []
  if (!normalizeOptionalText(ctx.settings.institution)) issues.push('Settings: Institution is required.')
  if (!normalizeOptionalText(ctx.settings.institutionAz)) issues.push('Settings: Az. is required.')
  if (!normalizeOptionalText(ctx.settings.institutionAnlage)) issues.push('Settings: Anlage-Nr. is required.')
  return issues
}

function validateRow(row: typeof gmos.$inferSelect, ctx: Context): { label: string; messages: string[]; reportRow: ReportRow | null } {
  const messages: string[] = []
  const plasmid = row.plasmidId != null ? ctx.plasmidsById.get(row.plasmidId) : null
  const hostOrganism = row.hostOrganismId != null ? ctx.organismsById.get(row.hostOrganismId) : null

  if (row.plasmidId == null) messages.push('Linked plasmid is missing.')
  if (row.plasmidId != null && !plasmid) messages.push(`Linked plasmid ${row.plasmidId} was not found.`)
  if (row.hostOrganismId == null) messages.push('Host organism is missing.')
  if (row.hostOrganismId != null && !hostOrganism) messages.push(`Host organism ${row.hostOrganismId} was not found.`)
  if (!row.createdDate) messages.push('Date generated is missing.')
  if (!normalizeOptionalText(row.approval)) messages.push('Approval reference is missing.')

  const cassetteTokens = tokenizeCassette(plasmid?.cassette)
  if (!plasmid?.backboneVector) messages.push('Backbone vector is missing.')
  if (cassetteTokens.length === 0) messages.push('Cassette is missing.')

  const donorNames: string[] = []
  const donorRiskGroups: string[] = []
  const featureNames: string[] = []
  const featureRisks: string[] = []

  for (const token of cassetteTokens) {
    const feature = ctx.featuresByToken.get(normalizeToken(token))
    if (!feature) {
      messages.push(`Cassette feature "${token}" was not found in the features glossary.`)
      continue
    }

    featureNames.push(token)
    featureRisks.push(String(feature.riskLevel))

    if (!normalizeOptionalText(feature.organismSource)) {
      messages.push(`Feature "${token}" has no source organism.`)
      continue
    }

    donorNames.push(feature.organismSource!)
    const donorOrganism = ctx.organismsByName.get(normalizeToken(feature.organismSource!))
    if (!donorOrganism) {
      messages.push(`Source organism "${feature.organismSource}" for feature "${token}" was not found.`)
      continue
    }

    donorRiskGroups.push(String(donorOrganism.riskGroup))
  }

  const plasmidName = plasmid?.name ?? `Plasmid ${row.plasmidId ?? '—'}`
  const hostLabel = hostOrganism?.shortName ?? hostOrganism?.name ?? `Organism ${row.hostOrganismId ?? '—'}`
  const gmoLabel = `${hostLabel}-${plasmidName}`

  if (messages.length > 0 || !plasmid || !hostOrganism || !row.createdDate) {
    return { label: gmoLabel, messages, reportRow: null }
  }

  return {
    label: gmoLabel,
    messages,
    reportRow: {
      gmoId: row.id,
      row: [
        '',
        donorNames.join('|'),
        donorRiskGroups.join('|'),
        hostOrganism.name,
        String(hostOrganism.riskGroup),
        plasmid.backboneVector ?? '',
        featureNames.join('|'),
        featureRisks.join('|'),
        `${hostLabel}-${plasmid.name}`,
        String(hostOrganism.riskGroup),
        row.approval ?? '',
        formatDate(row.createdDate),
        formatDate(row.destroyedDate),
        formatDate(row.createdDate)
      ]
    }
  }
}

export function validateFormblatt(db: DB, range: DateRange = {}): FormblattValidationResult {
  const ctx = buildContext(db, range)
  const fileIssues = validateFileIssues(ctx)

  let includedCount = 0
  let invalidCount = 0

  const rows = ctx.gmos.map((row) => {
    const included = isIncludedInRange(row, range)
    const validation = validateRow(row, ctx)
    const valid = included ? validation.messages.length === 0 : true
    if (included) {
      includedCount += 1
      if (!valid) invalidCount += 1
    }

    return {
      gmoId: row.id,
      included,
      valid,
      gmoLabel: validation.label,
      messages: included ? validation.messages : []
    }
  })

  return { fileIssues, includedCount, invalidCount, rows }
}

export function generateFormblattWorkbook(db: DB, lang: FormblattLanguage, range: DateRange = {}): FormblattReportResult {
  const ctx = buildContext(db, range)
  const validation = validateFormblatt(db, range)

  if (validation.fileIssues.length > 0) {
    throw new Error(validation.fileIssues.join(' '))
  }
  if (validation.includedCount === 0) {
    throw new Error('No GMO entries matched the selected reporting period.')
  }
  if (validation.invalidCount > 0) {
    throw new Error('Some GMO entries are incomplete for Formblatt-Z. Fix the highlighted rows first.')
  }

  const includedRows = ctx.gmos.filter((row) => isIncludedInRange(row, range))
  const reportRows = includedRows
    .map((row) => validateRow(row, ctx).reportRow)
    .filter((row): row is ReportRow => row !== null)
    .sort((left, right) => left.gmoId - right.gmoId)

  const worksheetRows = [
    getReportHeaders(lang),
    ...reportRows.map((entry, index) => {
      const [_, ...rest] = entry.row
      return [String(index + 1), ...rest]
    })
  ]

  const buffer = buildWorkbookBuffer({
    name: 'Sheet1',
    footer: `Formblatt Z, ${ctx.settings.institution}`,
    repeatHeaderRow: true,
    columns: defaultColumnWidths().map((width) => ({ width })),
    rows: worksheetRows
  })

  return { buffer, rowCount: reportRows.length }
}
