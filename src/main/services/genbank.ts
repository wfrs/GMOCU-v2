/**
 * Minimal GenBank (.gb / .gbk) parser.
 *
 * Extracts: LOCUS name, DEFINITION, ACCESSION, and the ORIGIN sequence.
 * Everything else is left to the raw `content` string stored in the DB.
 */

export interface ParsedGenBank {
  name: string         // from LOCUS line
  definition: string   // from DEFINITION line (may be empty)
  accession: string    // from ACCESSION line (may be empty)
  sequenceLength: number
  content: string      // full raw file content
}

export function parseGenBank(content: string): ParsedGenBank {
  const lines = content.split(/\r?\n/)

  let name = ''
  let definition = ''
  let accession = ''
  let sequenceLength = 0

  // LOCUS    <name>   <length> bp …
  const locusLine = lines.find((l) => l.startsWith('LOCUS'))
  if (locusLine) {
    const parts = locusLine.trim().split(/\s+/)
    name = parts[1] ?? ''
    const bpIdx = parts.indexOf('bp')
    if (bpIdx > 1) sequenceLength = parseInt(parts[bpIdx - 1]) || 0
  }

  // DEFINITION  <text> (may span multiple lines, continued lines start with spaces)
  const defStart = lines.findIndex((l) => l.startsWith('DEFINITION'))
  if (defStart >= 0) {
    const defLines = [lines[defStart].replace(/^DEFINITION\s+/, '')]
    for (let i = defStart + 1; i < lines.length; i++) {
      if (/^\s{12}/.test(lines[i])) {
        defLines.push(lines[i].trim())
      } else break
    }
    definition = defLines.join(' ').replace(/\.$/, '').trim()
  }

  // ACCESSION  <id>
  const accLine = lines.find((l) => l.startsWith('ACCESSION'))
  if (accLine) {
    accession = accLine.replace(/^ACCESSION\s+/, '').trim().split(/\s+/)[0]
  }

  // Use the filename-derived name as fallback
  if (!name) name = 'Unnamed'

  return { name, definition, accession, sequenceLength, content }
}
