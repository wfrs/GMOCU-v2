import {
  ActionIcon, Badge, Box, Button, Checkbox, CloseButton, Combobox,
  Group, Input, InputBase, NumberInput, Notification, Popover, Select, Skeleton,
  Stack, Table, Text, TextInput, Title, Tooltip,
  useMantineColorScheme, useMantineTheme, useCombobox
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  arrayMove, verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  IconFilter, IconColumns, IconGripVertical, IconCopy, IconTrash, IconInfoCircle, IconPrinter
} from '@tabler/icons-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import type { PlasmidRow as Plasmid, SelectionValueRow, CategoryRow, FeatureRow } from '@shared/types'
import type { UpdatePlasmid } from '@shared/ipc-schemas'
import { NewPlasmidModal } from '@renderer/components/NewPlasmidModal'
import { PlasmidDetailModal } from '@renderer/components/PlasmidDetailModal'
import { isMac } from '@renderer/lib/platform'
import { useRegionalFormatting } from '@renderer/lib/regional-format'

// ─── Column definitions ────────────────────────────────────────────────────────

type ColKey = 'id' | 'name' | 'alias' | 'category' | 'cassette' | 'status'
            | 'creatorInitials' | 'backboneVector' | 'box' | 'concentration' | 'dateCreated'

type EditType = 'text' | 'select-status' | 'select-category' | 'number' | 'date' | 'none'

interface ColDef {
  key: ColKey
  label: string
  width?: number
  required: boolean
  editable: boolean
  editType: EditType
}

const ALL_COLS: ColDef[] = [
  { key: 'id',              label: 'ID',         width: 72,  required: true,  editable: false, editType: 'none' },
  { key: 'name',            label: 'Name',        width: 160, required: true,  editable: true,  editType: 'text' },
  { key: 'alias',           label: 'Alias',       width: 100, required: false, editable: true,  editType: 'text' },
  { key: 'category',        label: 'Category',    width: 120, required: false, editable: true,  editType: 'select-category' },
  { key: 'cassette',        label: 'Cassette',              required: false, editable: true,  editType: 'text' },
  { key: 'status',          label: 'Status',      width: 140, required: false, editable: true,  editType: 'select-status' },
  { key: 'creatorInitials', label: 'Creator',     width: 80,  required: false, editable: true,  editType: 'text' },
  { key: 'backboneVector',  label: 'Backbone',    width: 120, required: false, editable: true,  editType: 'text' },
  { key: 'box',             label: 'Box',         width: 80,  required: false, editable: true,  editType: 'text' },
  { key: 'concentration',   label: 'ng/µL',       width: 80,  required: false, editable: true,  editType: 'number' },
  { key: 'dateCreated',     label: 'Date cloned', width: 120, required: false, editable: true,  editType: 'date' },
]

const ALL_COL_KEYS: ColKey[] = ALL_COLS.map((col) => col.key)
const DEFAULT_VISIBLE_COLS: ColKey[] = ['id', 'name', 'alias', 'cassette', 'status', 'creatorInitials', 'dateCreated']
const DEFAULT_HIDDEN_COLS: ColKey[] = ALL_COL_KEYS.filter((key) => !DEFAULT_VISIBLE_COLS.includes(key))

// ─── Preferences (localStorage) ───────────────────────────────────────────────

const PREFS_KEY = 'jlab.tablePrefs.plasmids'

interface RawPrefs {
  colOrder?: ColKey[]
  hiddenCols?: ColKey[]
  colFilters?: Partial<Record<ColKey, string[] | null>>
}

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) {
      return {
        colOrder: ALL_COL_KEYS,
        hiddenCols: new Set<ColKey>(DEFAULT_HIDDEN_COLS),
        colFilters: {} as Partial<Record<ColKey, Set<string>>>
      }
    }

    const p = JSON.parse(raw) as RawPrefs
    const colFilters: Partial<Record<ColKey, Set<string>>> = {}
    for (const [k, v] of Object.entries(p.colFilters ?? {})) {
      if (Array.isArray(v)) colFilters[k as ColKey] = new Set(v)
    }

    const savedOrder = (p.colOrder ?? []).filter((key): key is ColKey => ALL_COL_KEYS.includes(key as ColKey))
    const colOrder = [...savedOrder, ...ALL_COL_KEYS.filter((key) => !savedOrder.includes(key))]
    const hiddenCols = new Set((p.hiddenCols ?? []).filter((key): key is ColKey => ALL_COL_KEYS.includes(key as ColKey)))
    for (const key of ALL_COL_KEYS) {
      if (!savedOrder.includes(key)) hiddenCols.add(key)
    }

    return {
      colOrder,
      hiddenCols,
      colFilters
    }
  } catch {
    return {
      colOrder: ALL_COL_KEYS,
      hiddenCols: new Set<ColKey>(DEFAULT_HIDDEN_COLS),
      colFilters: {} as Partial<Record<ColKey, Set<string>>>
    }
  }
}

function savePrefs(colOrder: ColKey[], hiddenCols: Set<ColKey>, colFilters: Partial<Record<ColKey, Set<string>>>) {
  const serialized: RawPrefs = {
    colOrder,
    hiddenCols: [...hiddenCols],
    colFilters: Object.fromEntries(
      Object.entries(colFilters).map(([k, v]) => [k, v ? [...v] : null])
    ) as RawPrefs['colFilters']
  }
  localStorage.setItem(PREFS_KEY, JSON.stringify(serialized))
}

// ─── Cell value helpers ────────────────────────────────────────────────────────

