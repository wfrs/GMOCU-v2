import '@fontsource-variable/inter'
import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import { MantineProvider, createTheme, ColorSchemeScript } from '@mantine/core'
import { DatesProvider } from '@mantine/dates'
import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { queryClient } from './lib/query'
import { JLabShell } from './components/AppShell'
import { ACCENT_COLORS, DEFAULT_ACCENT, buildCustomColors } from './lib/accent-colors'
import type { SettingsRow } from '@shared/types'
import { getDatesProviderSettings, resolveRegionalLocale } from './lib/regional-format'

const customColors = buildCustomColors()

function JLabTheme({ children }: { children: React.ReactNode }) {
  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: () => window.api.settings.get()
  })

  const s = data?.data as SettingsRow | undefined
  const regionalLocale = resolveRegionalLocale(s?.regionalLocale)
  const datesProviderSettings = useMemo(() => getDatesProviderSettings(regionalLocale), [regionalLocale])

  useEffect(() => {
    document.documentElement.style.fontSize = `${s?.fontSize ?? 14}px`
  }, [s?.fontSize])
  useEffect(() => {
    document.documentElement.lang = regionalLocale
  }, [regionalLocale])

  const accentId = s?.accentColor ?? DEFAULT_ACCENT
  const validAccent = ACCENT_COLORS.some((c) => c.id === accentId) ? accentId : DEFAULT_ACCENT

  const theme = useMemo(
    () =>
      createTheme({
        fontFamily: '"Inter Variable", "Inter", sans-serif',
        fontFamilyMonospace: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        primaryColor: validAccent,
        primaryShade: { light: 6, dark: 4 },
        defaultRadius: 'sm',
        colors: customColors,
        components: {
          TextInput: { defaultProps: { size: 'sm' } },
          Select: { defaultProps: { size: 'sm' } },
          NumberInput: { defaultProps: { size: 'sm' } },
          Button: { defaultProps: { size: 'sm' } }
        }
      }),
    [validAccent]
  )

  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <DatesProvider settings={datesProviderSettings}>{children}</DatesProvider>
    </MantineProvider>
  )
}

export default function App() {
  return (
    <>
      <ColorSchemeScript defaultColorScheme="dark" />
      <QueryClientProvider client={queryClient}>
        <JLabTheme>
          <JLabShell />
        </JLabTheme>
      </QueryClientProvider>
    </>
  )
}
