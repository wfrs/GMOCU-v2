import {
  ActionIcon,
  Box,
  Button,
  Checkbox,
  ColorInput,
  Group,
  MultiSelect,
  Select,
  Slider,
  Stack,
  Switch,
  Text,
  TextInput,
  useMantineColorScheme,
  useMantineTheme
} from '@mantine/core'
import {
  IconMoonStars,
  IconSun,
  IconUser,
  IconShieldCheck,
  IconPalette,
  IconCloud,
  IconFileImport,
  IconInfoCircle,
  IconBug,
  IconTag,
  IconSettings2,
  IconTrash,
  IconPlus,
  type Icon as TablerIcon
} from '@tabler/icons-react'
import { useForm } from '@mantine/form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import type { UpdateSettings } from '@shared/ipc-schemas'
import type { CategoryRow, OrganismRow, SelectionValueRow } from '@shared/types'
import { isWindows } from '@renderer/lib/platform'
import { ACCENT_COLORS } from '@renderer/lib/accent-colors'
import { REGIONAL_LOCALE_OPTIONS, resolveRegionalLocale } from '@renderer/lib/regional-format'

type Section = 'identity' | 'compliance' | 'categories' | 'workflow' | 'appearance' | 'cloud' | 'import' | 'about' | 'dev'

const SECTIONS: { id: Section; label: string; icon: TablerIcon }[] = [
  { id: 'identity',   label: 'Identity',   icon: IconUser         },
  { id: 'compliance', label: 'Compliance', icon: IconShieldCheck  },
  { id: 'categories', label: 'Categories', icon: IconTag          },
  { id: 'workflow',   label: 'Workflow',   icon: IconSettings2    },
  { id: 'appearance', label: 'Appearance', icon: IconPalette      },
  { id: 'cloud',      label: 'Cloud Sync', icon: IconCloud        },
  { id: 'import',     label: 'Import',     icon: IconFileImport   },
  { id: 'about',      label: 'About',      icon: IconInfoCircle   },
  ...(import.meta.env.DEV ? [{ id: 'dev' as Section, label: 'Dev', icon: IconBug }] : []),
]

function SectionNav({ active, onChange }: { active: Section; onChange: (s: Section) => void }) {
  const { colorScheme } = useMantineColorScheme()
  const theme = useMantineTheme()
  const isDark = colorScheme === 'dark'
  const accentScale = theme.colors[theme.primaryColor] ?? theme.colors.teal
  const activeBg = isDark ? `${accentScale[6]}2a` : `${accentScale[6]}18`
  const activeColor = isDark ? accentScale[3] : accentScale[7]

  return (
    <Stack gap={4} w={160} style={{ flexShrink: 0 }}>
      {SECTIONS.map((s) => {
        const isActive = s.id === active
        const IconComp = s.icon
        return (
          <Box
            key={s.id}
            component="button"
            onClick={() => onChange(s.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '9px 10px', borderRadius: 7, border: 'none', cursor: 'default',
              backgroundColor: isActive ? activeBg : 'transparent', textAlign: 'left',
              userSelect: 'none', color: isActive ? activeColor : undefined
            }}
          >
            <IconComp size={15} aria-hidden="true" style={{ opacity: isActive ? 1 : 0.55, flexShrink: 0 }} />
            <Text component="span" size="sm" fw={isActive ? 500 : 400} style={{ color: 'inherit' }}>
              {s.label}
            </Text>
          </Box>
        )
      })}
    </Stack>
  )
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  const { colorScheme } = useMantineColorScheme()
  const theme = useMantineTheme()
  const isDark = colorScheme === 'dark'
  return (
    <Box style={{ backgroundColor: isDark ? theme.colors.dark[6] : '#ffffff', borderRadius: 10, overflow: 'hidden' }}>
      {children}
    </Box>
  )
}

