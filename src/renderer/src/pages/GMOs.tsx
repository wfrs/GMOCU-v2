import { Fragment, useMemo, useState } from 'react'
import {
  Alert, Badge, Box, Button, Group, Modal, Select, Stack,
  Radio, Table, Text, TextInput, Textarea, ActionIcon,
  useMantineColorScheme, useMantineTheme
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { IconAlertTriangle, IconFileSpreadsheet, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react'
import type { FormblattLanguage, FormblattValidationResult, GMORow, OrganismRow, PlasmidRow } from '@shared/types'
import type { CreateGMO } from '@shared/ipc-schemas'
import { useRegionalFormatting } from '@renderer/lib/regional-format'

const RG_COLORS: Record<number, string> = { 1: 'green', 2: 'yellow', 3: 'orange', 4: 'red' }

function startOfYear(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), 0, 1)
}

function isoDate(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : 'none'
}

type ReportScope = 'all' | 'date_range'

function GMOModal({ opened, onClose, initial }: { opened: boolean; onClose: () => void; initial?: GMORow }) {
  const qc = useQueryClient()
  const { dateInputFormat } = useRegionalFormatting()

  const { data: orgsResp } = useQuery({ queryKey: ['organisms'], queryFn: () => window.api.organisms.list() })
  const { data: plasmidsResp } = useQuery({ queryKey: ['plasmids'], queryFn: () => window.api.plasmids.list() })
  const organisms = (orgsResp?.data ?? []) as OrganismRow[]
  const plasmids = (plasmidsResp?.data ?? []) as PlasmidRow[]

  const form = useForm<{
    plasmidId: string
    hostOrganismId: string
    strain: string
    approval: string
    createdDate: Date | null
    destroyedDate: Date | null
    glycerolStockId: string
    box: string
    notes: string
  }>({
    initialValues: {
      plasmidId: initial?.plasmidId ? String(initial.plasmidId) : '',
      hostOrganismId: initial?.hostOrganismId ? String(initial.hostOrganismId) : '',
      strain: initial?.strain ?? '',
      approval: initial?.approval ?? '',
      createdDate: initial?.createdDate ? new Date(initial.createdDate) : new Date(),
      destroyedDate: initial?.destroyedDate ? new Date(initial.destroyedDate) : null,
      glycerolStockId: initial?.glycerolStockId ?? '',
      box: initial?.box ?? '',
      notes: initial?.notes ?? ''
    }
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (data: CreateGMO) =>
      initial ? window.api.gmos.update(initial.id, data) : window.api.gmos.create(data),
    onSuccess: (resp) => {
      if (resp.success) { qc.invalidateQueries({ queryKey: ['gmos'] }); onClose() }
    }
  })

  const handleSubmit = form.onSubmit((v) => {
    mutate({
      plasmidId: v.plasmidId ? parseInt(v.plasmidId) : null,
      hostOrganismId: v.hostOrganismId ? parseInt(v.hostOrganismId) : null,
      strain: v.strain.trim() || null,
      approval: v.approval.trim() || null,
      createdDate: v.createdDate,
      destroyedDate: v.destroyedDate,
      glycerolStockId: v.glycerolStockId.trim() || null,
      box: v.box.trim() || null,
      notes: v.notes.trim() || null
    })
  })

  return (
    <Modal opened={opened} onClose={onClose} title={<Text fw={600}>{initial ? 'Edit GMO' : 'New GMO'}</Text>} centered size="md">
      <form onSubmit={handleSubmit}>
        <Stack gap={12}>
          <Group grow gap="md">
            <Select
              label="Host organism"
              placeholder="Select…"
              clearable
              data={organisms.map((o) => ({ value: String(o.id), label: o.name }))}
              value={form.values.hostOrganismId || null}
              onChange={(v) => form.setFieldValue('hostOrganismId', v ?? '')}
            />
            <Select
              label="Plasmid"
              placeholder="Select…"
              clearable
              searchable
              data={plasmids.map((p) => ({ value: String(p.id), label: p.name }))}
              value={form.values.plasmidId || null}
              onChange={(v) => form.setFieldValue('plasmidId', v ?? '')}
            />
          </Group>
          <Group grow gap="md">
            <TextInput label="Strain" placeholder="e.g. TOP10, GV3101" {...form.getInputProps('strain')} />
            <TextInput label="Approval ref." placeholder="e.g. BVL-2024-001" {...form.getInputProps('approval')} />
          </Group>
          <Group grow gap="md">
            <DatePickerInput label="Created" clearable valueFormat={dateInputFormat} {...form.getInputProps('createdDate')} />
            <DatePickerInput label="Destroyed" clearable valueFormat={dateInputFormat} {...form.getInputProps('destroyedDate')} />
          </Group>
          <Group grow gap="md">
            <TextInput label="Glycerol stock ID" placeholder="e.g. CJM001" {...form.getInputProps('glycerolStockId')} />
            <TextInput label="Box" placeholder="Freezer box label" {...form.getInputProps('box')} />
          </Group>
          <Textarea label="Notes" placeholder="Summary, conditions, storage…" autosize minRows={2} maxRows={4} {...form.getInputProps('notes')} />
          <Group justify="flex-end" pt={4}>
            <Button variant="subtle" color="gray" onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" loading={isPending}>{initial ? 'Save' : 'Create'}</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}

export function GMOsPage() {
  const qc = useQueryClient()
  const { dateInputFormat, formatDate } = useRegionalFormatting()
  const { colorScheme } = useMantineColorScheme()
  const theme = useMantineTheme()
  const isDark = colorScheme === 'dark'
  const [modal, setModal] = useState<{ open: boolean; row?: GMORow }>({ open: false })
  const [reportScope, setReportScope] = useState<ReportScope>('all')
  const [reportLanguage, setReportLanguage] = useState<FormblattLanguage>('de')
  const [dateFrom, setDateFrom] = useState<Date | null>(() => startOfYear())
  const [dateTo, setDateTo] = useState<Date | null>(() => new Date())
  const [reportFeedback, setReportFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const { data: resp, isLoading } = useQuery({ queryKey: ['gmos'], queryFn: () => window.api.gmos.list() })
  const rows = (resp?.data ?? []) as GMORow[]

  const { data: orgsResp } = useQuery({ queryKey: ['organisms'], queryFn: () => window.api.organisms.list() })
  const orgMap = new Map(((orgsResp?.data ?? []) as OrganismRow[]).map((o) => [o.id, o]))

  const { mutate: del } = useMutation({
    mutationFn: (id: number) => window.api.gmos.delete(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['gmos'] })
      await qc.invalidateQueries({ queryKey: ['gmos', 'formblattValidation'] })
    }
  })

  const reportParams = useMemo(
    () => (reportScope === 'all' ? {} : { dateFrom, dateTo }),
    [reportScope, dateFrom, dateTo]
  )

  const validationKey = useMemo(
    () => ['gmos', 'formblattValidation', reportScope, isoDate(dateFrom), isoDate(dateTo), rows.map((row) => `${row.id}:${row.approval ?? ''}:${row.plasmidId ?? ''}:${row.hostOrganismId ?? ''}:${row.createdDate ? new Date(row.createdDate).toISOString() : ''}:${row.destroyedDate ? new Date(row.destroyedDate).toISOString() : ''}`).join('|')],
    [reportScope, dateFrom, dateTo, rows]
  )

  const { data: validationResp, isFetching: validationBusy } = useQuery({
    queryKey: validationKey,
    queryFn: () => window.api.gmos.validateFormblatt(reportParams)
  })

  const validationError = validationResp?.success === false ? validationResp.error ?? 'Validation failed.' : null
  const validation = validationResp?.data as FormblattValidationResult | undefined
  const invalidRows = useMemo(
    () => new Map((validation?.rows ?? []).filter((row) => row.included && !row.valid).map((row) => [row.gmoId, row])),
    [validation]
  )

  const canGenerate = Boolean(
    validation &&
    !validationError &&
    validation.includedCount > 0 &&
    validation.invalidCount === 0 &&
    validation.fileIssues.length === 0 &&
    (reportScope === 'all' || (dateFrom && dateTo))
  )

  const { mutate: generateFormblatt, isPending: generating } = useMutation({
    mutationFn: () => window.api.gmos.generateFormblatt({ lang: reportLanguage, ...reportParams }),
    onSuccess: async (response) => {
      if (!response.success) {
        if (response.error === 'Save cancelled') return
        setReportFeedback({ tone: 'error', text: response.error ?? 'Failed to generate Formblatt-Z.' })
        await qc.invalidateQueries({ queryKey: ['gmos', 'formblattValidation'] })
        return
      }

      setReportFeedback({
        tone: 'success',
        text: `Saved ${response.data?.rowCount ?? 0} Formblatt-Z row(s) to ${response.data?.filePath}.`
      })
      await qc.invalidateQueries({ queryKey: ['gmos', 'formblattValidation'] })
    }
  })

  const headerBg = isDark ? theme.colors.dark[6] : theme.colors.gray[0]
  const invalidRowBg = isDark ? 'rgba(250, 82, 82, 0.12)' : 'rgba(224, 49, 49, 0.08)'

  return (
    <Stack gap={16}>
      <Group justify="space-between">
        <Box>
          <Text fw={600} size="xl">GMOs</Text>
          <Text size="xs" c="dimmed">Genetically modified organisms — track creation and destruction dates</Text>
        </Box>
        <Button leftSection={<IconPlus size={15} />} size="sm" onClick={() => setModal({ open: true })}>
          Add GMO
        </Button>
      </Group>

      <Box
        style={{
          borderRadius: 8,
          border: `1px solid ${isDark ? theme.colors.dark[5] : theme.colors.gray[2]}`,
          padding: 16,
          backgroundColor: isDark ? theme.colors.dark[6] : theme.white
        }}
      >
        <Stack gap={12}>
          <Group justify="space-between" align="flex-end">
            <Box>
              <Text fw={600}>Formblatt-Z</Text>
              <Text size="xs" c="dimmed">
                Validate the selected reporting period, then generate the Excel workbook in German or English.
              </Text>
            </Box>
            <Button
              leftSection={<IconFileSpreadsheet size={15} />}
              size="sm"
              loading={generating}
              disabled={!canGenerate}
              onClick={() => {
                if (reportScope === 'date_range' && (!dateFrom || !dateTo)) {
                  setReportFeedback({ tone: 'error', text: 'Choose both start and end dates before generating Formblatt-Z.' })
                  return
                }
                setReportFeedback(null)
                generateFormblatt()
              }}
            >
              Generate Formblatt-Z
            </Button>
          </Group>

          <Group align="flex-end" justify="space-between">
            <Radio.Group label="Export scope" value={reportScope} onChange={(value) => setReportScope(value as ReportScope)}>
              <Group mt={8}>
                <Radio value="all" label="All" />
                <Radio value="date_range" label="Date range" />
              </Group>
            </Radio.Group>
            <Select
              label="Language"
              data={[
                { value: 'de', label: 'German' },
                { value: 'en', label: 'English' }
              ]}
              value={reportLanguage}
              onChange={(value) => setReportLanguage((value as FormblattLanguage) ?? 'de')}
            />
          </Group>

          {reportScope === 'date_range' ? (
            <Group grow align="flex-end">
              <DatePickerInput
                label="Reporting period start"
                clearable={false}
                valueFormat={dateInputFormat}
                value={dateFrom}
                onChange={(value) => setDateFrom(value)}
              />
              <DatePickerInput
                label="Reporting period end"
                clearable={false}
                valueFormat={dateInputFormat}
                value={dateTo}
                onChange={(value) => setDateTo(value)}
              />
            </Group>
          ) : null}

          {reportFeedback && (
            <Alert color={reportFeedback.tone === 'error' ? 'red' : 'green'} variant="light">
              {reportFeedback.text}
            </Alert>
          )}

          {validation?.fileIssues?.length ? (
            <Alert color="red" variant="light" icon={<IconAlertTriangle size={16} />}>
              <Text size="sm" fw={500} mb={4}>Settings required for Formblatt-Z</Text>
              {validation.fileIssues.map((issue) => (
                <Text key={issue} size="sm">{issue}</Text>
              ))}
            </Alert>
          ) : null}

          {validationError ? (
            <Alert color="red" variant="light" icon={<IconAlertTriangle size={16} />}>
              {validationError}
            </Alert>
          ) : null}

          <Group gap={8}>
            <Badge variant="light" color={validation?.includedCount ? 'blue' : 'gray'}>
              {validationBusy
                ? 'Checking…'
                : `${validation?.includedCount ?? 0} GMO(s) ${reportScope === 'all' ? 'in export' : 'in period'}`}
            </Badge>
            <Badge variant="light" color={(validation?.invalidCount ?? 0) > 0 ? 'red' : 'green'}>
              {validationBusy ? 'Validation pending' : `${validation?.invalidCount ?? 0} incomplete`}
            </Badge>
          </Group>
        </Stack>
      </Box>

      <Box style={{ borderRadius: 8, overflow: 'hidden', border: `1px solid ${isDark ? theme.colors.dark[5] : theme.colors.gray[2]}` }}>
        <Table>
          <Table.Thead style={{ backgroundColor: headerBg }}>
            <Table.Tr>
              <Table.Th>Host organism</Table.Th>
              <Table.Th>Strain</Table.Th>
              <Table.Th>RG</Table.Th>
              <Table.Th>Created</Table.Th>
              <Table.Th>Destroyed</Table.Th>
              <Table.Th>Approval</Table.Th>
              <Table.Th style={{ width: 80 }} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading && (
              <Table.Tr><Table.Td colSpan={7}><Text size="sm" c="dimmed" ta="center" py={24}>Loading…</Text></Table.Td></Table.Tr>
            )}
            {!isLoading && rows.length === 0 && (
              <Table.Tr><Table.Td colSpan={7}>
                <Stack align="center" py={40} gap={6}>
                  <Text size="sm" c="dimmed">No GMOs yet</Text>
                  <Text size="xs" c="dimmed">Record organisms transformed with your plasmids here</Text>
                </Stack>
              </Table.Td></Table.Tr>
            )}
            {rows.map((row) => {
              const org = row.hostOrganismId ? orgMap.get(row.hostOrganismId) : undefined
              const validationRow = invalidRows.get(row.id)
              return (
                <Fragment key={row.id}>
                  <Table.Tr style={validationRow ? { backgroundColor: invalidRowBg } : undefined}>
                    <Table.Td>
                      <Group gap={6}>
                        <Text size="sm" fw={500}>{org?.name ?? '—'}</Text>
                        {validationRow ? <Badge size="xs" color="red" variant="light">Formblatt-Z</Badge> : null}
                      </Group>
                    </Table.Td>
                    <Table.Td><Text size="sm" c="dimmed" ff="monospace">{row.strain ?? '—'}</Text></Table.Td>
                    <Table.Td>
                      {org?.riskGroup ? (
                        <Badge size="sm" color={RG_COLORS[org.riskGroup] ?? 'gray'} variant="light">RG {org.riskGroup}</Badge>
                      ) : <Text size="sm" c="dimmed">—</Text>}
                    </Table.Td>
                    <Table.Td><Text size="sm" c="dimmed">{formatDate(row.createdDate)}</Text></Table.Td>
                    <Table.Td>
                      {row.destroyedDate
                        ? <Text size="sm" c="dimmed">{formatDate(row.destroyedDate)}</Text>
                        : <Badge size="sm" color="green" variant="dot">Active</Badge>
                      }
                    </Table.Td>
                    <Table.Td><Text size="sm" c="dimmed" ff="monospace" fz="xs">{row.approval ?? '—'}</Text></Table.Td>
                    <Table.Td>
                      <Group gap={4} justify="flex-end">
                        <ActionIcon size="sm" variant="subtle" color="gray" aria-label="Edit" onClick={() => setModal({ open: true, row })}>
                          <IconPencil size={13} />
                        </ActionIcon>
                        <ActionIcon size="sm" variant="subtle" color="red" aria-label="Delete" onClick={() => del(row.id)}>
                          <IconTrash size={13} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                  {validationRow ? (
                    <Table.Tr style={{ backgroundColor: invalidRowBg }}>
                      <Table.Td colSpan={7}>
                        <Stack gap={4} py={4}>
                          {validationRow.messages.map((message) => (
                            <Text key={message} size="xs" c="red.3">
                              {message}
                            </Text>
                          ))}
                        </Stack>
                      </Table.Td>
                    </Table.Tr>
                  ) : null}
                </Fragment>
              )
            })}
          </Table.Tbody>
        </Table>
      </Box>

      <GMOModal opened={modal.open} onClose={() => setModal({ open: false })} initial={modal.row} />
    </Stack>
  )
}
