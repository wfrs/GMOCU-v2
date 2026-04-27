import type { MantineColorsTuple } from '@mantine/core'

export interface AccentColor {
  id: string
  label: string
  swatch: string
  scale?: MantineColorsTuple // undefined = use Mantine built-in
}

export const ACCENT_COLORS: AccentColor[] = [
  {
    id: 'teal',
    label: 'Teal',
    swatch: '#20C997'
    // Mantine built-in
  },
  {
    id: 'sky',
    label: 'Sky',
    swatch: '#099CFF',
    scale: ['#e1f8ff', '#cbedff', '#9ad7ff', '#64c1ff', '#3aaefe', '#20a2fe', '#099cff', '#0088e4', '#0079cd', '#0068b6']
  },
  {
    id: 'indigo',
    label: 'Indigo',
    swatch: '#5C7CFA'
    // Mantine built-in
  },
  {
    id: 'purple',
    label: 'Purple',
    swatch: '#8931B2',
    scale: ['#faedff', '#edd9f7', '#d8b1ea', '#c186dd', '#ae62d2', '#a34bcb', '#9d3fc9', '#8931b2', '#7a2aa0', '#6b218d']
  },
  {
    id: 'rose',
    label: 'Rose',
    swatch: '#F01879',
    scale: ['#ffe9f6', '#ffd1e6', '#faa1c9', '#f66eab', '#f24391', '#f02981', '#f01879', '#d60867', '#c0005c', '#a9004f']
  },
  {
    id: 'crimson',
    label: 'Crimson',
    swatch: '#C91A25',
    scale: ['#ffeaec', '#fcd4d7', '#f4a7ac', '#ec777e', '#e64f57', '#e3353f', '#e22732', '#c91a25', '#b41220', '#9e0419']
  },
  {
    id: 'orange',
    label: 'Orange',
    swatch: '#F06418',
    scale: ['#fff0e4', '#ffe0cf', '#fac0a1', '#f69e6e', '#f28043', '#f06e27', '#f06418', '#d6530c', '#bf4906', '#a73c00']
  },
  {
    id: 'lime',
    label: 'Lime',
    swatch: '#6BD731',
    scale: ['#effde7', '#e1f8d4', '#c3efab', '#a2e67e', '#87de58', '#75d93f', '#6bd731', '#59be23', '#4da91b', '#3d920d']
  },
  {
    id: 'coffee',
    label: 'Coffee',
    swatch: '#5D4037',
    scale: ['#f7f3f2', '#e8e6e5', '#d2c9c6', '#bdaaa4', '#ab9087', '#a17f74', '#9d766a', '#896459', '#7b594e', '#5d4037']
  }
]

export const DEFAULT_ACCENT = 'teal'

/** Build the custom colors object to pass into Mantine createTheme */
export function buildCustomColors(): Record<string, MantineColorsTuple> {
  const out: Record<string, MantineColorsTuple> = {}
  for (const c of ACCENT_COLORS) {
    if (c.scale) out[c.id] = c.scale
  }
  return out
}