function SettingsRow({ label, description, control, last = false }: {
  label: string; description?: string; control: React.ReactNode; last?: boolean
}) {
  const { colorScheme } = useMantineColorScheme()
  const theme = useMantineTheme()
  const isDark = colorScheme === 'dark'
  return (
    <Box>
      <Group justify="space-between" align="center" px={14} style={{ minHeight: 48, gap: 16 }}>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" style={{ lineHeight: 1.3 }}>{label}</Text>
          {description && <Text size="xs" c="dimmed" style={{ lineHeight: 1.3, marginTop: 2 }}>{description}</Text>}
        </Box>
        <Box style={{ flexShrink: 0 }}>{control}</Box>
      </Group>
      {!last && <Box ml={14} style={{ height: 1, backgroundColor: isDark ? theme.colors.dark[4] : 'rgba(0,0,0,0.06)' }} />}
    </Box>
  )
}

function InfoRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  const { colorScheme } = useMantineColorScheme()
  const theme = useMantineTheme()
  const isDark = colorScheme === 'dark'
  return (
    <Box>
      <Group justify="space-between" align="center" px={14} style={{ minHeight: 44 }}>
        <Text size="sm">{label}</Text>
        <Text size="sm" c="dimmed">{value}</Text>
      </Group>
      {!last && <Box ml={14} style={{ height: 1, backgroundColor: isDark ? theme.colors.dark[4] : 'rgba(0,0,0,0.06)' }} />}
    </Box>
  )
}

function parseJsonStringArray(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function stringifyStringArray(values: string[]): string | null {
  const cleaned = [...new Set(values.map((value) => value.trim()).filter(Boolean))]
  return cleaned.length > 0 ? JSON.stringify(cleaned) : null
}

// ─── Categories section ───────────────────────────────────────────────────────

function CategoriesSection() {
  const qc = useQueryClient()
  const theme = useMantineTheme()
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  const [newName, setNewName] = useState('')

  const { data: resp } = useQuery({
    queryKey: ['categories'],
    queryFn: () => window.api.categories.list()
  })
  const categories = (resp?.data ?? []) as CategoryRow[]

  const { mutate: createCat, isPending: creating } = useMutation({
    mutationFn: (name: string) => window.api.categories.create({ name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setNewName('') }
  })

  const { mutate: deleteCat } = useMutation({
    mutationFn: (id: number) => window.api.categories.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] })
  })

  const handleAdd = () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    createCat(trimmed)
  }

  return (
    <Stack gap={10}>
      <Text size="sm" fw={600} px={4}>Categories</Text>
      <SettingsCard>
        <Box px={14} py={14}>
          <Text size="xs" c="dimmed" mb={12} style={{ lineHeight: 1.5 }}>
            User-defined plasmid categories (e.g. &quot;Entry vector&quot;, &quot;CDS&quot;, &quot;Terminator&quot;).
            Used in the plasmid table and detail panel.
          </Text>
          <Stack gap={6} mb={12}>
            {categories.length === 0 && (
              <Text size="xs" c="dimmed" ta="center" py={8}>No categories yet</Text>
            )}
            {categories.map((cat) => (
              <Group key={cat.id} gap={8} justify="space-between"
                style={{
                  padding: '6px 10px', borderRadius: 6,
                  backgroundColor: isDark ? theme.colors.dark[5] : theme.colors.gray[0]
                }}
              >
                <Text size="sm">{cat.name}</Text>
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  color="gray"
                  aria-label={`Delete ${cat.name}`}
                  onClick={() => deleteCat(cat.id)}
                >
                  <IconTrash size={12} />
                </ActionIcon>
              </Group>
            ))}
          </Stack>
          <Group gap={8}>
            <TextInput
              size="xs"
              placeholder="New category name…"
              value={newName}
              onChange={(e) => setNewName(e.currentTarget.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
              style={{ flex: 1 }}
            />
            <ActionIcon
              size="sm"
              variant="filled"
              aria-label="Add category"
              loading={creating}
              disabled={!newName.trim()}
              onClick={handleAdd}
            >
              <IconPlus size={14} />
            </ActionIcon>
          </Group>
        </Box>
      </SettingsCard>
    </Stack>
  )
}

// ─── Status colours (in appearance) ──────────────────────────────────────────

function StatusColours() {
  const qc = useQueryClient()
  const { data: resp } = useQuery({
    queryKey: ['selectionValues'],
    queryFn: () => window.api.selectionValues.list()
  })
  const statuses = (resp?.data ?? []) as SelectionValueRow[]

  const { mutate: updateSv } = useMutation({
    mutationFn: ({ id, colour }: { id: number; colour: string | null }) =>
      window.api.selectionValues.update(id, { colour }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['selectionValues'] })
  })

  if (!statuses.length) return null

  return (
    <SettingsCard>
      <Box px={14} py={14}>
        <Text size="sm" mb={12} fw={500}>Status colours</Text>
        <Stack gap={8}>
          {statuses.map((sv) => (
            <Group key={sv.id} justify="space-between" align="center">
              <Text size="sm">{sv.label}</Text>
              <ColorInput
                size="xs"
                w={140}
                format="hex"
                swatches={['#868e96', '#fab005', '#40c057', '#fa5252', '#495057', '#228be6', '#ae3ec9']}
                value={sv.colour ?? ''}
                onChange={(colour) => updateSv({ id: sv.id, colour: colour || null })}
                styles={{ input: { fontFamily: 'monospace', fontSize: '0.75rem' } }}
              />
            </Group>
          ))}
        </Stack>
      </Box>
    </SettingsCard>
  )
}

