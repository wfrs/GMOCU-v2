import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
  useMantineColorScheme,
  useMantineTheme
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { IconClipboardCopy, IconCopy, IconPlus, IconTrash } from '@tabler/icons-react'
import { useEffect, useMemo, useState } from 'react'
import { CreateGMOSchema, type CreateGMO, type UpdateGMO } from '@shared/ipc-schemas'
import type { GMORow, OrganismRow, SettingsRow } from '@shared/types'
import { useRegionalFormatting } from '@renderer/lib/regional-format'

const RG_COLORS: Record<number, string> = { 1: 'green', 2: 'yellow', 3: 'orange', 4: 'red' }
const GMO_CLIPBOARD_PREFIX = 'jlab-gmo:'

type Feedback = { tone: 'error' | 'success'; text: string } | null

type GmoFormValues = {
  hostOrganismId: string
  strain: string
  approval: string
  createdDate: Date | null
  destroyedDate: Date | null
  glycerolStockId: string
  dateGlycerolStock: Date | null
  box: string
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

function normalizeOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function toTimestamp(value: Date | string | null | undefined): number | null {
  if (!value) return null
  return new Date(value).getTime()
}

function buildFormValues(row: GMORow): GmoFormValues {
  return {
    hostOrganismId: row.hostOrganismId != null ? String(row.hostOrganismId) : '',
    strain: row.strain ?? '',
    approval: row.approval ?? '',
    createdDate: row.createdDate ? new Date(row.createdDate) : null,
    destroyedDate: row.destroyedDate ? new Date(row.destroyedDate) : null,
    glycerolStockId: row.glycerolStockId ?? '',
    dateGlycerolStock: row.dateGlycerolStock ? new Date(row.dateGlycerolStock) : null,
    box: row.box ?? ''
  }
}

function buildCreatePayload(values: GmoFormValues): CreateGMO {
  return {
    hostOrganismId: values.hostOrganismId ? parseInt(values.hostOrganismId, 10) : null,
    strain: normalizeOptionalText(values.strain),
    approval: normalizeOptionalText(values.approval),
    createdDate: values.createdDate ?? null,
    destroyedDate: values.destroyedDate ?? null,
    glycerolStockId: normalizeOptionalText(values.glycerolStockId),
    dateGlycerolStock: values.dateGlycerolStock ?? null,
    box: normalizeOptionalText(values.box)
  }
}

async function readClipboardGmo(): Promise<CreateGMO | null> {
  const raw = await navigator.clipboard.readText()
  if (!raw.startsWith(GMO_CLIPBOARD_PREFIX)) return null

  const parsed = CreateGMOSchema.safeParse(JSON.parse(raw.slice(GMO_CLIPBOARD_PREFIX.length)))
  return parsed.success ? parsed.data : null
}

interface GmoRowCardProps {
  row: GMORow
  organismOptions: Array<{ value: string; label: string }>
  organismMap: Map<number, OrganismRow>
  dateInputFormat: string
  rowBusy: boolean
  onSave: (id: number, patch: UpdateGMO) => Promise<void>
  onCopy: (payload: CreateGMO) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

function GmoRowCard({
  row,
  organismOptions,
  organismMap,
  dateInputFormat,
  rowBusy,
  onSave,
  onCopy,
  onDelete
}: GmoRowCardProps) {
  const theme = useMantineTheme()
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  const form = useForm<GmoFormValues>({ initialValues: buildFormValues(row) })

  useEffect(() => {
    form.setValues(buildFormValues(row))
  }, [form, row])

  const currentOrganismId = form.values.hostOrganismId ? parseInt(form.values.hostOrganismId, 10) : null
  const currentOrganism = currentOrganismId != null ? organismMap.get(currentOrganismId) : undefined
  const borderColor = isDark ? theme.colors.dark[4] : theme.colors.gray[2]
  const cardBg = isDark ? theme.colors.dark[6] : theme.white

  return (
    <Box
      style={{
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        padding: 14,
        backgroundColor: cardBg
      }}
    >
      <Stack gap={12}>
        <Group justify="space-between" align="flex-start">
          <Group gap={8}>
            <Text size="sm" fw={600} ff="monospace">
              GMO #{row.id}
            </Text>
            {currentOrganism?.riskGroup ? (
              <Badge color={RG_COLORS[currentOrganism.riskGroup] ?? 'gray'} variant="light" size="sm">
                RG {currentOrganism.riskGroup}
              </Badge>
            ) : (
              <Badge color="gray" variant="light" size="sm">
                RG pending
              </Badge>
            )}
            {row.destroyedDate ? (
              <Badge color="gray" variant="outline" size="sm">
                Destroyed
              </Badge>
            ) : (
              <Badge color="green" variant="dot" size="sm">
                Active
              </Badge>
            )}
          </Group>
          <Group gap={4}>
            <Button
              size="xs"
              variant="subtle"
              color="gray"
              leftSection={<IconCopy size={12} />}
              onClick={() => onCopy(buildCreatePayload(form.values))}
              disabled={rowBusy}
            >
              Copy row
            </Button>
            <ActionIcon
              size="sm"
              variant="subtle"
              color="red"
              aria-label="Delete GMO"
              onClick={() => onDelete(row.id)}
              disabled={rowBusy}
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Group>
        </Group>

        <Group grow align="flex-start">
          <Select
            label="Organism"
            searchable
            clearable
            data={organismOptions}
            value={form.values.hostOrganismId || null}
            onChange={async (value) => {
              form.setFieldValue('hostOrganismId', value ?? '')
              await onSave(row.id, { hostOrganismId: value ? parseInt(value, 10) : null })
            }}
            comboboxProps={{ withinPortal: true }}
            nothingFoundMessage="No organisms found"
            disabled={rowBusy}
          />
          <TextInput
            label="Strain"
            placeholder="e.g. TOP10, GV3101"
            value={form.values.strain}
            onChange={(event) => form.setFieldValue('strain', event.currentTarget.value)}
            onBlur={async () => {
              const next = normalizeOptionalText(form.values.strain)
              form.setFieldValue('strain', next ?? '')
              if (next !== (row.strain ?? null)) await onSave(row.id, { strain: next })
            }}
            disabled={rowBusy}
          />
          <TextInput
            label="Risk group"
            value={currentOrganism?.riskGroup ? `RG ${currentOrganism.riskGroup}` : '—'}
            readOnly
            styles={{ input: { fontFamily: 'monospace', color: isDark ? theme.colors.dark[1] : theme.colors.gray[7] } }}
          />
        </Group>

        <Group grow align="flex-start">
          <DatePickerInput
            label="Date generated"
            clearable
            valueFormat={dateInputFormat}
            value={form.values.createdDate}
            onChange={async (value) => {
              form.setFieldValue('createdDate', value)
              if (toTimestamp(value) !== toTimestamp(row.createdDate)) await onSave(row.id, { createdDate: value ?? null })
            }}
            disabled={rowBusy}
          />
          <DatePickerInput
            label="Date destroyed"
            clearable
            valueFormat={dateInputFormat}
            value={form.values.destroyedDate}
            onChange={async (value) => {
              form.setFieldValue('destroyedDate', value)
              if (toTimestamp(value) !== toTimestamp(row.destroyedDate)) await onSave(row.id, { destroyedDate: value ?? null })
            }}
            disabled={rowBusy}
          />
          <TextInput
            label="Approval"
            placeholder="Approval / reference"
            value={form.values.approval}
            onChange={(event) => form.setFieldValue('approval', event.currentTarget.value)}
            onBlur={async () => {
              const next = normalizeOptionalText(form.values.approval)
              form.setFieldValue('approval', next ?? '')
              if (next !== (row.approval ?? null)) await onSave(row.id, { approval: next })
            }}
            disabled={rowBusy}
          />
        </Group>

        <Group grow align="flex-start">
          <TextInput
            label="Glycerol stock ID"
            placeholder="e.g. CJM001"
            value={form.values.glycerolStockId}
            onChange={(event) => form.setFieldValue('glycerolStockId', event.currentTarget.value)}
            onBlur={async () => {
              const next = normalizeOptionalText(form.values.glycerolStockId)
              form.setFieldValue('glycerolStockId', next ?? '')
              if (next !== (row.glycerolStockId ?? null)) await onSave(row.id, { glycerolStockId: next })
            }}
            disabled={rowBusy}
          />
          <DatePickerInput
            label="Date glycerol stock"
            clearable
            valueFormat={dateInputFormat}
            value={form.values.dateGlycerolStock}
            onChange={async (value) => {
              form.setFieldValue('dateGlycerolStock', value)
              if (toTimestamp(value) !== toTimestamp(row.dateGlycerolStock)) await onSave(row.id, { dateGlycerolStock: value ?? null })
            }}
            disabled={rowBusy}
          />
          <TextInput
            label="Box"
            placeholder="Freezer box"
            value={form.values.box}
            onChange={(event) => form.setFieldValue('box', event.currentTarget.value)}
            onBlur={async () => {
              const next = normalizeOptionalText(form.values.box)
              form.setFieldValue('box', next ?? '')
              if (next !== (row.box ?? null)) await onSave(row.id, { box: next })
            }}
            disabled={rowBusy}
          />
        </Group>
      </Stack>
    </Box>
  )
}

export function PlasmidGmoSection({ plasmidId }: { plasmidId: number }) {
  const qc = useQueryClient()
  const { dateInputFormat } = useRegionalFormatting()
  const theme = useMantineTheme()
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [toolbarBusy, setToolbarBusy] = useState<'add' | 'paste' | 'favourites' | null>(null)
  const [rowBusyId, setRowBusyId] = useState<number | null>(null)

  const { data: gmoResp, isLoading } = useQuery({
    queryKey: ['gmos', plasmidId],
    queryFn: () => window.api.gmos.list(plasmidId),
    enabled: plasmidId > 0
  })
  const { data: orgResp } = useQuery({
    queryKey: ['organisms'],
    queryFn: () => window.api.organisms.list()
  })
  const { data: settingsResp } = useQuery({
    queryKey: ['settings'],
    queryFn: () => window.api.settings.get()
  })

  const rows = ((gmoResp?.data ?? []) as GMORow[]).slice().sort((left, right) => left.id - right.id)
  const organisms = (orgResp?.data ?? []) as OrganismRow[]
  const settings = settingsResp?.data as SettingsRow | undefined
  const favouriteValues = parseJsonStringArray(settings?.favouriteOrganisms)
  const organismOptions = useMemo(
    () =>
      organisms.map((organism) => ({
        value: String(organism.id),
        label: organism.shortName ? `${organism.name} · ${organism.shortName}` : organism.name
      })),
    [organisms]
  )
  const organismMap = useMemo(() => new Map(organisms.map((organism) => [organism.id, organism])), [organisms])

  const invalidateGmos = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['gmos', plasmidId] }),
      qc.invalidateQueries({ queryKey: ['gmos'] })
    ])
  }

  const createGmo = async (payload: CreateGMO) => {
    const resp = await window.api.gmos.create({ ...payload, plasmidId })
    if (!resp.success) throw new Error(resp.error ?? 'Failed to create GMO')
  }

  const handleAddBlank = async () => {
    setToolbarBusy('add')
    setFeedback(null)
    try {
      await createGmo({ plasmidId })
      await invalidateGmos()
      setFeedback({ tone: 'success', text: 'Added a blank GMO row.' })
    } catch (error) {
      setFeedback({ tone: 'error', text: String(error) })
    } finally {
      setToolbarBusy(null)
    }
  }

  const handlePaste = async () => {
    setToolbarBusy('paste')
    setFeedback(null)
    try {
      const payload = await readClipboardGmo()
      if (!payload) throw new Error('Clipboard does not contain a copied jLab GMO row.')
      await createGmo(payload)
      await invalidateGmos()
      setFeedback({ tone: 'success', text: 'Pasted GMO row from clipboard.' })
    } catch (error) {
      setFeedback({ tone: 'error', text: String(error) })
    } finally {
      setToolbarBusy(null)
    }
  }

  const handleAddFavouriteOrganisms = async () => {
    setToolbarBusy('favourites')
    setFeedback(null)

    try {
      if (favouriteValues.length === 0) {
        throw new Error('No favourite organisms are configured in Settings.')
      }

      const organismByKey = new Map<string, OrganismRow>()
      for (const organism of organisms) {
        organismByKey.set(organism.name.toLowerCase(), organism)
        if (organism.shortName) organismByKey.set(organism.shortName.toLowerCase(), organism)
      }

      const matched = favouriteValues
        .map((value) => organismByKey.get(value.toLowerCase()))
        .filter((organism): organism is OrganismRow => Boolean(organism))
        .filter((organism, index, array) => array.findIndex((item) => item.id === organism.id) === index)

      if (matched.length === 0) {
        throw new Error('Favourite organisms are configured, but none match the current glossary entries.')
      }

      const existingHostIds = new Set(rows.map((row) => row.hostOrganismId).filter((id): id is number => id != null))
      const missing = matched.filter((organism) => !existingHostIds.has(organism.id))

      if (missing.length === 0) {
        setFeedback({ tone: 'success', text: 'All favourite organisms are already present for this plasmid.' })
        return
      }

      for (const organism of missing) {
        await createGmo({ plasmidId, hostOrganismId: organism.id })
      }

      await invalidateGmos()
      setFeedback({
        tone: 'success',
        text: `Added ${missing.length} favourite organism${missing.length === 1 ? '' : 's'} to this plasmid.`
      })
    } catch (error) {
      setFeedback({ tone: 'error', text: String(error) })
    } finally {
      setToolbarBusy(null)
    }
  }

  const handleUpdate = async (id: number, patch: UpdateGMO) => {
    setRowBusyId(id)
    setFeedback(null)
    try {
      const resp = await window.api.gmos.update(id, patch)
      if (!resp.success) throw new Error(resp.error ?? 'Failed to update GMO')
      await invalidateGmos()
    } catch (error) {
      setFeedback({ tone: 'error', text: String(error) })
    } finally {
      setRowBusyId((current) => (current === id ? null : current))
    }
  }

  const handleCopy = async (payload: CreateGMO) => {
    setFeedback(null)
    try {
      await navigator.clipboard.writeText(`${GMO_CLIPBOARD_PREFIX}${JSON.stringify(payload)}`)
      setFeedback({ tone: 'success', text: 'Copied GMO row to clipboard.' })
    } catch (error) {
      setFeedback({ tone: 'error', text: String(error) })
    }
  }

  const handleDelete = async (id: number) => {
    setRowBusyId(id)
    setFeedback(null)
    try {
      const resp = await window.api.gmos.delete(id)
      if (!resp.success) throw new Error(resp.error ?? 'Failed to delete GMO')
      await invalidateGmos()
      setFeedback({ tone: 'success', text: 'Deleted GMO row.' })
    } catch (error) {
      setFeedback({ tone: 'error', text: String(error) })
    } finally {
      setRowBusyId((current) => (current === id ? null : current))
    }
  }

  return (
    <Stack gap={12}>
      <Group justify="space-between" align="flex-start">
        <Box>
          <Text size="xs" fw={600} c="dimmed" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            GMO Entries
          </Text>
          <Text size="sm" c="dimmed" mt={2}>
            Track host organism, RG, approval, generated or destroyed dates, and glycerol storage for this plasmid.
          </Text>
        </Box>
        <Group gap={6}>
          <Button
            size="xs"
            variant="default"
            leftSection={<IconPlus size={14} />}
            onClick={handleAddBlank}
            loading={toolbarBusy === 'add'}
          >
            Add GMO
          </Button>
          <Button
            size="xs"
            variant="default"
            leftSection={<IconClipboardCopy size={14} />}
            onClick={handlePaste}
            loading={toolbarBusy === 'paste'}
          >
            Paste GMO Row
          </Button>
          <Button
            size="xs"
            variant="light"
            onClick={handleAddFavouriteOrganisms}
            loading={toolbarBusy === 'favourites'}
            disabled={favouriteValues.length === 0}
          >
            Add Favourite Organisms
          </Button>
        </Group>
      </Group>

      {feedback && (
        <Box
          style={{
            borderRadius: 8,
            padding: '8px 10px',
            backgroundColor: feedback.tone === 'error'
              ? (isDark ? `${theme.colors.red[9]}55` : theme.colors.red[0])
              : (isDark ? `${theme.colors.teal[9]}55` : theme.colors.teal[0])
          }}
        >
          <Text size="xs" c={feedback.tone === 'error' ? 'red.8' : 'teal.8'}>
            {feedback.text}
          </Text>
        </Box>
      )}

      {isLoading ? (
        <Text size="sm" c="dimmed">
          Loading GMO entries…
        </Text>
      ) : rows.length === 0 ? (
        <Box
          style={{
            border: `1px dashed ${isDark ? theme.colors.dark[4] : theme.colors.gray[3]}`,
            borderRadius: 10,
            padding: 18
          }}
        >
          <Text size="sm" c="dimmed">
            No GMO entries for this plasmid yet.
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            Use “Add GMO” for a blank row, paste a copied GMO row, or batch-add your configured favourite organisms.
          </Text>
        </Box>
      ) : (
        <Stack gap={10}>
          {rows.map((row) => (
            <GmoRowCard
              key={row.id}
              row={row}
              organismOptions={organismOptions}
              organismMap={organismMap}
              dateInputFormat={dateInputFormat}
              rowBusy={rowBusyId === row.id}
              onSave={handleUpdate}
              onCopy={handleCopy}
              onDelete={handleDelete}
            />
          ))}
        </Stack>
      )}
    </Stack>
  )
}
