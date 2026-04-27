import { describe, it, expect } from 'vitest'
import {
  UpdateSettingsSchema,
  CreatePlasmidSchema,
  UpdatePlasmidSchema,
  PlasmidFiltersSchema,
  CreateOrganismSchema,
  UpdateOrganismSchema,
  CreateFeatureSchema,
  CreateGMOSchema,
  CreateSeedSchema,
} from './ipc-schemas'

// ─── Settings ─────────────────────────────────────────────────────────────────

describe('UpdateSettingsSchema', () => {
  it('accepts all optional — empty object is valid', () => {
    expect(UpdateSettingsSchema.safeParse({}).success).toBe(true)
  })

  it('accepts valid full payload', () => {
    const result = UpdateSettingsSchema.safeParse({
      userName: 'Julia Jores',
      userInitials: 'JJ',
      institution: 'ETH Zürich',
      institutionAz: 'AZ-2024-001',
      institutionAnlage: '3',
      theme: 'dark',
      fontSize: 14,
      cloudProvider: 'sciebo',
      cloudPath: '/Users/julia/Sciebo/JLab',
      accentColor: 'teal',
    })
    expect(result.success).toBe(true)
  })

  it('rejects initials longer than 5 characters', () => {
    expect(UpdateSettingsSchema.safeParse({ userInitials: 'TOOLONG' }).success).toBe(false)
  })

  it('accepts initials exactly 5 characters', () => {
    expect(UpdateSettingsSchema.safeParse({ userInitials: 'JJJJJ' }).success).toBe(true)
  })

  it('rejects invalid theme value', () => {
    expect(UpdateSettingsSchema.safeParse({ theme: 'purple' }).success).toBe(false)
  })

  it('rejects fontSize below 10', () => {
    expect(UpdateSettingsSchema.safeParse({ fontSize: 9 }).success).toBe(false)
  })

  it('rejects fontSize above 24', () => {
    expect(UpdateSettingsSchema.safeParse({ fontSize: 25 }).success).toBe(false)
  })

  it('accepts fontSize at boundary values 10 and 24', () => {
    expect(UpdateSettingsSchema.safeParse({ fontSize: 10 }).success).toBe(true)
    expect(UpdateSettingsSchema.safeParse({ fontSize: 24 }).success).toBe(true)
  })

  it('accepts null cloudProvider (cleared)', () => {
    expect(UpdateSettingsSchema.safeParse({ cloudProvider: null }).success).toBe(true)
  })

  it('rejects unknown cloudProvider value', () => {
    expect(UpdateSettingsSchema.safeParse({ cloudProvider: 'dropbox' }).success).toBe(false)
  })
})

// ─── Plasmids ─────────────────────────────────────────────────────────────────

