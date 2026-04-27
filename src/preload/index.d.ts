import type {
  IPCResponse, SettingsRow, PlasmidRow, OrganismRow, FeatureRow,
  GMORow, SeedRow, LogEntry, ParsedGenBank, CategoryRow, SelectionValueRow,
  FormblattGenerationResult, FormblattValidationResult, LabelGenerationResult
} from '../shared/types'
import type {
  UpdateSettings,
  CreatePlasmid, UpdatePlasmid, PlasmidFilters,
  CreateCategory, UpdateCategory,
  CreateOrganism, UpdateOrganism,
  CreateFeature, UpdateFeature,
  CreateGMO, UpdateGMO, GenerateFormblatt, ValidateFormblatt,
  GenerateLabels,
  CreateSeed, UpdateSeed
} from '../shared/ipc-schemas'

declare global {
  interface Window {
    api: {
      platform: NodeJS.Platform
      settings: {
        get: () => Promise<IPCResponse<SettingsRow>>
        update: (data: UpdateSettings) => Promise<IPCResponse<SettingsRow>>
      }
      plasmids: {
        list: (filters?: PlasmidFilters) => Promise<IPCResponse<PlasmidRow[]>>
        get: (id: number) => Promise<IPCResponse<PlasmidRow>>
        create: (data: CreatePlasmid) => Promise<IPCResponse<PlasmidRow>>
        update: (id: number, data: UpdatePlasmid) => Promise<IPCResponse<PlasmidRow>>
        delete: (id: number) => Promise<IPCResponse>
      }
      categories: {
        list: () => Promise<IPCResponse<CategoryRow[]>>
        create: (data: CreateCategory) => Promise<IPCResponse<CategoryRow>>
        update: (id: number, data: UpdateCategory) => Promise<IPCResponse<CategoryRow>>
        delete: (id: number) => Promise<IPCResponse>
      }
      selectionValues: {
        list: () => Promise<IPCResponse<SelectionValueRow[]>>
        update: (id: number, data: { colour?: string | null }) => Promise<IPCResponse<SelectionValueRow>>
      }
      files: {
        parseGenbank: () => Promise<IPCResponse<ParsedGenBank | null>>
        parseGenbankContent: (content: string) => Promise<IPCResponse<ParsedGenBank>>
      }
      importData: {
        legacyGmocu: (opts?: { backup?: boolean }) => Promise<IPCResponse<{
          cancelled: boolean
          counts?: { organisms: number; features: number; plasmids: number; cassettes: number; gmos: number; attachments: number }
          creatorName?: string
          creatorInitials?: string
        }>>
      }
      organisms: {
        list: (search?: string) => Promise<IPCResponse<OrganismRow[]>>
        get: (id: number) => Promise<IPCResponse<OrganismRow>>
        create: (data: CreateOrganism) => Promise<IPCResponse<OrganismRow>>
        update: (id: number, data: UpdateOrganism) => Promise<IPCResponse<OrganismRow>>
        delete: (id: number) => Promise<IPCResponse>
      }
      features: {
        list: (search?: string) => Promise<IPCResponse<FeatureRow[]>>
        get: (id: number) => Promise<IPCResponse<FeatureRow>>
        create: (data: CreateFeature) => Promise<IPCResponse<FeatureRow>>
        update: (id: number, data: UpdateFeature) => Promise<IPCResponse<FeatureRow>>
        delete: (id: number) => Promise<IPCResponse>
      }
      gmos: {
        list: (plasmidId?: number) => Promise<IPCResponse<GMORow[]>>
        get: (id: number) => Promise<IPCResponse<GMORow>>
        create: (data: CreateGMO) => Promise<IPCResponse<GMORow>>
        update: (id: number, data: UpdateGMO) => Promise<IPCResponse<GMORow>>
        delete: (id: number) => Promise<IPCResponse>
        validateFormblatt: (data?: ValidateFormblatt) => Promise<IPCResponse<FormblattValidationResult>>
        generateFormblatt: (data?: GenerateFormblatt) => Promise<IPCResponse<FormblattGenerationResult>>
      }
      seeds: {
        list: (search?: string) => Promise<IPCResponse<SeedRow[]>>
        get: (id: number) => Promise<IPCResponse<SeedRow>>
        create: (data: CreateSeed) => Promise<IPCResponse<SeedRow>>
        update: (id: number, data: UpdateSeed) => Promise<IPCResponse<SeedRow>>
        delete: (id: number) => Promise<IPCResponse>
      }
      labels: {
        generate: (data: GenerateLabels) => Promise<IPCResponse<LabelGenerationResult>>
      }
      dev: {
        getLogs: () => Promise<LogEntry[]>
        resetDb: () => Promise<IPCResponse<string>>
        onLog: (cb: (entry: LogEntry) => void) => () => void
      }
    }
  }
}
