import { describe, it, expect } from 'vitest'
import { parseGenBank } from './genbank'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MINIMAL_GB = `LOCUS       pJL001                  4500 bp    DNA     circular SYN 01-JAN-2024
DEFINITION  Test plasmid for GFP overexpression.
ACCESSION   pJL001
ORIGIN
        1 atgctagcta gctagctagc
//`

const MULTILINE_DEF = `LOCUS       pXX002                  3200 bp    DNA     circular SYN 15-MAR-2023
DEFINITION  A plasmid with a very long definition that spans
            multiple continuation lines in the file.
ACCESSION   pXX002
ORIGIN
//`

const NO_ACCESSION = `LOCUS       pNO001                   800 bp    DNA     linear   SYN 01-JAN-2024
DEFINITION  Minimal plasmid.
ORIGIN
//`

const MALFORMED_LOCUS = `ORIGIN
//`

const CRLF_GB = `LOCUS       pCR001                  1000 bp    DNA     circular SYN 01-JAN-2024\r\nDEFINITION  CRLF line endings test.\r\nACCESSION   pCR001\r\nORIGIN\r\n//\r\n`

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('parseGenBank', () => {
  describe('LOCUS name', () => {
    it('extracts name from LOCUS line', () => {
      expect(parseGenBank(MINIMAL_GB).name).toBe('pJL001')
    })

    it('extracts name from LOCUS with extra whitespace', () => {
      const gb = `LOCUS     pSPACE    500 bp   DNA   circular\nORIGIN\n//`
      expect(parseGenBank(gb).name).toBe('pSPACE')
    })

    it('returns "Unnamed" when no LOCUS line', () => {
      expect(parseGenBank(MALFORMED_LOCUS).name).toBe('Unnamed')
    })
  })

  describe('sequence length', () => {
    it('extracts bp count from LOCUS line', () => {
      expect(parseGenBank(MINIMAL_GB).sequenceLength).toBe(4500)
    })

    it('returns 0 when no LOCUS line', () => {
      expect(parseGenBank(MALFORMED_LOCUS).sequenceLength).toBe(0)
    })

    it('handles 3-digit bp count', () => {
      expect(parseGenBank(NO_ACCESSION).sequenceLength).toBe(800)
    })
  })

  describe('DEFINITION', () => {
    it('extracts single-line definition', () => {
      expect(parseGenBank(MINIMAL_GB).definition).toBe('Test plasmid for GFP overexpression')
    })

    it('joins multi-line definition', () => {
      const result = parseGenBank(MULTILINE_DEF).definition
      expect(result).toBe('A plasmid with a very long definition that spans multiple continuation lines in the file')
    })

    it('returns empty string when no DEFINITION line', () => {
      expect(parseGenBank(MALFORMED_LOCUS).definition).toBe('')
    })

    it('returns definition when present even without LOCUS', () => {
      const gb = `DEFINITION  A plasmid without a LOCUS line.\nORIGIN\n//`
      expect(parseGenBank(gb).definition).toBe('A plasmid without a LOCUS line')
    })
  })

  describe('ACCESSION', () => {
    it('extracts accession', () => {
      expect(parseGenBank(MINIMAL_GB).accession).toBe('pJL001')
    })

    it('returns empty string when no ACCESSION line', () => {
      expect(parseGenBank(NO_ACCESSION).accession).toBe('')
    })
  })

  describe('content', () => {
    it('preserves the full raw content', () => {
      expect(parseGenBank(MINIMAL_GB).content).toBe(MINIMAL_GB)
    })
  })

  describe('CRLF line endings', () => {
    it('handles Windows CRLF line endings', () => {
      const result = parseGenBank(CRLF_GB)
      expect(result.name).toBe('pCR001')
      expect(result.sequenceLength).toBe(1000)
      expect(result.accession).toBe('pCR001')
    })
  })

  describe('edge cases', () => {
    it('handles empty string input', () => {
      const result = parseGenBank('')
      expect(result.name).toBe('Unnamed')
      expect(result.sequenceLength).toBe(0)
      expect(result.definition).toBe('')
      expect(result.accession).toBe('')
    })

    it('strips trailing period from definition', () => {
      const gb = `LOCUS       pDOT   100 bp\nDEFINITION  A plasmid.\nORIGIN\n//`
      expect(parseGenBank(gb).definition).toBe('A plasmid')
    })
  })
})