describe('CreatePlasmidSchema', () => {
  it('requires name', () => {
    expect(CreatePlasmidSchema.safeParse({}).success).toBe(false)
    expect(CreatePlasmidSchema.safeParse({ name: '' }).success).toBe(false)
  })

  it('accepts minimal valid payload', () => {
    const result = CreatePlasmidSchema.safeParse({ name: 'pJL001' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('planned') // new default
      expect(result.data.creatorName).toBe('')   // default
    }
  })

  it('accepts any string status (validated against selection_values at DB level)', () => {
    // Status is now a free-form string — selection_values table is the source of truth
    expect(CreatePlasmidSchema.safeParse({ name: 'pJL001', status: 'planned' }).success).toBe(true)
    expect(CreatePlasmidSchema.safeParse({ name: 'pJL001', status: 'in_progress' }).success).toBe(true)
    expect(CreatePlasmidSchema.safeParse({ name: 'pJL001', status: 'complete' }).success).toBe(true)
  })

  it('rejects negative concentration', () => {
    expect(CreatePlasmidSchema.safeParse({ name: 'p', concentration: -1 }).success).toBe(false)
  })

  it('accepts zero is not valid (positive only)', () => {
    expect(CreatePlasmidSchema.safeParse({ name: 'p', concentration: 0 }).success).toBe(false)
  })

  it('accepts valid concentration', () => {
    expect(CreatePlasmidSchema.safeParse({ name: 'p', concentration: 250.5 }).success).toBe(true)
  })

  it('rejects invalid sequencingResult', () => {
    expect(CreatePlasmidSchema.safeParse({ name: 'p', sequencingResult: 'unknown' }).success).toBe(false)
  })

  it('accepts valid sequencingResult values', () => {
    for (const r of ['pending', 'passed', 'failed']) {
      expect(CreatePlasmidSchema.safeParse({ name: 'p', sequencingResult: r }).success).toBe(true)
    }
  })
})

describe('UpdatePlasmidSchema', () => {
  it('allows completely empty object (all fields optional)', () => {
    expect(UpdatePlasmidSchema.safeParse({}).success).toBe(true)
  })

  it('accepts any string for status', () => {
    expect(UpdatePlasmidSchema.safeParse({ status: 'planned' }).success).toBe(true)
    expect(UpdatePlasmidSchema.safeParse({ status: 'in_progress' }).success).toBe(true)
  })
})

describe('PlasmidFiltersSchema', () => {
  it('accepts empty filters', () => {
    expect(PlasmidFiltersSchema.safeParse({}).success).toBe(true)
  })

  it('accepts any string status filter', () => {
    expect(PlasmidFiltersSchema.safeParse({ status: 'complete' }).success).toBe(true)
    expect(PlasmidFiltersSchema.safeParse({ status: 'planned' }).success).toBe(true)
  })
})

// ─── Organisms ────────────────────────────────────────────────────────────────

describe('CreateOrganismSchema', () => {
  it('requires name', () => {
    expect(CreateOrganismSchema.safeParse({}).success).toBe(false)
    expect(CreateOrganismSchema.safeParse({ name: '' }).success).toBe(false)
  })

  it('defaults riskGroup to 1', () => {
    const result = CreateOrganismSchema.safeParse({ name: 'E. coli' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.riskGroup).toBe(1)
  })

  it('rejects riskGroup below 1', () => {
    expect(CreateOrganismSchema.safeParse({ name: 'E. coli', riskGroup: 0 }).success).toBe(false)
  })

  it('rejects riskGroup above 4', () => {
    expect(CreateOrganismSchema.safeParse({ name: 'E. coli', riskGroup: 5 }).success).toBe(false)
  })

  it('accepts all valid risk groups 1-4', () => {
    for (const rg of [1, 2, 3, 4]) {
      expect(CreateOrganismSchema.safeParse({ name: 'E. coli', riskGroup: rg }).success).toBe(true)
    }
  })
})

describe('UpdateOrganismSchema', () => {
  it('allows empty object', () => {
    expect(UpdateOrganismSchema.safeParse({}).success).toBe(true)
  })

  it('still validates riskGroup when present', () => {
    expect(UpdateOrganismSchema.safeParse({ riskGroup: 5 }).success).toBe(false)
  })
})

// ─── Features ─────────────────────────────────────────────────────────────────

describe('CreateFeatureSchema', () => {
  it('requires name', () => {
    expect(CreateFeatureSchema.safeParse({}).success).toBe(false)
  })

  it('defaults type to "other"', () => {
    const result = CreateFeatureSchema.safeParse({ name: '35S promoter' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.type).toBe('other')
  })

  it('accepts all valid type values', () => {
    for (const type of ['promoter', 'gene', 'terminator', 'rbs', 'marker', 'origin', 'other']) {
      expect(CreateFeatureSchema.safeParse({ name: 'x', type }).success).toBe(true)
    }
  })

  it('rejects unknown type', () => {
    expect(CreateFeatureSchema.safeParse({ name: 'x', type: 'enhancer' }).success).toBe(false)
  })

  it('defaults riskLevel to 0', () => {
    const result = CreateFeatureSchema.safeParse({ name: 'gfp' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.riskLevel).toBe(0)
  })

  it('rejects negative riskLevel', () => {
    expect(CreateFeatureSchema.safeParse({ name: 'x', riskLevel: -1 }).success).toBe(false)
  })

  it('rejects riskLevel above 4', () => {
    expect(CreateFeatureSchema.safeParse({ name: 'x', riskLevel: 5 }).success).toBe(false)
  })
})

// ─── GMOs ─────────────────────────────────────────────────────────────────────

describe('CreateGMOSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    expect(CreateGMOSchema.safeParse({}).success).toBe(true)
  })

  it('accepts minimal payload', () => {
    expect(CreateGMOSchema.safeParse({ name: 'EsCo / pJL001' }).success).toBe(true)
  })

  it('accepts all optional fields as null', () => {
    expect(CreateGMOSchema.safeParse({
      name: 'test',
      plasmidId: null,
      hostOrganismId: null,
      riskGroup: null,
      approval: null,
      createdDate: null,
      destroyedDate: null,
      notes: null
    }).success).toBe(true)
  })

  it('coerces date strings to Date objects', () => {
    const result = CreateGMOSchema.safeParse({ name: 'test', createdDate: '2024-01-15' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.createdDate).toBeInstanceOf(Date)
  })
})

// ─── Seeds ────────────────────────────────────────────────────────────────────

describe('CreateSeedSchema', () => {
  it('requires name and species', () => {
    expect(CreateSeedSchema.safeParse({}).success).toBe(false)
    expect(CreateSeedSchema.safeParse({ name: 'Col-0' }).success).toBe(false)
    expect(CreateSeedSchema.safeParse({ species: 'A. thaliana' }).success).toBe(false)
  })

  it('accepts minimal valid payload', () => {
    expect(CreateSeedSchema.safeParse({ name: 'Col-0', species: 'Arabidopsis thaliana' }).success).toBe(true)
  })

  it('accepts full payload with all optional fields', () => {
    expect(CreateSeedSchema.safeParse({
      name: 'Col-0 #3',
      species: 'Arabidopsis thaliana',
      lineAccession: 'CS70000',
      source: 'TAIR',
      storageLocation: 'Fridge A, box 3',
      notes: 'WT ecotype'
    }).success).toBe(true)
  })
})