// ─── Dev section ──────────────────────────────────────────────────────────────

type ImportResult = NonNullable<Awaited<ReturnType<typeof window.api.importData.legacyGmocu>>['data']>

function DevSection() {
  const qc = useQueryClient()
  const { colorScheme } = useMantineColorScheme()
  const theme = useMantineTheme()
  const isDark = colorScheme === 'dark'
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [backupPath, setBackupPath] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  const reset = async () => {
    setState('running'); setBackupPath(null); setError(null)
    try {
      const resp = await window.api.dev.resetDb()
      if (!resp.success) { setState('error'); setError(resp.error ?? 'Unknown error'); return }
      setBackupPath(resp.data ?? null); setState('done'); setConfirmed(false); qc.invalidateQueries()
    } catch (e) { setState('error'); setError(String(e)) }
  }

  return (
    <Stack gap={10}>
      <Text size="sm" fw={600} px={4}>Dev</Text>
      <SettingsCard>
        <Box px={14} py={16}>
          <Text size="sm" fw={500} mb={4}>Reset database</Text>
          <Text size="xs" c="dimmed" mb={14} style={{ lineHeight: 1.5 }}>
            Backs up <code>dev.db</code> to a timestamped file, then wipes all data and resets settings.
          </Text>
          <Checkbox size="xs" mb={12} label="Yes, I want to wipe all data" checked={confirmed} onChange={(e) => setConfirmed(e.currentTarget.checked)} />
          <Button size="xs" color="red" disabled={!confirmed} loading={state === 'running'} onClick={reset}>
            Dump &amp; Reset database
          </Button>
          {state === 'done' && backupPath && (
            <Box mt={12} style={{ borderRadius: 6, backgroundColor: isDark ? theme.colors.dark[5] : theme.colors.gray[0], padding: '10px 12px' }}>
              <Text size="xs" fw={600} mb={4} c={isDark ? 'teal.3' : 'teal.7'}>Done — database reset</Text>
              <Text size="xs" c="dimmed" style={{ wordBreak: 'break-all' }}>Backup: {backupPath}</Text>
            </Box>
          )}
          {state === 'error' && (
            <Box mt={12} style={{ borderRadius: 6, backgroundColor: isDark ? theme.colors.red[9] + '33' : theme.colors.red[0], padding: '10px 12px' }}>
              <Text size="xs" c="red">{error}</Text>
            </Box>
          )}
        </Box>
      </SettingsCard>
    </Stack>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const qc = useQueryClient()
  const { setColorScheme, colorScheme } = useMantineColorScheme()
  const theme = useMantineTheme()
  const isDark = colorScheme === 'dark'
  const [activeSection, setActiveSection] = useState<Section>('identity')
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [importState, setImportState] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [backupBeforeImport, setBackupBeforeImport] = useState(true)

  const { data: response } = useQuery({
    queryKey: ['settings'],
    queryFn: () => window.api.settings.get()
  })
  const { data: orgsResp } = useQuery({
    queryKey: ['organisms'],
    queryFn: () => window.api.organisms.list()
  })

  const s = response?.data as import('@shared/types').SettingsRow | undefined
  const organisms = (orgsResp?.data ?? []) as OrganismRow[]
  const organismOptions = organisms.map((organism) => ({
    value: organism.shortName ?? organism.name,
    label: organism.shortName ? `${organism.name} · ${organism.shortName}` : organism.name
  }))
  const organismValueOptions = organismOptions.map((option) => ({
    value: option.value,
    label: option.label
  }))

  const form = useForm<UpdateSettings>({
    initialValues: {
      userName: '', userInitials: '', institution: '',
      institutionAz: '', institutionAnlage: '',
      theme: 'light', regionalLocale: null, fontSize: 14,
      cloudProvider: null, cloudPath: null, accentColor: 'teal',
      aliasFormat: null,
      autoCreateGmoEnabled: false, autoCreateGmoOrganism: null, autoCreateGmoStrain: null,
      favouriteOrganisms: null, targetOrganisms: null
    }
  })

  useEffect(() => {
    if (s) {
      form.setValues({
        userName: s.userName ?? '',
        userInitials: s.userInitials ?? '',
        institution: s.institution ?? '',
        institutionAz: s.institutionAz ?? '',
        institutionAnlage: s.institutionAnlage ?? '',
        theme: (s.theme as 'light' | 'dark') ?? 'light',
        regionalLocale: s.regionalLocale ?? null,
        fontSize: s.fontSize ?? 14,
        cloudProvider: s.cloudProvider as 'sciebo' | 'google_drive' | null | undefined,
        cloudPath: s.cloudPath ?? null,
        accentColor: s.accentColor ?? 'teal',
        aliasFormat: s.aliasFormat ?? null,
        autoCreateGmoEnabled: s.autoCreateGmoEnabled ?? false,
        autoCreateGmoOrganism: s.autoCreateGmoOrganism ?? null,
        autoCreateGmoStrain: s.autoCreateGmoStrain ?? null,
        favouriteOrganisms: s.favouriteOrganisms ?? null,
        targetOrganisms: s.targetOrganisms ?? null
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s])

  const { mutate } = useMutation({
    mutationFn: (values: UpdateSettings) => window.api.settings.update(values),
    onSuccess: (resp) => {
      if (resp.success && resp.data) setColorScheme((resp.data.theme as 'light' | 'dark') ?? 'light')
      qc.invalidateQueries({ queryKey: ['settings'] })
      if (savedTimer.current) clearTimeout(savedTimer.current)
      setSavedAt(Date.now())
      savedTimer.current = setTimeout(() => setSavedAt(null), 2000)
    }
  })

  const saveOnBlur = () => mutate(form.values)
  const saveWith = (patch: Partial<UpdateSettings>) => {
    const next = { ...form.values, ...patch }
    form.setValues(next)
    mutate(next)
  }

  const pageBg = isDark ? theme.colors.dark[8] : '#f2f2f7'

  const renderSection = () => {
    switch (activeSection) {
      case 'identity':
        return (
          <Stack gap={10}>
            <Text size="sm" fw={600} px={4}>Identity</Text>
            <SettingsCard>
              <SettingsRow label="Full name" control={
                <TextInput w={200} variant="filled" autoComplete="name" aria-label="Full name"
                  {...form.getInputProps('userName')} onBlur={saveOnBlur}
                  styles={{ input: { textAlign: 'right' } }} />
              } />
              <SettingsRow label="Initials" description="Up to 5 characters — used as plasmid creator prefix" control={
                <TextInput w={80} variant="filled" maxLength={5} autoComplete="off" aria-label="Initials"
                  {...form.getInputProps('userInitials')} onBlur={saveOnBlur}
                  styles={{ input: { textAlign: 'center', letterSpacing: '0.08em', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' } }} />
              } />
              <SettingsRow label="Institution" last control={
                <TextInput w={200} variant="filled" autoComplete="organization" aria-label="Institution"
                  {...form.getInputProps('institution')} onBlur={saveOnBlur}
                  styles={{ input: { textAlign: 'right' } }} />
              } />
            </SettingsCard>
          </Stack>
        )

      case 'compliance':
        return (
          <Stack gap={10}>
            <Text size="sm" fw={600} px={4}>Compliance</Text>
            <SettingsCard>
              <SettingsRow label="Aktenzeichen" description="File reference number (GenTAufzV §6)" control={
                <TextInput w={180} variant="filled" autoComplete="off" placeholder="e.g. AZ-2024-001" aria-label="Aktenzeichen"
                  {...form.getInputProps('institutionAz')} onBlur={saveOnBlur}
                  styles={{ input: { textAlign: 'right', fontFamily: 'monospace', fontSize: '0.8rem' } }} />
              } />
              <SettingsRow label="Anlage-Nr." description="Annex number on the Formblatt-Z" last control={
                <TextInput w={120} variant="filled" autoComplete="off" placeholder="e.g. 3" aria-label="Anlage-Nummer"
                  {...form.getInputProps('institutionAnlage')} onBlur={saveOnBlur}
                  styles={{ input: { textAlign: 'right', fontFamily: 'monospace', fontSize: '0.8rem' } }} />
              } />
            </SettingsCard>
            <Text size="xs" c="dimmed" px={4}>
              These fields are required for generating the German Formblatt-Z compliance report under GenTAufzV.
            </Text>
          </Stack>
        )

      case 'categories':
        return <CategoriesSection />

      case 'workflow':
        return (
          <Stack gap={10}>
            <Text size="sm" fw={600} px={4}>Workflow</Text>

            <SettingsCard>
              <SettingsRow
                label="Alias format"
                description='Template for auto-generated aliases. Use {initials} and {id}. Example: "{initials}{id:04d}" → "CJM0042"'
                control={
                  <TextInput
                    w={180}
                    variant="filled"
                    autoComplete="off"
                    placeholder="{initials}{id:04d}"
                    value={form.values.aliasFormat ?? ''}
                    onChange={(e) => form.setFieldValue('aliasFormat', e.currentTarget.value || null)}
                    onBlur={saveOnBlur}
                    styles={{ input: { fontFamily: 'monospace', fontSize: '0.8rem' } }}
                  />
                }
              />
              <SettingsRow
                label="Auto-create E. coli GMO"
                description="Automatically add an E. coli GMO entry when a new plasmid is created"
                last
                control={
                  <Switch
                    checked={form.values.autoCreateGmoEnabled ?? false}
                    onChange={(e) => saveWith({ autoCreateGmoEnabled: e.currentTarget.checked })}
                    aria-label="Auto-create GMO"
                  />
                }
              />
            </SettingsCard>

            {form.values.autoCreateGmoEnabled && (
              <SettingsCard>
                <SettingsRow
                  label="Default organism"
                  description="Host organism used for the auto-created GMO entry"
                  control={
                    <Select
                      w={260}
                      variant="filled"
                      searchable
                      clearable
                      placeholder={organismOptions.length ? 'Select organism…' : 'Add organisms first'}
                      data={organismValueOptions}
                      value={form.values.autoCreateGmoOrganism ?? null}
                      onChange={(value) => saveWith({ autoCreateGmoOrganism: value ?? null })}
                      comboboxProps={{ withinPortal: true }}
                      nothingFoundMessage="No organisms found"
                      styles={{ input: { fontFamily: 'monospace', fontSize: '0.8rem' } }}
                    />
                  }
                />
                <SettingsRow
                  label="Default strain"
                  description="Strain for auto-created GMO entries"
                  last
                  control={
                    <TextInput
                      w={160}
                      variant="filled"
                      autoComplete="off"
                      placeholder="e.g. TOP10"
                      value={form.values.autoCreateGmoStrain ?? ''}
                      onChange={(e) => form.setFieldValue('autoCreateGmoStrain', e.currentTarget.value || null)}
                      onBlur={saveOnBlur}
                      styles={{ input: { fontFamily: 'monospace', fontSize: '0.8rem' } }}
                    />
                  }
                />
              </SettingsCard>
            )}

            <SettingsCard>
              <SettingsRow
                label="Favourite organisms"
                description="Used by the plasmid GMO section to batch-add your common host organisms"
                control={
                  <MultiSelect
                    w={300}
                    searchable
                    clearable
                    hidePickedOptions
                    placeholder={organismOptions.length ? 'Select favourites…' : 'Add organisms first'}
                    data={organismValueOptions}
                    value={parseJsonStringArray(form.values.favouriteOrganisms)}
                    onChange={(value) => saveWith({ favouriteOrganisms: stringifyStringArray(value) })}
                    nothingFoundMessage="No organisms found"
                  />
                }
              />
              <SettingsRow
                label="Target organisms"
                description="Used for the default GMO reporting target set in later compliance workflows"
                last
                control={
                  <MultiSelect
                    w={300}
                    searchable
                    clearable
                    hidePickedOptions
                    placeholder={organismOptions.length ? 'Select targets…' : 'Add organisms first'}
                    data={organismValueOptions}
                    value={parseJsonStringArray(form.values.targetOrganisms)}
                    onChange={(value) => saveWith({ targetOrganisms: stringifyStringArray(value) })}
                    nothingFoundMessage="No organisms found"
                  />
                }
              />
            </SettingsCard>

            <Text size="xs" c="dimmed" px={4}>
              Workflow settings affect how new records are created. Auto-create GMO adds a GMO entry
              with the configured organism and strain whenever a plasmid is saved.
            </Text>
          </Stack>
        )

      case 'appearance':
        return (
          <Stack gap={10}>
            <Text size="sm" fw={600} px={4}>Appearance</Text>

            <SettingsCard>
              <SettingsRow label="Regional format" description={`Current effective locale: ${resolveRegionalLocale(form.values.regionalLocale)}`} control={
                <Select
                  w={220}
                  variant="filled"
                  searchable
                  data={REGIONAL_LOCALE_OPTIONS}
                  value={form.values.regionalLocale ?? ''}
                  onChange={(value) => saveWith({ regionalLocale: value || null })}
                  nothingFoundMessage="No locales found"
                />
              } />
              <SettingsRow label="Theme" control={
                <Switch
                  size="md"
                  color="dark.4"
                  aria-label="Toggle dark mode"
                  checked={form.values.theme === 'dark'}
                  onChange={(e) => saveWith({ theme: e.currentTarget.checked ? 'dark' : 'light' })}
                  onLabel={<IconSun size={14} stroke={2.5} color="var(--mantine-color-yellow-4)" />}
                  offLabel={<IconMoonStars size={14} stroke={2.5} color="var(--mantine-color-blue-6)" />}
                />
              } />
              <SettingsRow label="Font size" last control={
                <Box w={200} pb={24}>
                  <Slider
                    min={0} max={3} step={1}
                    aria-label="Font size"
                    value={[12, 14, 16, 18].indexOf(form.values.fontSize ?? 14) === -1 ? 1 : [12, 14, 16, 18].indexOf(form.values.fontSize ?? 14)}
                    onChange={(v) => form.setFieldValue('fontSize', [12, 14, 16, 18][v])}
                    onChangeEnd={(v) => saveWith({ fontSize: [12, 14, 16, 18][v] })}
                    marks={[
                      { value: 0, label: 'Compact' }, { value: 1, label: 'Regular' },
                      { value: 2, label: 'Large' }, { value: 3, label: 'XL' }
                    ]}
                    label={null} size="xl"
                    styles={{ markLabel: { fontSize: '0.65rem', whiteSpace: 'nowrap' } }}
                  />
                </Box>
              } />
            </SettingsCard>

            <SettingsCard>
              <Box px={14} py={16}>
                <Text size="sm" mb={16}>Accent color</Text>
                <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px 8px' }}>
                  {ACCENT_COLORS.map((color) => {
                    const isSelected = (form.values.accentColor ?? 'teal') === color.id
                    const scale = theme.colors[color.id] ?? theme.colors.teal
                    const splitBg = `linear-gradient(to right, ${scale[2]} 50%, ${scale[7]} 50%)`
                    return (
                      <Box
                        key={color.id}
                        component="button"
                        aria-label={color.label}
                        aria-pressed={isSelected}
                        onClick={() => saveWith({ accentColor: color.id })}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                          background: 'none', border: 'none', cursor: 'default', padding: '8px 4px', borderRadius: 8
                        }}
                      >
                        <Box
                          style={{
                            width: 44, height: 44, borderRadius: '50%', background: splitBg,
                            boxShadow: isSelected
                              ? `0 0 0 2.5px ${isDark ? '#1a1a2e' : '#fff'}, 0 0 0 4.5px ${scale[5]}`
                              : 'none',
                            transition: 'transform 0.1s, box-shadow 0.1s',
                            transform: isSelected ? 'scale(1.08)' : 'scale(1)'
                          }}
                        />
                        <Text
                          size="xs" ta="center" fw={isSelected ? 500 : 400}
                          c={isSelected ? undefined : 'dimmed'}
                          style={{ fontSize: '0.72rem', lineHeight: 1 }}
                        >
                          {color.label}
                        </Text>
                      </Box>
                    )
                  })}
                </Box>
              </Box>
            </SettingsCard>

            <StatusColours />

          </Stack>
        )

      case 'cloud':
        return (
          <Stack gap={10}>
            <Text size="sm" fw={600} px={4}>Cloud Sync</Text>
            <SettingsCard>
              <SettingsRow label="Provider" control={
                <Select
                  w={180} variant="filled" clearable placeholder="None"
                  data={[{ value: 'sciebo', label: 'Sciebo (WebDAV)' }, { value: 'google_drive', label: 'Google Drive' }]}
                  value={form.values.cloudProvider ?? null}
                  onChange={(v) => saveWith({ cloudProvider: (v as 'sciebo' | 'google_drive' | null) ?? null })}
                  aria-label="Cloud provider"
                />
              } />
              <SettingsRow label="Folder path" description="Local path to the synced cloud folder" last control={
                <TextInput
                  w={200} variant="filled" autoComplete="off"
                  placeholder={isWindows ? 'C:\\Users\\you\\Sciebo\\…' : '/Users/you/Sciebo/…'}
                  aria-label="Shared folder path"
                  value={form.values.cloudPath ?? ''}
                  onChange={(e) => form.setFieldValue('cloudPath', e.currentTarget.value || null)}
                  onBlur={saveOnBlur}
                  styles={{ input: { fontSize: '0.75rem', fontFamily: 'monospace' } }}
                />
              } />
            </SettingsCard>
            <Text size="xs" c="dimmed" px={4}>
              Cloud sync only connects when you manually publish a plasmid or sync a glossary.
            </Text>
          </Stack>
        )

      case 'import': {
        const runImport = async () => {
          setImportState('running'); setImportResult(null); setImportError(null)
          try {
            const resp = await window.api.importData.legacyGmocu(
              import.meta.env.DEV ? { backup: backupBeforeImport } : undefined
            )
            if (!resp.success) { setImportState('error'); setImportError(resp.error ?? 'Unknown error'); return }
            const result = resp.data as ImportResult
            if (result.cancelled) { setImportState('idle'); return }
            setImportResult(result); setImportState('done')
            qc.invalidateQueries({ queryKey: ['plasmids'] })
          } catch (e) { setImportState('error'); setImportError(String(e)) }
        }
        return (
          <Stack gap={10}>
            <Text size="sm" fw={600} px={4}>Import</Text>
            <SettingsCard>
              <Box px={14} py={16}>
                <Text size="sm" fw={500} mb={4}>Import from GMOcu database</Text>
                <Text size="xs" c="dimmed" mb={14} style={{ lineHeight: 1.5 }}>
                  Imports plasmids, cassettes, GMOs, organisms, features and attachments from a GMOcu
                  backup (.db) file. Existing records are not modified — imported data is appended.
                </Text>
                {import.meta.env.DEV && (
                  <Checkbox size="xs" mb={10} label="Backup database before import" checked={backupBeforeImport}
                    onChange={(e) => setBackupBeforeImport(e.currentTarget.checked)} />
                )}
                <Button size="xs" loading={importState === 'running'} onClick={runImport}>
                  Select GMOcu .db file…
                </Button>
                {importState === 'done' && importResult && !importResult.cancelled && (
                  <Box mt={14} style={{ borderRadius: 6, backgroundColor: isDark ? theme.colors.dark[5] : theme.colors.gray[0], padding: '10px 12px' }}>
                    <Text size="xs" fw={600} mb={6} c={isDark ? `${theme.primaryColor}.3` : `${theme.primaryColor}.7`}>Import complete</Text>
                    {importResult.creatorName && (
                      <Text size="xs" c="dimmed" mb={4}>Creator: {importResult.creatorName} ({importResult.creatorInitials})</Text>
                    )}
                    {(Object.entries(importResult.counts!) as [string, number][]).map(([key, n]) => (
                      <Text key={key} size="xs" c="dimmed">{n} {key}</Text>
                    ))}
                  </Box>
                )}
                {importState === 'error' && (
                  <Box mt={14} style={{ borderRadius: 6, backgroundColor: isDark ? theme.colors.red[9] + '33' : theme.colors.red[0], padding: '10px 12px' }}>
                    <Text size="xs" c="red">{importError}</Text>
                  </Box>
                )}
              </Box>
            </SettingsCard>
          </Stack>
        )
      }

      case 'dev':
        return <DevSection />

      case 'about':
        return (
          <Stack gap={10}>
            <Text size="sm" fw={600} px={4}>About</Text>
            <SettingsCard>
              <Box px={14} py={20} style={{ textAlign: 'center' }}>
                <Text fw={700} size="xl" style={{ letterSpacing: '0.06em' }}>J·LAB</Text>
                <Text size="xs" c="dimmed" mt={4}>Version 0.1.0</Text>
                <Text size="xs" c="dimmed">Plasmid, GMO & seed management</Text>
              </Box>
            </SettingsCard>
            <SettingsCard>
              <InfoRow label="Lab" value="Jores Lab" />
              <InfoRow label="Institution" value={s?.institution || '—'} />
              <InfoRow label="App version" value="0.1.0" last />
            </SettingsCard>
            <SettingsCard>
              <InfoRow label="License" value="MIT" last />
            </SettingsCard>
          </Stack>
        )
    }
  }

  return (
    <Box style={{ backgroundColor: pageBg, minHeight: '100vh', margin: -32, padding: 32 }}>
      <Box maw={700} mx="auto">
        <Group justify="space-between" align="center" mb={24} pt={4}>
          <Text fw={600} size="xl">Settings</Text>
          <Text
            size="xs"
            c={`${theme.primaryColor}.5`}
            style={{ opacity: savedAt ? 1 : 0, transition: 'opacity 0.4s' }}
            aria-live="polite"
          >
            Saved
          </Text>
        </Group>
        <Group align="flex-start" gap={32} wrap="nowrap">
          <SectionNav active={activeSection} onChange={setActiveSection} />
          <Box style={{ flex: 1, minWidth: 0 }}>{renderSection()}</Box>
        </Group>
      </Box>
    </Box>
  )
}
