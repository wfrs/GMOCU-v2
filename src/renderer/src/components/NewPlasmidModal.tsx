import {
  Box,
  Button,
  Divider,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  useMantineColorScheme,
  useMantineTheme
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { IconDna, IconX } from '@tabler/icons-react'
import type { CreatePlasmid } from '@shared/ipc-schemas'
import type { SettingsRow, SelectionValueRow } from '@shared/types'
import { useRegionalFormatting } from '@renderer/lib/regional-format'

interface Props {
  opened: boolean
  onClose: () => void
}

function FormSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Stack gap={8}>
      <Text size="xs" fw={600} c="dimmed" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </Text>
      {children}
    </Stack>
  )
}

interface GenbankMeta { name: string; sequenceLength: number; content: string }

function GenbankDropZone({
  value,
  onChange
}: {
  value: GenbankMeta | null
  onChange: (meta: GenbankMeta | null) => void
}) {
  const { formatInteger } = useRegionalFormatting()
  const { colorScheme } = useMantineColorScheme()
  const theme = useMantineTheme()
  const isDark = colorScheme === 'dark'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return
    setError(null)
    setLoading(true)
    try {
      const content = await file.text()
      const resp = await window.api.files.parseGenbankContent(content)
      if (!resp.success || !resp.data) {
        setError(resp.error ?? 'Failed to parse file')
      } else {
        onChange(resp.data)
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [onChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/plain': ['.gb', '.gbk', '.genbank'] },
    maxFiles: 1,
    noClick: !!value
  })

  const accentScale = theme.colors[theme.primaryColor] ?? theme.colors.teal

  if (value) {
    return (
      <Box
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          borderRadius: 8,
          backgroundColor: isDark ? `${accentScale[8]}55` : `${accentScale[0]}`,
          border: `1px solid ${isDark ? accentScale[7] : accentScale[3]}`,
        }}
      >
        <IconDna size={18} color={isDark ? accentScale[4] : accentScale[7]} style={{ flexShrink: 0 }} />
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={500} style={{ lineHeight: 1.2 }}>{value.name}</Text>
          <Text size="xs" c="dimmed">{formatInteger(value.sequenceLength)} bp · GenBank sequence loaded</Text>
        </Box>
        <Box
          component="button"
          onClick={() => onChange(null)}
          aria-label="Remove GenBank file"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, display: 'flex', color: isDark ? theme.colors.dark[2] : theme.colors.gray[6] }}
        >
          <IconX size={14} />
        </Box>
      </Box>
    )
  }

  return (
    <Box
      {...getRootProps()}
      style={{
        padding: '20px 16px',
        borderRadius: 8,
        border: `1.5px dashed ${isDragActive ? accentScale[5] : isDark ? theme.colors.dark[4] : theme.colors.gray[3]}`,
        backgroundColor: isDragActive
          ? isDark ? `${accentScale[8]}33` : `${accentScale[0]}`
          : isDark ? theme.colors.dark[7] : theme.colors.gray[0],
        cursor: 'pointer',
        transition: 'border-color 0.15s, background-color 0.15s',
        textAlign: 'center'
      }}
    >
      <input {...getInputProps()} />
      <Stack align="center" gap={6}>
        <IconDna size={22} color={isDark ? theme.colors.dark[3] : theme.colors.gray[5]} />
        <Text size="sm" c="dimmed">
          {loading ? 'Parsing…' : isDragActive ? 'Drop to load' : 'Drop a GenBank file, or click to browse'}
        </Text>
        <Text size="xs" c="dimmed" style={{ opacity: 0.6 }}>.gb · .gbk · .genbank</Text>
      </Stack>
      {error && <Text size="xs" c="red" mt={6}>{error}</Text>}
    </Box>
  )
}

