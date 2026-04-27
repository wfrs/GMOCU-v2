import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

// ─── Settings (singleton, always id=1) ───────────────────────────────────────

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey().default(1),
  userName: text('user_name').notNull().default(''),
  userInitials: text('user_initials').notNull().default(''),
  institution: text('institution').notNull().default(''),
  // Compliance fields for German GenTAufzV (Formblatt-Z)
  institutionAz: text('institution_az').notNull().default(''),        // Aktenzeichen
  institutionAnlage: text('institution_anlage').notNull().default(''), // Anlage-Nr.
  theme: text('theme').notNull().default('light'),
  regionalLocale: text('regional_locale'),
  fontSize: integer('font_size').notNull().default(14),
  cloudProvider: text('cloud_provider'), // 'sciebo' | 'google_drive' | null
  cloudPath: text('cloud_path'),
  accentColor: text('accent_color').notNull().default('teal'),
  // Alias template, e.g. "{initials}{id:04d}" → "CJM0042"
  aliasFormat: text('alias_format'),
  // Auto-create E. coli GMO on new plasmid
  autoCreateGmoEnabled: integer('auto_create_gmo_enabled', { mode: 'boolean' }).notNull().default(false),
  autoCreateGmoOrganism: text('auto_create_gmo_organism'), // organism short name
  autoCreateGmoStrain: text('auto_create_gmo_strain'),
  // Status → hex colour map, stored as JSON {"draft":"#868e96", ...}
  statusColours: text('status_colours'),
  // Favourite organisms (short names), stored as JSON array
  favouriteOrganisms: text('favourite_organisms'),
  // Target organisms for Formblatt-Z, stored as JSON array
  targetOrganisms: text('target_organisms'),
  // Label printing template config, stored as JSON
  labelTemplateJson: text('label_template_json'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())
})

// ─── Categories (user-defined plasmid categories) ─────────────────────────────

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())
})

// ─── Selection values (status dropdown + colors) ──────────────────────────────

export const selectionValues = sqliteTable('selection_values', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  value: text('value').notNull().unique(), // machine key, e.g. 'in_progress'
  label: text('label').notNull(),          // display label, e.g. 'In Progress'
  colour: text('colour'),                  // hex color, e.g. '#fab005'
  sortOrder: integer('sort_order').notNull().default(0)
})

// ─── Organisms glossary ───────────────────────────────────────────────────────

export const organisms = sqliteTable('organisms', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  shortName: text('short_name'), // e.g. 'EsCo' — abbreviation used in legacy GMOcu
  riskGroup: integer('risk_group').notNull().default(1),
  roleGroup: text('role_group'), // e.g. 'donor', 'host', 'vector'
  uid: text('uid').unique(), // for cloud sync
  synced: integer('synced', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())
})

// ─── Features glossary (genetic elements) ────────────────────────────────────

export const features = sqliteTable('features', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  alias: text('alias'), // common short alias (from legacy GMOcu)
  type: text('type').notNull(), // 'promoter' | 'gene' | 'terminator' | 'rbs' | 'other'
  organismSource: text('organism_source'),
  riskLevel: integer('risk_level').notNull().default(0),
  uid: text('uid').unique(),
  synced: integer('synced', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())
})

// ─── Plasmids ─────────────────────────────────────────────────────────────────

