import { z } from 'zod'

// ─── Settings ─────────────────────────────────────────────────────────────────

export const UpdateSettingsSchema = z.object({
  userName: z.string().optional(),
  userInitials: z.string().max(5).optional(),
  institution: z.string().optional(),
  institutionAz: z.string().optional(),
  institutionAnlage: z.string().optional(),
  theme: z.enum(['light', 'dark']).optional(),
  regionalLocale: z.string().nullable().optional(),
  fontSize: z.number().int().min(10).max(24).optional(),
  cloudProvider: z.enum(['sciebo', 'google_drive']).nullable().optional(),
  cloudPath: z.string().nullable().optional(),
  accentColor: z.string().optional(),
  aliasFormat: z.string().nullable().optional(),
  autoCreateGmoEnabled: z.boolean().optional(),
  autoCreateGmoOrganism: z.string().nullable().optional(),
  autoCreateGmoStrain: z.string().nullable().optional(),
  statusColours: z.string().nullable().optional(),
  favouriteOrganisms: z.string().nullable().optional(),
  targetOrganisms: z.string().nullable().optional(),
  labelTemplateJson: z.string().nullable().optional()
})

export type UpdateSettings = z.infer<typeof UpdateSettingsSchema>

// ─── Categories ───────────────────────────────────────────────────────────────

export const CreateCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sortOrder: z.number().int().min(0).optional()
})

export const UpdateCategorySchema = CreateCategorySchema.partial()

export type CreateCategory = z.infer<typeof CreateCategorySchema>
export type UpdateCategory = z.infer<typeof UpdateCategorySchema>

// ─── Plasmids ─────────────────────────────────────────────────────────────────

export const CreatePlasmidSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  alias: z.string().nullable().optional(),
  categoryId: z.number().int().nullable().optional(),
  description: z.string().nullable().optional(),
  purpose: z.string().nullable().optional(),
  backboneVector: z.string().nullable().optional(),
  marker: z.string().nullable().optional(),
  cassette: z.string().nullable().optional(),
  clonedBy: z.string().nullable().optional(),
  concentration: z.number().positive().nullable().optional(),
  dateMiniprep: z.coerce.date().nullable().optional(),
  sequenced: z.boolean().optional(),
  seqMethod: z.string().nullable().optional(),
  dateSequenced: z.coerce.date().nullable().optional(),
  sequencingResult: z.enum(['pending', 'passed', 'failed']).nullable().optional(),
  glycerolStockId: z.string().nullable().optional(),
  dateGlycerolStock: z.coerce.date().nullable().optional(),
  box: z.string().nullable().optional(),
  status: z.string().default('planned'),
  creatorName: z.string().default(''),
  creatorInitials: z.string().default(''),
  dateCreated: z.coerce.date().nullable().optional(),
  gbFilePath: z.string().nullable().optional(),
  publicComment: z.string().nullable().optional(),
  privateComment: z.string().nullable().optional()
})

export const UpdatePlasmidSchema = CreatePlasmidSchema.partial()

export const PlasmidFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  creatorInitials: z.string().optional(),
  categoryId: z.number().int().optional()
})

export type CreatePlasmid = z.infer<typeof CreatePlasmidSchema>
export type UpdatePlasmid = z.infer<typeof UpdatePlasmidSchema>
export type PlasmidFilters = z.infer<typeof PlasmidFiltersSchema>

// ─── Organisms ────────────────────────────────────────────────────────────────

export const CreateOrganismSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  shortName: z.string().nullable().optional(),
  riskGroup: z.number().int().min(1).max(4).default(1),
  roleGroup: z.string().nullable().optional(),
})

export const UpdateOrganismSchema = CreateOrganismSchema.partial()

export type CreateOrganism = z.infer<typeof CreateOrganismSchema>
export type UpdateOrganism = z.infer<typeof UpdateOrganismSchema>

// ─── Features ─────────────────────────────────────────────────────────────────

export const FeatureTypeSchema = z.enum(['promoter', 'gene', 'terminator', 'rbs', 'marker', 'origin', 'other'])
export type FeatureType = z.infer<typeof FeatureTypeSchema>

export const CreateFeatureSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  alias: z.string().nullable().optional(),
  type: FeatureTypeSchema.default('other'),
  organismSource: z.string().nullable().optional(),
  riskLevel: z.number().int().min(0).max(4).default(0),
})

export const UpdateFeatureSchema = CreateFeatureSchema.partial()

export type CreateFeature = z.infer<typeof CreateFeatureSchema>
export type UpdateFeature = z.infer<typeof UpdateFeatureSchema>

// ─── GMOs ─────────────────────────────────────────────────────────────────────

export const CreateGMOSchema = z.object({
  plasmidId: z.number().nullable().optional(),
  hostOrganismId: z.number().nullable().optional(),
  strain: z.string().nullable().optional(),
  approval: z.string().nullable().optional(),
  createdDate: z.coerce.date().nullable().optional(),
  destroyedDate: z.coerce.date().nullable().optional(),
  glycerolStockId: z.string().nullable().optional(),
  dateGlycerolStock: z.coerce.date().nullable().optional(),
  box: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export const UpdateGMOSchema = CreateGMOSchema.partial()

export type CreateGMO = z.infer<typeof CreateGMOSchema>
export type UpdateGMO = z.infer<typeof UpdateGMOSchema>

export const FormblattLanguageSchema = z.enum(['de', 'en'])

export const ValidateFormblattSchema = z.object({
  dateFrom: z.coerce.date().nullable().optional(),
  dateTo: z.coerce.date().nullable().optional()
})

export const GenerateFormblattSchema = ValidateFormblattSchema.extend({
  lang: FormblattLanguageSchema.default('de'),
  filePath: z.string().nullable().optional()
})

export type FormblattLanguage = z.infer<typeof FormblattLanguageSchema>
export type ValidateFormblatt = z.infer<typeof ValidateFormblattSchema>
export type GenerateFormblatt = z.infer<typeof GenerateFormblattSchema>

// ─── Labels ───────────────────────────────────────────────────────────────────

export const GenerateLabelsSchema = z.object({
  plasmidIds: z.array(z.number().int().positive()).min(1, 'Select at least one plasmid'),
  filePath: z.string().nullable().optional()
})

export type GenerateLabels = z.infer<typeof GenerateLabelsSchema>

// ─── Seeds ────────────────────────────────────────────────────────────────────

export const CreateSeedSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  species: z.string().min(1, 'Species is required'),
  lineAccession: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  storageLocation: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export const UpdateSeedSchema = CreateSeedSchema.partial()

export type CreateSeed = z.infer<typeof CreateSeedSchema>
export type UpdateSeed = z.infer<typeof UpdateSeedSchema>
