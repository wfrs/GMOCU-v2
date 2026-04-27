import { useState } from 'react'
import {
  Box, Button, Group, Modal, Select, Stack,
  Table, Text, TextInput, ActionIcon, Badge, useMantineColorScheme, useMantineTheme
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { IconPlus, IconPencil, IconTrash, IconSearch } from '@tabler/icons-react'
import type { FeatureRow } from '@shared/types'
import type { CreateFeature } from '@shared/ipc-schemas'

const TYPE_COLORS: Record<string, string> = {
  promoter: 'violet', gene: 'blue', terminator: 'red',
  rbs: 'cyan', marker: 'orange', origin: 'teal', other: 'gray'
}

const TYPES = [
  { value: 'promoter', label: 'Promoter' },
  { value: 'gene', label: 'Gene' },
  { value: 'terminator', label: 'Terminator' },
  { value: 'rbs', label: 'RBS' },
  { value: 'marker', label: 'Marker' },
  { value: 'origin', label: 'Origin' },
  { value: 'other', label: 'Other' },
]

function FeatureModal({ opened, onClose, initial }: { opened: boolean; onClose: () => void; initial?: FeatureRow }) {
  const qc = useQueryClient()
  const form = useForm<CreateFeature>({
    initialValues: {
      name: initial?.name ?? '',
      alias: initial?.alias ?? '',
      type: (initial?.type as CreateFeature['type']) ?? 'other',
      organismSource: initial?.organismSource ?? '',
      riskLevel: initial?.riskLevel ?? 0,
    },
    validate: { name: (v) => (!v.trim() ? 'Name is required' : null) }
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (data: CreateFeature) =>
      initial ? window.api.features.update(initial.id, data) : window.api.features.create(data),
    onSuccess: (resp) => {
      if (resp.success) { qc.invalidateQueries({ queryKey: ['features'] }); onClose() }
    }
  })

  return (
    <Modal opened={opened} onClose={onClose} title={<Text fw={600}>{initial ? 'Edit Feature' : 'New Feature'}</Text>} centered size="sm">
      <form onSubmit={form.onSubmit((v) => mutate(v))}>
        <Stack gap={12}>
          <TextInput label="Name" placeholder="e.g. 35S promoter" required {...form.getInputProps('name')} />
          <TextInput label="Alias" placeholder="e.g. p35S" {...form.getInputProps('alias')} />
          <Select label="Type" data={TYPES} {...form.getInputProps('type')} />
          <TextInput label="Organism source" placeholder="e.g. Cauliflower mosaic virus" {...form.getInputProps('organismSource')} />
          <Select
            label="Risk level"
            data={[{ value: '0', label: '0 — None' }, { value: '1', label: '1 — Low' }, { value: '2', label: '2 — Medium' }, { value: '3', label: '3 — High' }]}
            value={String(form.values.riskLevel)}
            onChange={(v) => form.setFieldValue('riskLevel', parseInt(v ?? '0'))}
          />
          <Group justify="flex-end" pt={4}>
            <Button variant="subtle" color="gray" onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" loading={isPending}>{initial ? 'Save' : 'Create'}</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}

export function FeaturesPage() {
  const qc = useQueryClient()
  const { colorScheme } = useMantineColorScheme()
  const theme = useMantineTheme()
  const isDark = colorScheme === 'dark'
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<{ open: boolean; row?: FeatureRow }>({ open: false })

  const { data: resp, isLoading } = useQuery({
    queryKey: ['features', search],
    queryFn: () => window.api.features.list(search || undefined)
  })
  const rows = (resp?.data ?? []) as FeatureRow[]

  const { mutate: del } = useMutation({
    mutationFn: (id: number) => window.api.features.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['features'] })
  })

  const rowBg = isDark ? theme.colors.dark[7] : '#fff'
  const headerBg = isDark ? theme.colors.dark[6] : theme.colors.gray[0]

  return (
    <Stack gap={16}>
      <Group justify="space-between">
        <Box>
          <Text fw={600} size="xl">Features</Text>
          <Text size="xs" c="dimmed">Genetic elements glossary — promoters, genes, terminators, markers…</Text>
        </Box>
        <Button leftSection={<IconPlus size={15} />} size="sm" onClick={() => setModal({ open: true })}>
          Add Feature
        </Button>
      </Group>

      <TextInput
        placeholder="Search features…"
        leftSection={<IconSearch size={15} />}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        style={{ maxWidth: 300 }}
      />

      <Box style={{ borderRadius: 8, overflow: 'hidden', border: `1px solid ${isDark ? theme.colors.dark[5] : theme.colors.gray[2]}` }}>
        <Table>
          <Table.Thead style={{ backgroundColor: headerBg }}>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Alias</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Organism source</Table.Th>
              <Table.Th style={{ width: 80 }} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading && (
              <Table.Tr><Table.Td colSpan={5}><Text size="sm" c="dimmed" ta="center" py={24}>Loading…</Text></Table.Td></Table.Tr>
            )}
            {!isLoading && rows.length === 0 && (
              <Table.Tr><Table.Td colSpan={5}>
                <Stack align="center" py={40} gap={6}>
                  <Text size="sm" c="dimmed">No features yet</Text>
                  <Text size="xs" c="dimmed">Add promoters, genes, terminators and other genetic elements</Text>
                </Stack>
              </Table.Td></Table.Tr>
            )}
            {rows.map((row) => (
              <Table.Tr key={row.id} style={{ backgroundColor: rowBg }}>
                <Table.Td><Text size="sm" fw={500}>{row.name}</Text></Table.Td>
                <Table.Td><Text size="sm" c="dimmed" style={{ fontFamily: 'ui-monospace, monospace' }}>{row.alias ?? '—'}</Text></Table.Td>
                <Table.Td>
                  <Badge size="sm" color={TYPE_COLORS[row.type] ?? 'gray'} variant="light">
                    {row.type}
                  </Badge>
                </Table.Td>
                <Table.Td><Text size="sm" c="dimmed">{row.organismSource ?? '—'}</Text></Table.Td>
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
            ))}
          </Table.Tbody>
        </Table>
      </Box>

      <FeatureModal opened={modal.open} onClose={() => setModal({ open: false })} initial={modal.row} />
    </Stack>
  )
}