function toDateInputString(value: Date | string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateInputString(value: string): Date | null {
  if (!value) return null
  const [year, month, day] = value.split('-').map((part) => parseInt(part, 10))
  if (!year || !month || !day) return null

  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? null : date
}

function getCellEditValue(key: ColKey, p: Plasmid): string {
  switch (key) {
    case 'name':            return p.name
    case 'alias':           return p.alias ?? ''
    case 'cassette':        return p.cassette ?? ''
    case 'status':          return p.status
    case 'category':        return p.categoryId != null ? String(p.categoryId) : ''
    case 'creatorInitials': return p.creatorInitials
    case 'backboneVector':  return p.backboneVector ?? ''
    case 'box':             return p.box ?? ''
    case 'concentration':   return p.concentration != null ? String(p.concentration) : ''
    case 'dateCreated':     return toDateInputString(p.dateCreated)
    default:                return ''
  }
}

function colKeyToPayload(key: ColKey, value: string): UpdatePlasmid {
  switch (key) {
    case 'name':            return value.trim() ? { name: value.trim() } : {}
    case 'alias':           return { alias: value.trim() || null }
    case 'cassette':        return { cassette: value.trim() || null }
    case 'status':          return value ? { status: value } : {}
    case 'category':        return { categoryId: value ? parseInt(value, 10) : null }
    case 'creatorInitials': return { creatorInitials: value.trim() }
    case 'backboneVector':  return { backboneVector: value.trim() || null }
    case 'box':             return { box: value.trim() || null }
    case 'concentration': {
      const n = parseFloat(value)
      return { concentration: isNaN(n) || n <= 0 ? null : n }
    }
    case 'dateCreated':
      return { dateCreated: parseDateInputString(value) }
    default: return {}
  }
}

function getCellSortValue(key: ColKey, p: Plasmid, statusMap: Record<string, SelectionValueRow>, categories: CategoryRow[]): string {
  switch (key) {
    case 'id':              return String(p.id)
    case 'name':            return p.name
    case 'alias':           return p.alias ?? ''
    case 'cassette':        return p.cassette ?? ''
    case 'category': {
      const cat = categories.find(c => c.id === p.categoryId)
      return cat?.name ?? ''
    }
    case 'status':          return statusMap[p.status]?.label ?? p.status
    case 'creatorInitials': return p.creatorInitials
    case 'backboneVector':  return p.backboneVector ?? ''
    case 'box':             return p.box ?? ''
    case 'concentration':   return p.concentration != null ? String(p.concentration).padStart(10, '0') : ''
    case 'dateCreated':     return p.dateCreated ? new Date(p.dateCreated).toISOString() : ''
  }
}

function getCellFilterValue(
  key: ColKey,
  p: Plasmid,
  statusMap: Record<string, SelectionValueRow>,
  categories: CategoryRow[],
  formatDate: (value: Date | string | null | undefined) => string,
  formatNumber: (value: number | null | undefined, options?: Intl.NumberFormatOptions) => string
): string {
  switch (key) {
    case 'dateCreated':
      return formatDate(p.dateCreated)
    case 'concentration':
      return formatNumber(p.concentration, { maximumFractionDigits: 2 })
    default:
      return getCellSortValue(key, p, statusMap, categories)
  }
}

// ─── Cassette token display ────────────────────────────────────────────────────

function CassetteDisplay({ cassette, featureSet }: {
  cassette: string | null
  featureSet: { names: Set<string>; aliases: Set<string> }
}) {
  if (!cassette) return <Text size="xs" c="dimmed" ff="monospace">—</Text>
  const tokens = cassette.split('-')
  const hasGlossary = featureSet.names.size > 0
  return (
    <Text size="xs" ff="monospace" style={{ wordBreak: 'break-all', lineHeight: 1.7 }}>
      {tokens.map((token, i) => {
        const t = token.toLowerCase()
        const known = !hasGlossary || featureSet.names.has(t) || featureSet.aliases.has(t)
        return (
          <span key={i}>
            <span
              title={known ? undefined : `"${token}" not found in Features glossary`}
              style={{ color: known ? undefined : 'var(--mantine-color-orange-5)', cursor: known ? 'text' : 'help' }}
            >
              {token}
            </span>
            {i < tokens.length - 1 && <span style={{ opacity: 0.4 }}>-</span>}
          </span>
        )
      })}
    </Text>
  )
}

// ─── Status filter ─────────────────────────────────────────────────────────────

function StatusFilter({
  value, onChange, statusOptions
}: {
  value: string | null
  onChange: (v: string | null) => void
  statusOptions: SelectionValueRow[]
}) {
  const combobox = useCombobox({ onDropdownClose: () => combobox.resetSelectedOption() })

  const options = statusOptions.map((sv) => (
    <Combobox.Option value={sv.value} key={sv.value} active={sv.value === value}>
      <Group gap={8} wrap="nowrap">
        <Box w={8} h={8} style={{ borderRadius: '50%', flexShrink: 0, backgroundColor: sv.colour ?? '#868e96' }} />
        <Text size="xs" ff="monospace">{sv.label}</Text>
      </Group>
    </Combobox.Option>
  ))

  const selectedLabel = statusOptions.find((sv) => sv.value === value)?.label
  const rightSection = value
    ? <Combobox.ClearButton size="xs" onClear={() => { onChange(null); combobox.closeDropdown() }} />
    : <Combobox.Chevron size="xs" />

  return (
    <Combobox store={combobox} onOptionSubmit={(val) => { onChange(val); combobox.closeDropdown() }}>
      <Combobox.Target targetType="button">
        <InputBase component="button" type="button" size="xs" ff="monospace" pointer
          rightSection={rightSection} rightSectionPointerEvents={value ? 'all' : 'none'}
          onClick={() => combobox.toggleDropdown()} style={{ minWidth: 130 }}
        >
          {value ? <Text size="xs" ff="monospace">{selectedLabel ?? value}</Text> : <Input.Placeholder>All statuses</Input.Placeholder>}
        </InputBase>
      </Combobox.Target>
      <Combobox.Dropdown><Combobox.Options>{options}</Combobox.Options></Combobox.Dropdown>
    </Combobox>
  )
}

// ─── Column filter popover ────────────────────────────────────────────────────

function ColFilterButton({ colKey, allValues, filter, onChange }: {
  colKey: ColKey
  allValues: string[]
  filter: Set<string> | undefined
  onChange: (f: Set<string> | undefined) => void
}) {
  const theme = useMantineTheme()
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const active = filter !== undefined

  const visibleValues = search
    ? allValues.filter((v) => (v || '(blank)').toLowerCase().includes(search.toLowerCase()))
    : allValues

  const checkedCount = filter === undefined ? allValues.length : filter.size
  const allChecked = checkedCount === allValues.length
  const indeterminate = !allChecked && checkedCount > 0

  const toggleAll = () => { if (allChecked) onChange(new Set()); else onChange(undefined) }

  const toggleValue = (val: string) => {
    const current: Set<string> = filter !== undefined ? new Set(filter) : new Set(allValues)
    if (current.has(val)) { current.delete(val) } else { current.add(val) }
    onChange(current.size === allValues.length ? undefined : current)
  }

  const borderColor = isDark ? theme.colors.dark[4] : theme.colors.gray[2]

  return (
    <Popover position="bottom-start" shadow="md" opened={open} onChange={setOpen} trapFocus>
      <Popover.Target>
        <ActionIcon
          size={16} variant={active ? 'filled' : 'subtle'}
          color={active ? theme.primaryColor : 'gray'}
          aria-label={`Filter ${colKey}`}
          onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
          style={{ flexShrink: 0 }}
        >
          <IconFilter size={10} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown p={0} onClick={(e) => e.stopPropagation()} style={{ minWidth: 200 }}>
        <Box p={8} style={{ borderBottom: `1px solid ${borderColor}` }}>
          <TextInput size="xs" placeholder="Search values…" value={search}
            onChange={(e) => setSearch(e.currentTarget.value)} autoFocus
            rightSection={search ? <CloseButton size="xs" onClick={() => setSearch('')} /> : undefined}
            rightSectionPointerEvents="all"
          />
        </Box>
        <Box style={{ maxHeight: 220, overflowY: 'auto' }} p={6}>
          {!search && (
            <Box component="label" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', cursor: 'pointer', borderRadius: 4 }}>
              <Checkbox size="xs" checked={allChecked} indeterminate={indeterminate}
                onChange={toggleAll} aria-label="Select all" onClick={(e) => e.stopPropagation()} />
              <Text size="xs" fw={500}>(Select all)</Text>
            </Box>
          )}
          {visibleValues.map((val) => (
            <Box key={val} component="label" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', cursor: 'pointer', borderRadius: 4 }}>
              <Checkbox size="xs" checked={filter === undefined || filter.has(val)}
                onChange={() => toggleValue(val)} onClick={(e) => e.stopPropagation()} aria-label={val || '(blank)'} />
              <Text size="xs" c={val ? undefined : 'dimmed'}>{val || '(blank)'}</Text>
            </Box>
          ))}
          {visibleValues.length === 0 && <Text size="xs" c="dimmed" ta="center" py={8}>No matches</Text>}
        </Box>
        {active && (
          <Box p={6} style={{ borderTop: `1px solid ${borderColor}` }}>
            <Button size="xs" variant="subtle" color="gray" fullWidth fz="xs"
              onClick={() => { onChange(undefined); setOpen(false) }}>Clear filter</Button>
          </Box>
        )}
      </Popover.Dropdown>
    </Popover>
  )
}

// ─── Column chooser (DnD) ─────────────────────────────────────────────────────

function SortableColItem({ colKey, label, checked, disabled, onToggle }: {
  colKey: ColKey; label: string; checked: boolean; disabled?: boolean; onToggle: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: colKey })
  return (
    <Group ref={setNodeRef} gap={8} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : disabled ? 0.4 : 1, padding: '5px 0', userSelect: 'none' }}>
      <Box {...attributes} {...listeners} style={{ cursor: 'grab', display: 'flex', alignItems: 'center', color: 'var(--mantine-color-dimmed)' }}>
        <IconGripVertical size={14} />
      </Box>
      <Checkbox size="xs" checked={checked} disabled={disabled} onChange={onToggle} label={label} style={{ cursor: disabled ? 'default' : 'pointer' }} />
    </Group>
  )
}

