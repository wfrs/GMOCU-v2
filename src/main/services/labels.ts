import PDFDocument from 'pdfkit'
import type { PlasmidRow } from '../../shared/types'

// A4 dimensions in points
const PAGE_W = 595.28
const PAGE_H = 841.89

// Grid layout — 4 columns × 14 rows = 56 labels per page (matches reference PDF)
const MARGIN_H = 28
const MARGIN_V = 28
const COLS = 4
const ROWS_PER_PAGE = 14

const LABEL_W = (PAGE_W - MARGIN_H * 2) / COLS  // ~134.8pt
const LABEL_H = (PAGE_H - MARGIN_V * 2) / ROWS_PER_PAGE  // ~56pt
const PAD = 5

function formatLabelDate(value: Date | string | null | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = String(d.getFullYear()).slice(2)
  return `${day}.${month}.${year}`
}

function getDateLine(p: PlasmidRow): string {
  const initials = p.creatorInitials?.trim() ?? ''
  const date = formatLabelDate(p.dateMiniprep ?? p.dateCreated)
  if (initials && date) return `${initials} ${date}`
  if (date) return date
  if (initials) return initials
  return ''
}

function getConcentrationLine(p: PlasmidRow): string {
  if (p.concentration == null) return '— ng/µL'
  return `${p.concentration.toFixed(1)} ng/µL`
}

export async function generateLabelsPdf(rows: PlasmidRow[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const labelsPerPage = COLS * ROWS_PER_PAGE
    const textW = LABEL_W - PAD * 2

    // Layout constants (from top of label content area):
    //   Line 1 (bold name):  y+PAD,        height 12pt
    //   Alias (2 lines):     y+PAD+12,     height 20pt  (7.5pt font × 2 lines)
    //   Bottom footer:       y+H-PAD-9     date (left) + concentration (right)
    const ALIAS_MAX_H = 20   // 2 lines × ~10pt
    const FOOTER_SIZE = 7
    const FOOTER_H = 9
    const footerFromTop = LABEL_H - PAD - FOOTER_H

    for (let pageStart = 0; pageStart < rows.length; pageStart += labelsPerPage) {
      doc.addPage()

      const pageRows = rows.slice(pageStart, pageStart + labelsPerPage)
      pageRows.forEach((p, idx) => {
        const col = idx % COLS
        const row = Math.floor(idx / COLS)

        const x = MARGIN_H + col * LABEL_W
        const y = MARGIN_V + row * LABEL_H

        // Clip to label bounds
        doc.save()
        doc.rect(x, y, LABEL_W, LABEL_H).clip()

        // Border
        doc.rect(x, y, LABEL_W, LABEL_H).strokeColor('#999999').lineWidth(0.5).stroke()

        const tx = x + PAD

        // Line 1 (bold): primary ID, e.g. "pJM0048"
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000')
        doc.text(p.name, tx, y + PAD, {
          width: textW,
          height: 11,
          ellipsis: true,
          lineBreak: false,
        })

        // Lines 2–3: alias / scientific name, up to 2 lines
        const aliasText = p.alias?.trim() ?? ''
        if (aliasText) {
          doc.font('Helvetica').fontSize(7.5).fillColor('#222222')
          doc.text(aliasText, tx, y + PAD + 12, {
            width: textW,
            height: ALIAS_MAX_H,
            ellipsis: true,
            lineBreak: true,
          })
        }

        // Footer line: date left-aligned, concentration right-aligned
        const dateLine = getDateLine(p)
        const concLine = getConcentrationLine(p)
        const footerY = y + footerFromTop

        doc.font('Helvetica').fontSize(FOOTER_SIZE).fillColor('#555555')

        if (dateLine) {
          doc.text(dateLine, tx, footerY, {
            width: textW,
            lineBreak: false,
            height: FOOTER_H,
          })
        }

        // Concentration: measure width and pin to right edge
        const concW = doc.widthOfString(concLine)
        doc.text(concLine, x + LABEL_W - PAD - concW, footerY, {
          lineBreak: false,
          height: FOOTER_H,
        })

        doc.restore()
      })
    }

    doc.end()
  })
}