export function NewPlasmidModal({ opened, onClose }: Props) {
  const qc = useQueryClient()
  const { dateInputFormat, decimalSeparator, groupSeparator } = useRegionalFormatting()
  const { colorScheme } = useMantineColorScheme()
  const theme = useMantineTheme()
  const isDark = colorScheme === 'dark'
  const [genbank, setGenbank] = useState<GenbankMeta | null>(null)

  const { data: settingsResp } = useQuery({
    queryKey: ['settings'],
    queryFn: () => window.api.settings.get()
  })
  const settings = settingsResp?.data as SettingsRow | undefined

  const { data: svResp } = useQuery({
    queryKey: ['selectionValues'],
    queryFn: () => window.api.selectionValues.list()
  })
  const statusOptions = (svResp?.data ?? []) as SelectionValueRow[]

  const form = useForm<{
    name: string
    cassette: string
    status: string
    purpose: string
    clonedBy: string
    concentration: number | ''
    dateCreated: Date | null
    dateSequenced: Date | null
    sequencingResult: 'pending' | 'passed' | 'failed' | ''
    description: string
  }>({
    initialValues: {
      name: '',
      cassette: '',
      status: 'planned',
      purpose: '',
      clonedBy: '',
      concentration: '',
      dateCreated: new Date(),
      dateSequenced: null,
      sequencingResult: '',
      description: ''
    },
    validate: {
      name: (v) => (v.trim().length === 0 ? 'Name is required' : null)
    }
  })

  // Reset form and genbank when modal opens
  useEffect(() => {
    if (opened) {
      form.reset()
      setGenbank(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened])

  // Auto-fill name from GenBank LOCUS when a file is loaded
  const handleGenbankChange = (meta: GenbankMeta | null) => {
    setGenbank(meta)
    if (meta && !form.values.name.trim()) {
      form.setFieldValue('name', meta.name)
    }
  }

  const { mutate, isPending } = useMutation({
    mutationFn: (values: CreatePlasmid) => window.api.plasmids.create(values),
    onSuccess: (resp) => {
      if (resp.success) {
        qc.invalidateQueries({ queryKey: ['plasmids'] })
        onClose()
      }
    }
  })

  const handleSubmit = form.onSubmit((values) => {
    const payload: CreatePlasmid = {
      name: values.name.trim(),
      cassette: values.cassette.trim() || undefined,
      status: values.status,
      purpose: values.purpose.trim() || undefined,
      clonedBy: values.clonedBy.trim() || undefined,
      concentration: values.concentration !== '' ? Number(values.concentration) : undefined,
      dateCreated: values.dateCreated ?? undefined,
      dateSequenced: values.dateSequenced ?? undefined,
      sequencingResult: values.sequencingResult || undefined,
      description: values.description.trim() || undefined,
      creatorName: settings?.userName ?? '',
      creatorInitials: settings?.userInitials ?? ''
    }
    mutate(payload)
  })

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text fw={600} size="md">New Plasmid</Text>}
      size="lg"
      centered
      styles={{
        content: { borderRadius: 12 },
        header: {
          borderBottom: `1px solid ${isDark ? theme.colors.dark[5] : theme.colors.gray[2]}`,
          paddingBottom: 12,
          marginBottom: 0
        },
        body: { padding: 20 }
      }}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap={20}>

          {/* GenBank file */}
          <FormSection label="Sequence File">
            <GenbankDropZone value={genbank} onChange={handleGenbankChange} />
          </FormSection>

          <Divider />

          {/* Identity */}
          <FormSection label="Identity">
            <TextInput
              label="Name"
              placeholder="e.g. pJL001-GFP-35S"
              required
              {...form.getInputProps('name')}
            />
            <Group grow gap="md">
              <Select
                label="Status"
                data={statusOptions.length
                  ? statusOptions.map((sv) => ({ value: sv.value, label: sv.label }))
                  : [{ value: 'planned', label: 'Planned' }]
                }
                {...form.getInputProps('status')}
              />
              <TextInput
                label="Creator"
                value={
                  settings
                    ? [settings.userInitials, settings.userName].filter(Boolean).join(' · ')
                    : '—'
                }
                readOnly
                styles={{ input: { color: isDark ? theme.colors.dark[2] : theme.colors.gray[6] } }}
              />
            </Group>
          </FormSection>

          <Divider />

          <TextInput
            label="Cassette"
            placeholder="e.g. 35S-GFP-NOS"
            description="Dash-separated feature tokens (optional)"
            styles={{ input: { fontFamily: 'monospace' } }}
            {...form.getInputProps('cassette')}
          />

          <Divider />

          {/* Lab details */}
          <FormSection label="Lab Details">
            <TextInput
              label="Purpose"
              placeholder="e.g. Overexpression of GFP in Arabidopsis"
              {...form.getInputProps('purpose')}
            />
            <Group grow gap="md">
              <TextInput
                label="Cloned by"
                placeholder="e.g. RS"
                {...form.getInputProps('clonedBy')}
              />
              <NumberInput
                label="Concentration (ng/µL)"
                placeholder="e.g. 250"
                min={0}
                decimalScale={1}
                decimalSeparator={decimalSeparator}
                thousandSeparator={groupSeparator}
                {...form.getInputProps('concentration')}
              />
            </Group>
            <DatePickerInput
              label="Date created"
              placeholder="Select date"
              clearable
              valueFormat={dateInputFormat}
              {...form.getInputProps('dateCreated')}
            />
          </FormSection>

          <Divider />

          {/* Sequencing */}
          <FormSection label="Sequencing">
            <Group grow gap="md">
              <DatePickerInput
                label="Date sequenced"
                placeholder="Select date"
                clearable
                valueFormat={dateInputFormat}
                {...form.getInputProps('dateSequenced')}
              />
              <Select
                label="Result"
                placeholder="—"
                clearable
                data={[
                  { value: 'pending', label: 'Pending' },
                  { value: 'passed', label: 'Passed' },
                  { value: 'failed', label: 'Failed' }
                ]}
                {...form.getInputProps('sequencingResult')}
              />
            </Group>
          </FormSection>

          <Divider />

          {/* Notes */}
          <FormSection label="Notes">
            <Textarea
              label="Description"
              placeholder="Additional notes about this plasmid…"
              autosize
              minRows={2}
              maxRows={5}
              {...form.getInputProps('description')}
            />
          </FormSection>

          {/* Actions */}
          <Group justify="flex-end" pt={4}>
            <Button variant="subtle" color="gray" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" loading={isPending}>
              Create Plasmid
            </Button>
          </Group>

        </Stack>
      </form>
    </Modal>
  )
}
