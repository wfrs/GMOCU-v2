import { useState } from 'react'
import {
  Box, Button, Group, Modal, Stack,
  Table, Text, TextInput, Textarea, ActionIcon,
  useMantineColorScheme, useMantineTheme
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { IconPlus, IconPencil, IconTrash, IconSearch } from '@tabler/icons-react'
import type { SeedRow } from '@shared/types'
import type { CreateSeed } from '@shared/ipc-schemas'

function SeedModal({ opened, onClose, initial }: { opened: boolean; onClose: () => void; initial?: SeedRow }) {
  const qc = useQueryClient()
  const form = useForm<CreateSeed>({
    initialValues: {
      name: initial?.name ?? '',
      species: initial?.species ?? '',
      lineAccession: initial?.lineAccession ?? '',
      source: initial?.source ?? '',
      storageLocation: initial?.storageLocation ?? '',
      notes: initial?.notes ?? ''
    },
    validate: {
      name: (v) => (!v.trim() ? 'Name is required' : null),
      species: (v) => (!v.trim() ? 'Species is required' : null)
    }
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (data: CreateSeed) =>
      initial ? window.api.seeds.update(initial.id, data) : window.api.seeds.create(data),
    onSuccess: (resp) => {
      if (resp.success) { qc.invalidateQueries({ queryKey: ['seeds'] }); onClose() }
    }
  })

  return (
    <Modal opened={opened} onClose={onClose} title={<Text fw={600}>{initial ? 'Edit Seed' : 'New Seed'}</Text>} centered size="md">
      <form onSubmit={form.onSubmit((v) => mutate(v))}>
        <Stack gap={12}>
          <Group grow gap="md">
            <TextInput label="Name / line ID" placeholder="e.g. Col-0 #3" required {...form.getInputProps('name')} />
            <TextInput label="Species" placeholder="e.g. Arabidopsis thaliana" required {...form.getInputProps('species')} />
          </Group>
          <Group grow gap="md">
            <TextInput label="Line / accession" placeholder="e.g. CS70000" {...form.getInputProps('lineAccession')} />
            <TextInput label="Source" placeholder="e.g. TAIR, lab stock" {...form.getInputProps('source')} />
          </Group>
          <TextInput
            label="Storage location"
            placeholder="e.g. Fridge A, box 3, row 2"
            {...form.getInputProps('storageLocation')}
          />
          <Textarea label="Notes" placeholder="Phenotype, generation, special conditions…" autosize minRows={2} maxRows={4} {...form.getInputProps('notes')} />
          <Group justify="flex-end" pt={4}>
            <Button variant="subtle" color="gray" onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" loading={isPending}>{initial ? 'Save' : 'Create'}</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}

export function SeedsPage() {
  const qc = useQueryClient()
  const { colorScheme } = useMantineColorScheme()
  const theme = useMantineTheme()
  const isDark = colorScheme === 'dark'
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<{ open: boolean; row?: SeedRow }>({ open: false })

  const { data: resp, isLoading } = useQuery({
    queryKey: ['seeds', search],
    queryFn: () => window.api.seeds.list(search || undefined)
  })
  const rows = (resp?.data ?? []) as SeedRow[]

  const { mutate: del } = useMutation({
    mutationFn: (id: number) => window.api.seeds.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seeds'] })
  })

  const rowBg = isDark ? theme.colors.dark[7] : '#fff'
  const headerBg = isDark ? theme.colors.dark[6] : theme.colors.gray[0]

  return (
    <Stack gap={16}>
      <Group justify="space-between">
        <Box>
          <Text fw={600} size="xl">Seeds</Text>
          <Text size="xs" c="dimmed">Plant seed stock inventory — independent of plasmid records</Text>
        </Box>
        <Button leftSection={<IconPlus size={15} />} size="sm" onClick={() => setModal({ open: true })}>
          Add Seed
        </Button>
      </Group>

      <TextInput
        placeholder="Search seeds…"
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
              <Table.Th>Species</Table.Th>
              <Table.Th>Line / accession</Table.Th>
              <Table.Th>Storage</Table.Th>
              <Table.Th>Source</Table.Th>
              <Table.Th style={{ width: 80 }} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading && (
              <Table.Tr><Table.Td colSpan={6}><Text size="sm" c="dimmed" ta="center" py={24}>Loading…</Text></Table.Td></Table.Tr>
            )}
            {!isLoading && rows.length === 0 && (
              <Table.Tr><Table.Td colSpan={6}>
                <Stack align="center" py={40} gap={6}>
                  <Text size="sm" c="dimmed">No seeds yet</Text>
                  <Text size="xs" c="dimmed">Track plant seed lines and their storage locations</Text>
                </Stack>
              </Table.Td></Table.Tr>
            )}
            {rows.map((row) => (
              <Table.Tr key={row.id} style={{ backgroundColor: rowBg }}>
                <Table.Td><Text size="sm" fw={500}>{row.name}</Text></Table.Td>
                <Table.Td><Text size="sm" fs="italic" c="dimmed">{row.species}</Text></Table.Td>
                <Table.Td><Text size="sm" c="dimmed" style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' }}>{row.lineAccession ?? '—'}</Text></Table.Td>
                <Table.Td><Text size="sm" c="dimmed">{row.storageLocation ?? '—'}</Text></Table.Td>
                <Table.Td><Text size="sm" c="dimmed">{row.source ?? '—'}</Text></Table.Td>
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

      <SeedModal opened={modal.open} onClose={() => setModal({ open: false })} initial={modal.row} />
    </Stack>
  )
}
