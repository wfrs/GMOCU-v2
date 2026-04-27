import { AppShell, Box, Text, Stack, useMantineColorScheme, useMantineTheme, Divider } from '@mantine/core'
import {
  IconDna,
  IconFlask,
  IconMicroscope,
  IconAtom,
  IconSeedling,
  IconSettings,
  IconTerminal2
} from '@tabler/icons-react'
import type { Icon as TablerIcon } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { useUIStore } from '@renderer/store/ui'
import { PlasmidsPage } from '@renderer/pages/Plasmids'
import { OrganismsPage } from '@renderer/pages/Organisms'
import { FeaturesPage } from '@renderer/pages/Features'
import { GMOsPage } from '@renderer/pages/GMOs'
import { SeedsPage } from '@renderer/pages/Seeds'
import { SettingsPage } from '@renderer/pages/Settings'
import { DevLogsPage } from '@renderer/pages/DevLogs'
import { isMac } from '@renderer/lib/platform'

type Page = 'plasmids' | 'organisms' | 'features' | 'gmos' | 'seeds' | 'settings' | 'dev'

interface NavItemDef {
  id: Page
  label: string
  icon: TablerIcon
}

const NAV_MAIN: NavItemDef[] = [
  { id: 'plasmids',  label: 'Plasmids',  icon: IconDna        },
  { id: 'gmos',      label: 'GMOs',      icon: IconFlask      },
  { id: 'seeds',     label: 'Seeds',     icon: IconSeedling   },
]

const NAV_GLOSSARY: NavItemDef[] = [
  { id: 'organisms', label: 'Organisms', icon: IconMicroscope },
  { id: 'features',  label: 'Features',  icon: IconAtom       },
]

const NAV_BOTTOM: NavItemDef[] = [
  { id: 'settings',  label: 'Settings',  icon: IconSettings   },
  ...(import.meta.env.DEV ? [{ id: 'dev' as Page, label: 'Dev Logs', icon: IconTerminal2 }] : []),
]


function NavItem({
  item,
  active,
  count,
  onClick
}: {
  item: NavItemDef
  active: boolean
  count?: number
  onClick: () => void
}) {
  const { colorScheme } = useMantineColorScheme()
  const theme = useMantineTheme()
  const isDark = colorScheme === 'dark'

  const accentScale = theme.colors[theme.primaryColor] ?? theme.colors.teal
  const activeBg = isDark ? `${accentScale[6]}2a` : `${accentScale[6]}18`
  const activeColor = isDark ? accentScale[3] : accentScale[7]
  const inactiveColor = isDark ? theme.colors.dark[1] : theme.colors.gray[7]
  const hoverBg = isDark ? theme.colors.dark[5] : 'rgba(0,0,0,0.04)'

  const IconComponent = item.icon

  return (
    <Box
      component="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '6px 10px',
        borderRadius: 6,
        border: 'none',
        cursor: 'default',
        backgroundColor: active ? activeBg : 'transparent',
        color: active ? activeColor : inactiveColor,
        transition: 'background-color 0.1s',
        textAlign: 'left',
        userSelect: 'none'
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = hoverBg
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
      }}
    >
      <IconComponent
        size={15}
        aria-hidden="true"
        style={{ opacity: active ? 1 : 0.6, flexShrink: 0 }}
      />
      <Text
        component="span"
        size="sm"
        fw={active ? 500 : 400}
        style={{ lineHeight: 1, flex: 1 }}
      >
        {item.label}
      </Text>
      {count !== undefined && (
        <Text
          component="span"
          size="xs"
          style={{ lineHeight: 1, opacity: 0.5, fontSize: '0.7rem' }}
        >
          {count}
        </Text>
      )}
    </Box>
  )
}

