import 'dayjs/locale/de'
import 'dayjs/locale/en-gb'
import 'dayjs/locale/es'
import 'dayjs/locale/fr'
import 'dayjs/locale/nl'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { SettingsRow } from '@shared/types'

export const REGIONAL_LOCALE_OPTIONS = [
  { value: '', label: 'Auto (System Default)' },
  { value: 'de-DE', label: 'Deutsch (Deutschland)' },
  { value: 'en-GB', label: 'English (United Kingdom)' },
  { value: 'en-US', label: 'English (United States)' },
  { value: 'fr-FR', label: 'Français (France)' },
  { value: 'nl-NL', label: 'Nederlands (Nederland)' },
  { value: 'es-ES', label: 'Español (España)' },
]

function canonicalizeLocale(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null

  try {
    return Intl.getCanonicalLocales(trimmed)[0] ?? trimmed
  } catch {
    return null
  }
}

function systemLocale(): string {
  const locale = typeof navigator !== 'undefined' ? navigator.language : null
  return canonicalizeLocale(locale) ?? 'en-US'
}

function normalizeWeekday(day: number): number {
  return day % 7
}

export function resolveRegionalLocale(value: string | null | undefined): string {
  return canonicalizeLocale(value) ?? systemLocale()
}

export function getMantineDateLocale(value: string): string {
  const locale = resolveRegionalLocale(value).toLowerCase()
  if (locale.startsWith('de')) return 'de'
  if (locale.startsWith('en-gb')) return 'en-gb'
  if (locale.startsWith('en')) return 'en'
  if (locale.startsWith('fr')) return 'fr'
  if (locale.startsWith('nl')) return 'nl'
  if (locale.startsWith('es')) return 'es'
  return 'en'
}

export function getDateInputFormatForLocale(value: string): string {
  const locale = resolveRegionalLocale(value)
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
    .formatToParts(new Date(2006, 0, 2))
    .map((part) => {
      switch (part.type) {
        case 'day':
          return 'DD'
        case 'month':
          return 'MM'
        case 'year':
          return 'YYYY'
        default:
          return part.value
      }
    })
    .join('')
}

export function getDatesProviderSettings(value: string) {
  const locale = resolveRegionalLocale(value)
  const localeInfo = typeof Intl !== 'undefined' && 'Locale' in Intl
    ? new Intl.Locale(locale) as Intl.Locale & { weekInfo?: { firstDay?: number; weekend?: number[] } }
    : null

  const firstDayOfWeek = normalizeWeekday(
    localeInfo?.weekInfo?.firstDay ?? (locale.toLowerCase().endsWith('-us') ? 7 : 1)
  )
  const weekendDays = localeInfo?.weekInfo?.weekend?.map(normalizeWeekday) ?? [0, 6]

  return {
    locale: getMantineDateLocale(locale),
    firstDayOfWeek,
    weekendDays
  }
}

export function formatDateForLocale(value: Date | string | null | undefined, locale: string): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat(locale).format(new Date(value))
}

export function formatDateTimeForLocale(value: Date | string | null | undefined, locale: string): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function formatNumberForLocale(
  value: number | null | undefined,
  locale: string,
  options?: Intl.NumberFormatOptions
): string {
  if (value == null || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat(locale, options).format(value)
}

export function useRegionalFormatting() {
  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: () => window.api.settings.get()
  })

  const settings = data?.data as SettingsRow | undefined
  const locale = useMemo(() => resolveRegionalLocale(settings?.regionalLocale), [settings?.regionalLocale])
  const datesProviderSettings = useMemo(() => getDatesProviderSettings(locale), [locale])
  const dateInputFormat = useMemo(() => getDateInputFormatForLocale(locale), [locale])

  const collator = useMemo(
    () => new Intl.Collator(locale, { numeric: true, sensitivity: 'base' }),
    [locale]
  )
  const decimalSeparator = useMemo(
    () => new Intl.NumberFormat(locale).formatToParts(1.1).find((part) => part.type === 'decimal')?.value ?? '.',
    [locale]
  )
  const groupSeparator = useMemo(
    () => new Intl.NumberFormat(locale).formatToParts(1000).find((part) => part.type === 'group')?.value ?? ',',
    [locale]
  )

  return {
    locale,
    mantineDateLocale: datesProviderSettings.locale,
    dateInputFormat,
    datesProviderSettings,
    regionalLocaleSetting: settings?.regionalLocale ?? null,
    collator,
    decimalSeparator,
    groupSeparator,
    formatDate: (value: Date | string | null | undefined) => formatDateForLocale(value, locale),
    formatDateTime: (value: Date | string | null | undefined) => formatDateTimeForLocale(value, locale),
    formatInteger: (value: number | null | undefined) => formatNumberForLocale(value, locale),
    formatNumber: (value: number | null | undefined, options?: Intl.NumberFormatOptions) =>
      formatNumberForLocale(value, locale, options)
  }
}