export const plasmids = sqliteTable('plasmids', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  alias: text('alias'),
  // Category FK (user-defined, e.g. "Entry vector", "CDS", "Terminator")
  categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
  description: text('description'),
  purpose: text('purpose'),
  backboneVector: text('backbone_vector'),
  marker: text('marker'), // resistance/selection marker
  // Cassette: dash-separated feature token string, e.g. "35S-GFP-NOS"
  cassette: text('cassette'),
  clonedBy: text('cloned_by'),
  // Concentration + miniprep tracking
  concentration: real('concentration'), // ng/µL
  dateMiniprep: integer('date_miniprep', { mode: 'timestamp' }), // updated when concentration changes
  // Sequencing
  sequenced: integer('sequenced', { mode: 'boolean' }).notNull().default(false),
  seqMethod: text('seq_method'), // 'Sanger' | 'ONT' | other free text
  dateSequenced: integer('date_sequenced', { mode: 'timestamp' }),
  sequencingResult: text('sequencing_result'), // 'pending' | 'passed' | 'failed'
  // Glycerol stock
  glycerolStockId: text('glycerol_stock_id'), // e.g. 'CJM001', optional
  dateGlycerolStock: integer('date_glycerol_stock', { mode: 'timestamp' }),
  box: text('box'), // physical freezer box label
  // Status (value → selection_values.value)
  status: text('status').notNull().default('planned'),
  // Creator info
  creatorName: text('creator_name').notNull().default(''),
  creatorInitials: text('creator_initials').notNull().default(''),
  // Date plasmid was created (cloned), distinct from row createdAt
  dateCreated: integer('date_created', { mode: 'timestamp' }),
  // GenBank file path on disk (replaces inline genbank_data)
  gbFilePath: text('gb_file_path'),
  // Comments
  publicComment: text('public_comment'),   // visible to team
  privateComment: text('private_comment'), // personal only, never published
  publishedAt: integer('published_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())
})

// ─── Cassettes (ordered genetic constructs within a plasmid) ─────────────────
// Kept for future normalized storage; the primary cassette string lives on plasmids.cassette

export const cassettes = sqliteTable('cassettes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  plasmidId: integer('plasmid_id')
    .notNull()
    .references(() => plasmids.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  order: integer('order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())
})

// ─── Cassette parts (each feature slot, with source organism) ─────────────────

export const cassetteParts = sqliteTable('cassette_parts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cassetteId: integer('cassette_id')
    .notNull()
    .references(() => cassettes.id, { onDelete: 'cascade' }),
  featureId: integer('feature_id').references(() => features.id),
  sourceOrganismId: integer('source_organism_id').references(() => organisms.id),
  order: integer('order').notNull().default(0),
  notes: text('notes')
})

// ─── GMOs ─────────────────────────────────────────────────────────────────────

export const gmos = sqliteTable('gmos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  plasmidId: integer('plasmid_id').references(() => plasmids.id),
  hostOrganismId: integer('host_organism_id').references(() => organisms.id),
  // riskGroup is inherited from organism — not stored here
  strain: text('strain'), // free text, e.g. 'TOP10', 'GV3101'
  approval: text('approval'),
  createdDate: integer('created_date', { mode: 'timestamp' }),
  destroyedDate: integer('destroyed_date', { mode: 'timestamp' }),
  glycerolStockId: text('glycerol_stock_id'),
  dateGlycerolStock: integer('date_glycerol_stock', { mode: 'timestamp' }),
  box: text('box'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())
})

// ─── Attachments ──────────────────────────────────────────────────────────────
// Files stored on disk, not as BLOBs

export const attachments = sqliteTable('attachments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  plasmidId: integer('plasmid_id')
    .notNull()
    .references(() => plasmids.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  filePath: text('file_path').notNull(), // absolute path on disk
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())
})

// ─── Seeds (independent module — not linked to plasmids) ─────────────────────

export const seeds = sqliteTable('seeds', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  species: text('species').notNull(),
  lineAccession: text('line_accession'),
  source: text('source'),
  storageLocation: text('storage_location'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())
})

// ─── Inferred types ───────────────────────────────────────────────────────────

export type Settings = typeof settings.$inferSelect
export type Category = typeof categories.$inferSelect
export type SelectionValue = typeof selectionValues.$inferSelect
export type Organism = typeof organisms.$inferSelect
export type Feature = typeof features.$inferSelect
export type Plasmid = typeof plasmids.$inferSelect
export type Cassette = typeof cassettes.$inferSelect
export type CassettePart = typeof cassetteParts.$inferSelect
export type GMO = typeof gmos.$inferSelect
export type Attachment = typeof attachments.$inferSelect
export type Seed = typeof seeds.$inferSelect