function NavSection({ items, activePage, counts, onNavigate }: {
  items: NavItemDef[]
  activePage: Page
  counts?: Partial<Record<Page, number>>
  onNavigate: (page: Page) => void
}) {
  return (
    <>
      {items.map((item) => (
        <NavItem
          key={item.id}
          item={item}
          active={activePage === item.id}
          count={counts?.[item.id]}
          onClick={() => onNavigate(item.id)}
        />
      ))}
    </>
  )
}

export function JLabShell() {
  const { activePage, setActivePage } = useUIStore()
  const { colorScheme } = useMantineColorScheme()
  const theme = useMantineTheme()

  const { data: plasmidListResp } = useQuery({
    queryKey: ['plasmids'],
    queryFn: () => window.api.plasmids.list()
  })
  const plasmidCount = Array.isArray(plasmidListResp?.data)
    ? (plasmidListResp.data as unknown[]).length
    : undefined

  const isDark = colorScheme === 'dark'
  const sidebarBg = isDark ? theme.colors.dark[8] : '#f2f2f7'
  const borderColor = isDark ? theme.colors.dark[6] : 'rgba(0,0,0,0.1)'
  const contentBg = isDark ? theme.colors.dark[9] : '#ffffff'

  const renderPage = () => {
    switch (activePage) {
      case 'plasmids':  return <PlasmidsPage />
      case 'organisms': return <OrganismsPage />
      case 'features':  return <FeaturesPage />
      case 'gmos':      return <GMOsPage />
      case 'seeds':     return <SeedsPage />
      case 'settings':  return <SettingsPage />
      case 'dev':       return <DevLogsPage />
    }
  }

  const counts: Partial<Record<Page, number>> = {
    plasmids: plasmidCount
  }

  return (
    <AppShell navbar={{ width: 200, breakpoint: 'xs' }} padding={0}>
      <AppShell.Navbar
        style={{
          backgroundColor: sidebarBg,
          borderRight: `1px solid ${borderColor}`,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Traffic light drag region — macOS only */}
        {isMac && (
          <Box
            h={52}
            style={{ flexShrink: 0, WebkitAppRegion: 'drag' } as React.CSSProperties}
          />
        )}

        {/* App wordmark */}
        <Box px={14} pb={12} pt={isMac ? 0 : 14} style={{ flexShrink: 0 }}>
          <Text fw={600} size="sm" c={isDark ? `${theme.primaryColor}.4` : `${theme.primaryColor}.7`} style={{ letterSpacing: '0.04em' }}>
            J·LAB
          </Text>
          <Text size="xs" c="dimmed" style={{ fontSize: '0.65rem', letterSpacing: '0.04em', marginTop: 1 }}>
            JORES LAB v0.1
          </Text>
        </Box>

        {/* Main nav */}
        <Stack gap={2} px={8} style={{ flex: 1 }}>
          <NavSection items={NAV_MAIN} activePage={activePage} counts={counts} onNavigate={setActivePage} />

          <Divider my={6} color={borderColor} />

          <Text size="xs" c="dimmed" px={10} pb={2} style={{ fontSize: '0.6rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Glossaries
          </Text>
          <NavSection items={NAV_GLOSSARY} activePage={activePage} onNavigate={setActivePage} />
        </Stack>

        {/* Bottom nav (settings, dev) */}
        <Stack gap={2} px={8} pb={10} style={{ flexShrink: 0 }}>
          <Divider mb={6} color={borderColor} />
          <NavSection items={NAV_BOTTOM} activePage={activePage} onNavigate={setActivePage} />
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main style={{ backgroundColor: contentBg, position: 'relative' }}>
        {/* Invisible drag strip across the top of the main content (window move) */}
        <Box
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 32,
            WebkitAppRegion: 'drag',
            zIndex: 0,
          } as React.CSSProperties}
        />
        <Box p="xl" mih="100vh" style={{ position: 'relative', zIndex: 1 }}>
          {renderPage()}
        </Box>
      </AppShell.Main>
    </AppShell>
  )
}