function ColumnChooser({ colOrder, hiddenCols, onOrderChange, onToggle, onReset }: {
  colOrder: ColKey[]; hiddenCols: Set<ColKey>
  onOrderChange: (next: ColKey[]) => void; onToggle: (key: ColKey) => void; onReset: () => void
}) {
  const theme = useMantineTheme()
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (over && active.id !== over.id) {
      const oldIdx = colOrder.indexOf(active.id as ColKey)
      const newIdx = colOrder.indexOf(over.id as ColKey)
      if (oldIdx !== -1 && newIdx !== -1) onOrderChange(arrayMove(colOrder, oldIdx, newIdx))
    }
  }

  return (
    <Box p={4} style={{ minWidth: 190 }}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={colOrder} strategy={verticalListSortingStrategy}>
          {colOrder.map((key) => {
            const col = ALL_COLS.find((c) => c.key === key)!
            return <SortableColItem key={key} colKey={key} label={col.label} checked={!hiddenCols.has(key)} disabled={col.required} onToggle={() => onToggle(key)} />
          })}
        </SortableContext>
      </DndContext>
      <Box mt={8} style={{ height: 1, backgroundColor: isDark ? theme.colors.dark[4] : theme.colors.gray[2] }} />
      <Box pt={6}>
        <Button size="xs" variant="subtle" color="gray" fullWidth fz="xs" onClick={onReset}>Reset order</Button>
      </Box>
    </Box>
  )
}

// ─── Status summary ────────────────────────────────────────────────────────────

