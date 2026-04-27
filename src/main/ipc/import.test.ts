import { describe, it, expect } from 'vitest'
import { parseDate, mimeFromFilename } from './import'

describe('parseDate', () => {
  it('returns null for null input', () => {
    expect(parseDate(null)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseDate('')).toBeNull()
  })

  it('parses ISO date string', () => {
    const result = parseDate('2024-03-15')
    expect(result).toBeInstanceOf(Date)
    expect(result!.getFullYear()).toBe(2024)
    expect(result!.getMonth()).toBe(2) // 0-indexed
    expect(result!.getDate()).toBe(15)
  })

  it('parses ISO datetime string', () => {
    const result = parseDate('2024-06-01T12:00:00.000Z')
    expect(result).toBeInstanceOf(Date)
    expect(result!.getFullYear()).toBe(2024)
  })

  it('returns null for invalid date string', () => {
    expect(parseDate('not-a-date')).toBeNull()
  })

  it('returns null for "Invalid Date" equivalent', () => {
    expect(parseDate('99-99-9999')).toBeNull()
  })

  it('parses legacy date format DD.MM.YYYY', () => {
    // JS Date doesn't parse DD.MM.YYYY, so result should be null
    expect(parseDate('15.03.2024')).toBeNull()
  })
})

describe('mimeFromFilename', () => {
  it('returns application/pdf for .pdf', () => {
    expect(mimeFromFilename('report.pdf')).toBe('application/pdf')
  })

  it('returns image/png for .png', () => {
    expect(mimeFromFilename('image.png')).toBe('image/png')
  })

  it('returns image/jpeg for .jpg', () => {
    expect(mimeFromFilename('photo.jpg')).toBe('image/jpeg')
  })

  it('returns image/jpeg for .jpeg', () => {
    expect(mimeFromFilename('photo.jpeg')).toBe('image/jpeg')
  })

  it('returns text/plain for .gb', () => {
    expect(mimeFromFilename('plasmid.gb')).toBe('text/plain')
  })

  it('returns text/plain for .gbk', () => {
    expect(mimeFromFilename('plasmid.gbk')).toBe('text/plain')
  })

  it('returns text/plain for .genbank', () => {
    expect(mimeFromFilename('plasmid.genbank')).toBe('text/plain')
  })

  it('returns text/plain for .fastq', () => {
    expect(mimeFromFilename('reads.fastq')).toBe('text/plain')
  })

  it('returns text/plain for .fq', () => {
    expect(mimeFromFilename('reads.fq')).toBe('text/plain')
  })

  it('returns text/plain for .txt', () => {
    expect(mimeFromFilename('notes.txt')).toBe('text/plain')
  })

  it('returns application/octet-stream for unknown extension', () => {
    expect(mimeFromFilename('data.xyz')).toBe('application/octet-stream')
  })

  it('returns application/octet-stream for no extension', () => {
    expect(mimeFromFilename('noextension')).toBe('application/octet-stream')
  })

  it('handles uppercase extensions', () => {
    // Extension is lowercased via .toLowerCase()
    expect(mimeFromFilename('REPORT.PDF')).toBe('application/pdf')
  })

  it('handles filenames with multiple dots', () => {
    expect(mimeFromFilename('my.plasmid.v2.gb')).toBe('text/plain')
  })
})
