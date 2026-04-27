import { useState } from 'react'
import {
  Box, Button, Group, Modal, Select, Stack,
  Table, Text, TextInput, ActionIcon, Badge, useMantineColorScheme, useMantineTheme
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { IconPlus, IconPencil, IconTrash, IconSearch } from '@tabler/icons-react'
import type { OrganismRow } from '@shared/types'
import type { CreateOrganism } from '@shared/ipc-schemas'

const RG_COLORS: Record<number, string> = { 1: 'green', 2: 'yellow', 3: 'orange', 4: 'red' }

function OrganismModal({
  opened, onClose, initial
}: {
  opened: boolean
  onClose: () => void
  initial?: OrganismRow
}) {
  const qc = useQueryClient()
  const form = useForm<CreateOrganism>({
    initialValues: {
      name: initial?.name ?? '',
      shortName: initial?.shortName ?? '',
      riskGroup: initial?.riskGroup ?? 1,
      roleGroup: initial?.roleGroup ?? ''
    },
    validate: { name: (v) => (!v.trim() ? 'Name is required' : null) }
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (data: CreateOrganism) =>
      initial
        ? window.api.organisms.update(initial.id, data)
        : window.api.organisms.create(data),
    onSuccess: (resp) => {
      if (resp.success) { qc.invalidateQueries({ queryKey: ['organisms'] }); onClose() }
    }
  })

  return (
    <Modal opened={opened} onClose={onClose} title={<Text fw={600}>{initial ? 'Edit Organism' : 'New Organism'}</Text>} centered size="sm">
      <form onSubmit={form.onSubmit((v) => mutate(v))}>
        <Stack gap={12}>
          <TextInput label="Full name" placeholder="e.g. Escherichia coli" required {...form.getInputProps('name')} />
          <TextInput label="Short name" placeholder="e.g. EsCo" {...form.getInputProps('shortName')} />
          <Select
            label="Risk group"
            data={[{ value: '1', label: 'RG 1' }, { value: '2', label: 'RG 2' }, { value: '3', label: 'RG 3' }, { value: '4', label: 'RG 4' }]}
            value={String(form.values.riskGroup)}
            onChange={(v) => form.setFieldValue('riskGroup', parseInt(v ?? '1'))}
          />
          <TextInput label="Role / group" placeholder="e.g. donor, host, vector" {...form.getInputProps('roleGroup')} />
          <Group justify="flex-end" pt={4}>
            <Button variant="subtle" color="gray" onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" loading={isPending}>{initial ? 'Save' : 'Create'}</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}

export function OrganismsPage() {
  const qc = useQueryClient()
  const { colorScheme } = useMantineColorScheme()
  const theme = useMantineTheme()
  const isDark = colorScheme === 'dark'
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<{ open: boolean; row?: OrganismRow }>({ open: false })

  const { data: resp, isLoading } = useQuery({
    queryKey: ['organisms', search],
    queryFn: () => window.api.organisms.list(search || undefined)
  })
  const rows = (resp?.data ?? []) as OrganismRow[]

  const { mutate: del } = useMutation({
    mutationFn: (id: number) => window.api.organisms.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['organisms'] })
  })

  const rowBg = isDark ? theme.colors.dark[7] : '#fff'
  const headerBg = isDark ? theme.colors.dark[6] : theme.colors.gray[0]

  return (
    <Stack gap={16}>
      <Group justify="space-between">
        <Box>
          <Text fw={600} size="xl">Organisms</Text>
          <Text size="xs" c="dimmed">Host, donor and vector organisms glossary</Text>
        </Box>
        <Button leftSection={<IconPlus size={15} />} size="sm" onClick={() => setModal({ open: true })}>
          Add Organism
        </Button>
      </Group>

      <TextInput
        placeholder="Search organisms…"
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
              <Table.Th>Short name</Table.Th>
              <Table.Th>Risk group</Table.Th>
              <Table.Th>Role</Table.Th>
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
                  <Text size="sm" c="dimmed">No organisms yet</Text>
                  <Text size="xs" c="dimmed">Add host, donor and vector organisms used in your lab</Text>
                </Stack>
              </Table.Td></Table.Tr>
            )}
            {rows.map((row) => (
              <Table.Tr key={row.id} style={{ backgroundColor: rowBg }}>
                <Table.Td><Text size="sm">{row.name}</Text></Table.Td>
                <Table.Td><Text size="sm" c="dimmed" style={{ fontFamily: 'ui-monospace, monospace' }}>{row.shortName ?? '—'}</Text></Table.Td>
                <Table.Td>
                  <Badge size="sm" color={RG_COLORS[row.riskGroup] ?? 'gray'} variant="light">
                    RG {row.riskGroup}
                  </Badge>
                </Table.Td>
                <Table.Td><Text size="sm" c="dimmed">{row.roleGroup ?? '—'}</Text></Table.Td>
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

      <OrganismModal
        opened={modal.open}
        onClose={() => setModal({ open: false })}
        initial={modal.row}
      />
    </Stack>
  )
}