function StatusSummary({ rows, statusOptions }: { rows: Plasmid[]; statusOptions: SelectionValueRow[] }) {
  const groups = statusOptions
    .map((sv) => ({ ...sv, count: rows.filter((r) => r.status === sv.value).length }))
    .filter((g) => g.count > 0)
  if (groups.length <= 1) return null
  return (
    <Group gap={6}>
      {groups.map((g) => (
        <Badge key={g.value} variant="light" size="sm" ff="monospace"
          style={g.colour ? { backgroundColor: `${g.colour}22`, color: g.colour, borderColor: `${g.colour}44` } : undefined}>
          {g.count} {g.label}
        </Badge>
      ))}
    </Group>
  )
}

// ─── Skeleton / empty state ───────────────────────────────────────────────────

function TableSkeleton() {
  return <Stack gap={2} mt={2}>{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={42} radius="xs" />)}</Stack>
}

function EmptyState() {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  return (
    <Stack align="center" justify="center" h="50vh" gap="xs">
      <Text ff="monospace" size="xl" c={isDark ? 'dark.3' : 'gray.4'} style={{ letterSpacing: '0.05em' }}>◎</Text>
      <Text size="sm" c="dimmed" ff="monospace">No plasmids yet</Text>
      <Text size="xs" c="dimmed">Click &ldquo;New Plasmid&rdquo; to add your first entry</Text>
    </Stack>
  )
}

// ─── Inline-editable table ────────────────────────────────────────────────────

interface EditingCell { id: number; key: ColKey }

interface PlasmidTableProps {
  rows: Plasmid[]
  activeCols: ColDef[]
  sortBy: ColKey | null
  sortDir: 'asc' | 'desc'
  onSort: (col: ColKey) => void
  selectedForPrint: Set<number>
  onPrintToggle: (id: number) => void
  colFilters: Partial<Record<ColKey, Set<string>>>
  onColFilter: (key: ColKey, filter: Set<string> | undefined) => void
  colUniqueValues: Partial<Record<ColKey, string[]>>
  statusMap: Record<string, SelectionValueRow>
  categories: CategoryRow[]
  featureSet: { names: Set<string>; aliases: Set<string> }
  onSave: (id: number, payload: UpdatePlasmid) => Promise<boolean>
  onDetailOpen: (id: number) => void
  onDuplicate: (plasmid: Plasmid) => void
  onDelete: (id: number) => void
  formatDate: (value: Date | string | null | undefined) => string
  formatNumber: (value: number | null | undefined, options?: Intl.NumberFormatOptions) => string
  dateInputFormat: string
  decimalSeparator: string
  groupSeparator: string
}

