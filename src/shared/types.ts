// Shared types accessible from both main and renderer processes

export interface OrganismRow {
  id: number
  name: string
  shortName: string | null
  riskGroup: number
  roleGroup: string | null
  uid: string | null
  synced: boolean
  createdAt: Date
}

export interface FeatureRow {
  id: number
  name: string
  alias: string | null
  type: string
  organismSource: string | null
  riskLevel: number
  uid: string | null
  synced: boolean
  createdAt: Date
}

export interface CategoryRow {
  id: number
  name: string
  sortOrder: number
  createdAt: Date
}

export interface SelectionValueRow {
  id: number
  value: string
  label: string
  colour: string | null
  sortOrder: number
}

export interface GMORow {
  id: number
  plasmidId: number | null
  hostOrganismId: number | null
  strain: string | null
  approval: string | null
  createdDate: Date | null
  destroyedDate: Date | null
  glycerolStockId: string | null
  dateGlycerolStock: Date | null
  box: string | null
  notes: string | null
  createdAt: Date
}

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

export interface FormblattGenerationResult {
  filePath: string
  rowCount: number
  language: FormblattLanguage
}

export interface LabelGenerationResult {
  filePath: string
  count: number
}

export interface SeedRow {
  id: number
  name: string
  species: string
  lineAccession: string | null
  source: string | null
  storageLocation: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ParsedGenBank {
  name: string
  definition: string
  accession: string
  sequenceLength: number
  content: string
}

export type LogLevel = 'info' | 'warn' | 'error' | 'ipc-in' | 'ipc-ok' | 'ipc-err' | 'renderer'

export interface LogEntry {
  id: number
  ts: string       // HH:MM:SS.mmm
  level: LogLevel
  message: string
  detail?: string
  duration?: number
}

export interface IPCResponse<T = void> {
  success: boolean
  data?: T
  error?: string
}

// ─── Row types (mirrored from db/schema — keep in sync) ──────────────────────

export interface SettingsRow {
  id: number
  userName: string
  userInitials: string
  institution: string
  institutionAz: string
  institutionAnlage: string
  theme: string
  regionalLocale: string | null
  fontSize: number
  cloudProvider: string | null
  cloudPath: string | null
  accentColor: string
  aliasFormat: string | null
  autoCreateGmoEnabled: boolean
  autoCreateGmoOrganism: string | null
  autoCreateGmoStrain: string | null
  statusColours: string | null   // JSON: { [statusValue]: hexColor }
  favouriteOrganisms: string | null  // JSON: string[]
  targetOrganisms: string | null     // JSON: string[]
  labelTemplateJson: string | null
  createdAt: Date
  updatedAt: Date
}

export interface PlasmidRow {
  id: number
  name: string
  alias: string | null
  categoryId: number | null
  description: string | null
  purpose: string | null
  backboneVector: string | null
  marker: string | null
  cassette: string | null
  clonedBy: string | null
  concentration: number | null
  dateMiniprep: Date | null
  sequenced: boolean
  seqMethod: string | null
  dateSequenced: Date | null
  sequencingResult: string | null
  glycerolStockId: string | null
  dateGlycerolStock: Date | null
  box: string | null
  status: string
  creatorName: string
  creatorInitials: string
  dateCreated: Date | null
  gbFilePath: string | null
  publicComment: string | null
  privateComment: string | null
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