function PlasmidTable(props: PlasmidTableProps) {
  const { rows, activeCols, sortBy, sortDir, onSort, colFilters, onColFilter,
          colUniqueValues, statusMap, categories, featureSet,
          onSave, onDetailOpen, onDuplicate, onDelete,
          formatDate, formatNumber, dateInputFormat, decimalSeparator, groupSeparator,
          selectedForPrint, onPrintToggle } = props

  const theme = useMantineTheme()
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  const scale = theme.colors[theme.primaryColor] ?? theme.colors.teal
  const borderColor = isDark ? theme.colors.dark[5] : theme.colors.gray[2]
  const headerBg = isDark ? `${scale[9]}28` : scale[0]
  const headerTextColor = isDark ? scale[3] : scale[7]
  const hoverBg = isDark ? theme.colors.dark[6] : theme.colors.gray[0]
  const selectedBg = isDark ? `${scale[9]}22` : `${scale[6]}12`
  const editingBg = isDark ? theme.colors.dark[7] : '#fff'

  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [editValue, setEditValue] = useState('')
  const [selectedCell, setSelectedCell] = useState<EditingCell | null>(null)
  const [savedRows, setSavedRows] = useState<Set<number>>(new Set())
  const tableRef = useRef<HTMLDivElement>(null)

  const showSaved = (id: number) => {
    setSavedRows(prev => new Set(prev).add(id))
    setTimeout(() => setSavedRows(prev => { const n = new Set(prev); n.delete(id); return n }), 1400)
  }

  const startEdit = (id: number, key: ColKey) => {
    const col = ALL_COLS.find(c => c.key === key)
    if (!col?.editable) return
    const row = rows.find(r => r.id === id)
    if (!row) return
    setSelectedCell({ id, key })
    setEditingCell({ id, key })
    setEditValue(getCellEditValue(key, row))
  }

  const cancelEdit = () => setEditingCell(null)

  const commitEdit = async (value: string, gotoNext: boolean = false) => {
    if (!editingCell) return
    const { id, key } = editingCell
    const payload = colKeyToPayload(key, value)
    if (Object.keys(payload).length === 0) { setEditingCell(null); return }

    setEditingCell(null)
    const ok = await onSave(id, payload)
    if (ok) showSaved(id)

    if (gotoNext) {
      const editableCols = activeCols.filter(c => c.editable)
      const idx = editableCols.findIndex(c => c.key === key)
      if (idx !== -1 && idx < editableCols.length - 1) {
        const next = editableCols[idx + 1]
        const row = rows.find(r => r.id === id)
        if (row) { startEdit(id, next.key) }
      }
    }
  }

  const commitEditRef = useRef(commitEdit)
  commitEditRef.current = commitEdit

  // Keyboard shortcuts when a cell is selected but not editing
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editingCell) return
      if (!selectedCell) return
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      const col = ALL_COLS.find(c => c.key === selectedCell.key)

      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        const row = rows.find(r => r.id === selectedCell.id)
        if (row) navigator.clipboard.writeText(getCellEditValue(selectedCell.key, row))
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        if (col?.editable) {
          navigator.clipboard.readText().then(text => { startEdit(selectedCell.id, selectedCell.key); setEditValue(text) })
        }
        return
      }
      if ((e.key === 'Enter' || e.key === 'F2') && col?.editable) {
        e.preventDefault()
        startEdit(selectedCell.id, selectedCell.key)
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && col?.editable) {
        e.preventDefault()
        commitEditRef.current('', false)
        // Need to set editing first then immediately commit empty
        const row = rows.find(r => r.id === selectedCell.id)
        if (row) {
          const payload = colKeyToPayload(selectedCell.key, '')
          if (Object.keys(payload).length > 0) onSave(selectedCell.id, payload).then(ok => { if (ok) showSaved(selectedCell.id) })
        }
        return
      }
      if (e.key === 'Escape') {
        setSelectedCell(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [editingCell, selectedCell, rows]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cell display renderer (read-only)
  const renderDisplay = (col: ColDef, p: Plasmid) => {
    switch (col.key) {
      case 'id':
        return (
          <Group gap={4} wrap="nowrap" align="center">
            <Text
              size="sm" c="dimmed" ff="monospace"
              style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
              onClick={(e) => { e.stopPropagation(); onDetailOpen(p.id) }}
              title="Open detail panel"
            >
              {p.id}
            </Text>
            {savedRows.has(p.id) && (
              <Text size="xs" c="teal.5" style={{ transition: 'opacity 0.3s', fontFamily: 'monospace' }}>✓</Text>
            )}
          </Group>
        )
      case 'name':
        return <Text size="sm" fw={500}>{p.name}</Text>
      case 'alias':
        return p.alias
          ? <Text size="sm" ff="monospace" c="dimmed">{p.alias}</Text>
          : <Text size="sm" c="dimmed" style={{ opacity: 0.35 }}>—</Text>
      case 'category': {
        const cat = categories.find(c => c.id === p.categoryId)
        return cat
          ? <Badge size="sm" variant="outline" color="gray">{cat.name}</Badge>
          : <Text size="sm" c="dimmed" style={{ opacity: 0.35 }}>—</Text>
      }
      case 'cassette':
        return <CassetteDisplay cassette={p.cassette} featureSet={featureSet} />
      case 'status': {
        const sv = statusMap[p.status]
        return (
          <Badge variant="light" size="sm"
            style={sv?.colour ? { backgroundColor: `${sv.colour}22`, color: sv.colour, borderColor: `${sv.colour}44` } : undefined}>
            {sv?.label ?? p.status}
          </Badge>
        )
      }
      case 'creatorInitials':
        return <Text size="sm" c="dimmed" ff="monospace">{p.creatorInitials || '—'}</Text>
      case 'backboneVector':
        return p.backboneVector
          ? <Text size="sm" ff="monospace">{p.backboneVector}</Text>
          : <Text size="sm" c="dimmed" style={{ opacity: 0.35 }}>—</Text>
      case 'box':
        return p.box
          ? <Text size="sm" ff="monospace">{p.box}</Text>
          : <Text size="sm" c="dimmed" style={{ opacity: 0.35 }}>—</Text>
      case 'concentration':
        return p.concentration != null
          ? <Text size="sm" ff="monospace">{formatNumber(p.concentration, { maximumFractionDigits: 2 })}</Text>
          : <Text size="sm" c="dimmed" style={{ opacity: 0.35 }}>—</Text>
      case 'dateCreated':
        return <Text size="sm" c="dimmed">{formatDate(p.dateCreated)}</Text>
    }
  }

  // Inline editor renderer
  const renderEditor = (col: ColDef, p: Plasmid) => {
    const inputStyles = {
      input: {
        height: 30,
        padding: '0 8px',
        border: 'none',
        outline: `2px solid ${scale[5]}`,
        borderRadius: 4,
        background: editingBg,
        fontFamily: col.key === 'cassette' ? 'monospace' : undefined,
      }
    }

    switch (col.editType) {
      case 'text':
        return (
          <TextInput
            autoFocus
            size="xs"
            value={editValue}
            onChange={(e) => setEditValue(e.currentTarget.value)}
            onBlur={() => commitEdit(editValue, false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitEdit(editValue, false) }
              if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
              if (e.key === 'Tab') { e.preventDefault(); commitEdit(editValue, !e.shiftKey) }
            }}
            styles={inputStyles}
            style={{ width: '100%', minWidth: col.key === 'cassette' ? 200 : undefined }}
          />
        )

      case 'number':
        return (
          <NumberInput
            autoFocus
            size="xs"
            value={editValue === '' ? '' : (parseFloat(editValue) || '')}
            onChange={(v) => setEditValue(String(v))}
            onBlur={() => commitEdit(editValue, false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitEdit(editValue, false) }
              if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
              if (e.key === 'Tab') { e.preventDefault(); commitEdit(editValue, !e.shiftKey) }
            }}
            min={0}
            decimalScale={2}
            decimalSeparator={decimalSeparator}
            thousandSeparator={groupSeparator}
            styles={inputStyles}
            style={{ width: col.width ? col.width - 28 : 80 }}
          />
        )

      case 'date':
        return (
          <DateInput
            autoFocus
            size="xs"
            clearable
            valueFormat={dateInputFormat}
            value={parseDateInputString(editValue)}
            onChange={(value) => setEditValue(toDateInputString(value))}
            onBlur={() => commitEdit(editValue, false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitEdit(editValue, false) }
              if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
              if (e.key === 'Tab') { e.preventDefault(); commitEdit(editValue, !e.shiftKey) }
            }}
            popoverProps={{ withinPortal: true }}
            styles={inputStyles}
            style={{ width: col.width ? col.width - 28 : 110 }}
          />
        )

      case 'select-status': {
        const statusData = Object.values(statusMap).map(sv => ({ value: sv.value, label: sv.label }))
        return (
          <Select
            autoFocus
            size="xs"
            data={statusData}
            value={editValue}
            onChange={(v) => { if (v !== null) commitEdit(v, false) }}
            onKeyDown={(e) => { if (e.key === 'Escape') cancelEdit() }}
            onBlur={() => setEditingCell(null)}
            comboboxProps={{ withinPortal: true }}
            styles={{ input: { height: 30, border: 'none', outline: `2px solid ${scale[5]}`, borderRadius: 4 } }}
            style={{ width: col.width ? col.width - 28 : 130 }}
          />
        )
      }

      case 'select-category': {
        const catData = [
          { value: '', label: '— None —' },
          ...categories.map(c => ({ value: String(c.id), label: c.name }))
        ]
        return (
          <Select
            autoFocus
            size="xs"
            data={catData}
            value={editValue}
            onChange={(v) => commitEdit(v ?? '', false)}
            onKeyDown={(e) => { if (e.key === 'Escape') cancelEdit() }}
            onBlur={() => setEditingCell(null)}
            comboboxProps={{ withinPortal: true }}
            styles={{ input: { height: 30, border: 'none', outline: `2px solid ${scale[5]}`, borderRadius: 4 } }}
            style={{ width: col.width ? col.width - 28 : 110 }}
          />
        )
      }

      default: return renderDisplay(col, p)
    }
  }

  const isEditing = (id: number, key: ColKey) => editingCell?.id === id && editingCell?.key === key
  const isSelected = (id: number) => selectedCell?.id === id

  return (
    <Box ref={tableRef} style={{ border: `1px solid ${borderColor}`, borderRadius: 8, overflow: 'visible' }}>
      <Box style={{ overflowX: 'auto', borderRadius: 8 }}>
        <Table
          fz="sm"
          styles={{
            th: { padding: '10px 14px', backgroundColor: headerBg, borderBottom: `1px solid ${borderColor}`, borderRight: 'none' },
            td: { padding: '6px 14px', borderBottom: `1px solid ${borderColor}`, borderRight: 'none', verticalAlign: 'middle' },
          }}
        >
          <Table.Thead>
            <Table.Tr>
              {/* Print-select column */}
              <Table.Th w={32} style={{ userSelect: 'none' }}>
                <Tooltip label="Select all visible for labels" fz="xs" withArrow>
                  <Checkbox
                    size="xs"
                    aria-label="Select all for print"
                    checked={rows.length > 0 && rows.every(r => selectedForPrint.has(r.id))}
                    indeterminate={rows.some(r => selectedForPrint.has(r.id)) && !rows.every(r => selectedForPrint.has(r.id))}
                    onChange={(e) => rows.forEach(r => {
                      const want = e.currentTarget.checked
                      const has = selectedForPrint.has(r.id)
                      if (want !== has) onPrintToggle(r.id)
                    })}
                  />
                </Tooltip>
              </Table.Th>
              {activeCols.map((col) => {
                const isActive = sortBy === col.key
                return (
                  <Table.Th key={col.key} w={col.width} onClick={() => onSort(col.key)}
                    style={{ cursor: 'pointer', userSelect: 'none' }}>
                    <Group gap={6} wrap="nowrap" align="center">
                      <Text component="span" size="xs" fw={600}
                        style={{ textTransform: 'uppercase', letterSpacing: '0.055em', lineHeight: 1, color: headerTextColor }}>
                        {col.label}
                      </Text>
                      {isActive && (
                        <Text component="span" size="xs" style={{ lineHeight: 1, color: headerTextColor }}>
                          {sortDir === 'asc' ? '↑' : '↓'}
                        </Text>
                      )}
                      <ColFilterButton
                        colKey={col.key}
                        allValues={colUniqueValues[col.key] ?? []}
                        filter={colFilters[col.key]}
                        onChange={(f) => onColFilter(col.key, f)}
                      />
                    </Group>
                  </Table.Th>
                )
              })}
              {/* Actions column header */}
              <Table.Th w={64} style={{ userSelect: 'none' }} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((p) => {
              const rowSelected = isSelected(p.id)
              const checkedForPrint = selectedForPrint.has(p.id)
              return (
                <Table.Tr
                  key={p.id}
                  style={{ backgroundColor: rowSelected ? selectedBg : undefined, transition: 'background-color 0.06s' }}
                  onMouseEnter={(e) => { if (!rowSelected) (e.currentTarget as HTMLTableRowElement).style.backgroundColor = hoverBg }}
                  onMouseLeave={(e) => { if (!rowSelected) (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '' }}
                >
                  {/* Print-select cell */}
                  <Table.Td style={{ padding: '4px 8px' }} onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      size="xs"
                      aria-label={`Select ${p.name} for print`}
                      checked={checkedForPrint}
                      onChange={() => onPrintToggle(p.id)}
                    />
                  </Table.Td>
                  {activeCols.map((col) => {
                    const editing = isEditing(p.id, col.key)
                    return (
                      <Table.Td
                        key={col.key}
                        style={{
                          backgroundColor: editing ? editingBg : undefined,
                          padding: editing ? '3px 6px' : undefined,
                          cursor: col.editable ? 'text' : 'default',
                        }}
                        onClick={() => {
                          if (col.editable && !editing) startEdit(p.id, col.key)
                          else if (!col.editable) setSelectedCell({ id: p.id, key: col.key })
                        }}
                      >
                        {editing ? renderEditor(col, p) : renderDisplay(col, p)}
                      </Table.Td>
                    )
                  })}
                  {/* Row actions */}
                  <Table.Td style={{ padding: '4px 8px' }}>
                    <Group gap={2} wrap="nowrap" justify="flex-end" style={{ opacity: rowSelected ? 1 : 0, transition: 'opacity 0.1s' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
                    >
                      <Tooltip label="Detail / Edit all fields" fz="xs" withArrow position="top">
                        <ActionIcon size="xs" variant="subtle" color="gray" onClick={() => onDetailOpen(p.id)} aria-label="Open detail">
                          <IconInfoCircle size={13} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Duplicate row" fz="xs" withArrow position="top">
                        <ActionIcon size="xs" variant="subtle" color="gray" onClick={() => onDuplicate(p)} aria-label="Duplicate">
                          <IconCopy size={13} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Delete (soft)" fz="xs" withArrow position="top">
                        <ActionIcon size="xs" variant="subtle" color="red" onClick={() => onDelete(p.id)} aria-label="Delete">
                          <IconTrash size={13} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              )
            })}
          </Table.Tbody>
        </Table>
      </Box>
      {/* Row count footer */}
      <Box px={14} py={6} style={{ borderTop: `1px solid ${borderColor}`, backgroundColor: headerBg }}>
        <Text size="xs" c="dimmed" ff="monospace">{rows.length} row{rows.length !== 1 ? 's' : ''}</Text>
      </Box>
    </Box>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function PlasmidsPage() {
  const qc = useQueryClient()
  const { formatDate, formatNumber, dateInputFormat, collator, decimalSeparator, groupSeparator } = useRegionalFormatting()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState<ColKey | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [colOrder, setColOrder] = useState<ColKey[]>(() => loadPrefs().colOrder)
  const [hiddenCols, setHiddenCols] = useState<Set<ColKey>>(() => loadPrefs().hiddenCols)
  const [colFilters, setColFilters] = useState<Partial<Record<ColKey, Set<string>>>>(() => loadPrefs().colFilters)
  const [chooserOpen, setChooserOpen] = useState(false)
  const [selectedForPrint, setSelectedForPrint] = useState<Set<number>>(new Set())
  const [printNotice, setPrintNotice] = useState<string | null>(null)
  const [printError, setPrintError] = useState<string | null>(null)
  const deferredSearch = useDeferredValue(search)

  // ─── Data queries
  const { data: svResp } = useQuery({ queryKey: ['selectionValues'], queryFn: () => window.api.selectionValues.list() })
  const statusOptions = useMemo(() => (svResp?.data ?? []) as SelectionValueRow[], [svResp?.data])
  const statusMap = useMemo(() => Object.fromEntries(statusOptions.map(sv => [sv.value, sv])) as Record<string, SelectionValueRow>, [statusOptions])

  const { data: catResp } = useQuery({ queryKey: ['categories'], queryFn: () => window.api.categories.list() })
  const categories = useMemo(() => (catResp?.data ?? []) as CategoryRow[], [catResp?.data])

  const { data: featResp } = useQuery({ queryKey: ['features'], queryFn: () => window.api.features.list() })
  const featureSet = useMemo(() => {
    const names = new Set<string>()
    const aliases = new Set<string>()
    for (const f of (featResp?.data ?? []) as FeatureRow[]) {
      names.add(f.name.toLowerCase())
      if (f.alias) aliases.add(f.alias.toLowerCase())
    }
    return { names, aliases }
  }, [featResp?.data])

  const { data: response, isLoading } = useQuery({
    queryKey: ['plasmids', deferredSearch, statusFilter],
    queryFn: () => {
      const filters: Parameters<typeof window.api.plasmids.list>[0] = {}
      if (deferredSearch) filters!.search = deferredSearch
      if (statusFilter) filters!.status = statusFilter
      return window.api.plasmids.list(Object.keys(filters!).length ? filters : undefined)
    }
  })

  const plasmids = useMemo(() => (response?.data ?? []) as Plasmid[], [response?.data])

  // ─── Persist prefs
  useEffect(() => { savePrefs(colOrder, hiddenCols, colFilters) }, [colOrder, hiddenCols, colFilters])

  // ─── ⌘N shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') { e.preventDefault(); setNewModalOpen(true) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ─── Sort
  const toggleSort = (col: ColKey) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  // ─── Column chooser
  const toggleCol = (key: ColKey) => {
    const col = ALL_COLS.find(c => c.key === key)
    if (col?.required) return
    setHiddenCols(prev => { const next = new Set(prev); if (next.has(key)) { next.delete(key) } else { next.add(key) }; return next })
  }

  const resetColOrder = () => {
    setColOrder(ALL_COL_KEYS)
    setHiddenCols(new Set(DEFAULT_HIDDEN_COLS))
  }

  // ─── Data pipeline: sort → col-filter
  const sorted = useMemo(() => {
    if (!sortBy) return plasmids
    return [...plasmids].sort((a, b) => {
      const av = getCellSortValue(sortBy, a, statusMap, categories)
      const bv = getCellSortValue(sortBy, b, statusMap, categories)
      const cmp = collator.compare(av, bv)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [plasmids, sortBy, sortDir, statusMap, categories, collator])

  const colUniqueValues = useMemo(() => {
    const result: Partial<Record<ColKey, string[]>> = {}
    for (const col of ALL_COLS) {
      result[col.key] = [...new Set(sorted.map(p => getCellFilterValue(col.key, p, statusMap, categories, formatDate, formatNumber)))].sort((a, b) =>
        collator.compare(a, b)
      )
    }
    return result
  }, [sorted, statusMap, categories, formatDate, formatNumber, collator])

  const displayed = useMemo(() => sorted.filter(p =>
    (Object.entries(colFilters) as [ColKey, Set<string>][]).every(([key, sel]) => {
      if (!sel) return true
      return sel.has(getCellFilterValue(key, p, statusMap, categories, formatDate, formatNumber))
    })
  ), [sorted, colFilters, statusMap, categories, formatDate, formatNumber])

  const activeCols = useMemo(() =>
    colOrder.filter(k => !hiddenCols.has(k)).map(k => ALL_COLS.find(c => c.key === k)!)
  , [colOrder, hiddenCols])

  // ─── Print selection
  const handlePrintToggle = (id: number) => {
    setSelectedForPrint(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handlePrintLabels = async () => {
    if (selectedForPrint.size === 0) return
    setPrintNotice(null)
    setPrintError(null)
    const resp = await window.api.labels.generate({ plasmidIds: [...selectedForPrint] })
    if (resp.success && resp.data) {
      setPrintNotice(`Saved ${resp.data.count} label${resp.data.count !== 1 ? 's' : ''} to ${resp.data.filePath}`)
    } else {
      setPrintError(resp.error ?? 'Label generation failed')
    }
  }

  // ─── Row actions
  const handleSave = async (id: number, payload: UpdatePlasmid): Promise<boolean> => {
    const resp = await window.api.plasmids.update(id, payload)
    if (resp.success) { qc.invalidateQueries({ queryKey: ['plasmids'] }); return true }
    return false
  }

  const handleDuplicate = async (p: Plasmid) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, createdAt: _ca, updatedAt: _ua, publishedAt: _pa, ...rest } = p
    await window.api.plasmids.create({ ...rest, name: `${p.name} (copy)` })
    qc.invalidateQueries({ queryKey: ['plasmids'] })
  }

  const handleDelete = async (id: number) => {
    await window.api.plasmids.delete(id)
    qc.invalidateQueries({ queryKey: ['plasmids'] })
  }

  const activeFiltersCount = Object.values(colFilters).filter(f => f !== undefined).length
  const shortcut = isMac ? '⌘N' : 'Ctrl+N'

  return (
    <Stack gap="sm">
      {/* Header */}
      <Group justify="space-between" align="flex-end">
        <Box>
          <Title order={2} ff="monospace" style={{ letterSpacing: '0.04em', fontSize: '1rem' }}>PLASMIDS</Title>
          <Text size="xs" c="dimmed" ff="monospace">
            {isLoading ? '…' : `${displayed.length} record${displayed.length !== 1 ? 's' : ''}`}
          </Text>
        </Box>
        <Group gap="xs" align="center">
          <TextInput
            aria-label="Search plasmids" placeholder="Search…" size="xs" ff="monospace"
            value={search} onChange={(e) => setSearch(e.target.value)} w={180}
            rightSection={search ? <CloseButton size="xs" aria-label="Clear search" onClick={() => setSearch('')} /> : undefined}
            rightSectionPointerEvents="all"
          />
          <StatusFilter value={statusFilter} onChange={setStatusFilter} statusOptions={statusOptions} />

          <Popover opened={chooserOpen} onChange={setChooserOpen} position="bottom-end" shadow="md" withArrow>
            <Popover.Target>
              <Tooltip label="Choose columns" withArrow fz="xs">
                <ActionIcon size="sm" variant={hiddenCols.size > 0 ? 'filled' : 'default'}
                  aria-label="Choose columns" onClick={() => setChooserOpen(o => !o)}>
                  <IconColumns size={14} />
                </ActionIcon>
              </Tooltip>
            </Popover.Target>
            <Popover.Dropdown>
              <ColumnChooser colOrder={colOrder} hiddenCols={hiddenCols} onOrderChange={setColOrder} onToggle={toggleCol} onReset={resetColOrder} />
            </Popover.Dropdown>
          </Popover>

          {selectedForPrint.size > 0 && (
            <Button
              size="xs" ff="monospace" variant="light" color="blue"
              leftSection={<IconPrinter size={13} />}
              onClick={handlePrintLabels}
            >
              Print Labels ({selectedForPrint.size})
            </Button>
          )}
          <Button size="xs" ff="monospace" onClick={() => setNewModalOpen(true)} title={`New plasmid (${shortcut})`}>
            + New Plasmid
          </Button>
        </Group>
      </Group>

      {printNotice && (
        <Notification
          color="teal" withCloseButton
          onClose={() => setPrintNotice(null)}
          title="Labels saved"
          fz="xs" ff="monospace"
        >
          {printNotice}
        </Notification>
      )}
      {printError && (
        <Notification
          color="red" withCloseButton
          onClose={() => setPrintError(null)}
          title="Label error"
          fz="xs" ff="monospace"
        >
          {printError}
        </Notification>
      )}

      {!isLoading && displayed.length > 0 && <StatusSummary rows={displayed} statusOptions={statusOptions} />}

      {activeFiltersCount > 0 && (
        <Group gap={6}>
          <Text size="xs" c="dimmed">Column filters active ({activeFiltersCount})</Text>
          <Button size="xs" variant="subtle" color="gray" h={20} px={6} fz="xs"
            onClick={() => setColFilters({} as Partial<Record<ColKey, Set<string>>>)}>
            Clear all
          </Button>
        </Group>
      )}

      <Text size="xs" c="dimmed" ff="monospace" style={{ opacity: 0.6 }}>
        Click a cell to edit · Tab to move · ID to open full detail · Ctrl+C/V to copy/paste
      </Text>

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {isLoading ? 'Loading plasmids…' : `${displayed.length} plasmids loaded`}
      </div>

      <NewPlasmidModal opened={newModalOpen} onClose={() => setNewModalOpen(false)} />
      <PlasmidDetailModal plasmidId={detailId} onClose={() => setDetailId(null)} />

      {isLoading ? (
        <TableSkeleton />
      ) : displayed.length === 0 ? (
        <EmptyState />
      ) : (
        <PlasmidTable
          rows={displayed}
          activeCols={activeCols}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={toggleSort}
          colFilters={colFilters}
          onColFilter={(key, filter) => setColFilters(prev => {
            const next = { ...prev }
            if (filter === undefined) delete next[key]
            else next[key] = filter
            return next
          })}
          colUniqueValues={colUniqueValues}
          statusMap={statusMap}
          categories={categories}
          featureSet={featureSet}
          onSave={handleSave}
          onDetailOpen={setDetailId}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          formatDate={formatDate}
          formatNumber={formatNumber}
          dateInputFormat={dateInputFormat}
          decimalSeparator={decimalSeparator}
          groupSeparator={groupSeparator}
          selectedForPrint={selectedForPrint}
          onPrintToggle={handlePrintToggle}
      />
      )}
    </Stack>
  )
}
