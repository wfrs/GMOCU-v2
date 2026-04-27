import {
  Badge,
  Box,
  Divider,
  Group,
  Modal,
  NumberInput,
  Select,
  Skeleton,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  useMantineColorScheme,
  useMantineTheme
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import type { UpdatePlasmid } from '@shared/ipc-schemas'
import type { PlasmidRow, CategoryRow, SelectionValueRow } from '@shared/types'
import { PlasmidGmoSection } from './PlasmidGmoSection'
import { useRegionalFormatting } from '@renderer/lib/regional-format'

interface Props {
  plasmidId: number | null
  onClose: () => void
}

type EditForm = {
  name: string
  alias: string
  categoryId: string   // Select needs string
  status: string
  backboneVector: string
  marker: string
  cassette: string
  purpose: string
  clonedBy: string
  dateCreated: Date | null
  concentration: number | ''
  dateMiniprep: Date | null
  sequenced: boolean
  seqMethod: string
  dateSequenced: Date | null
  sequencingResult: string
  glycerolStockId: string
  dateGlycerolStock: Date | null
  box: string
  publicComment: string
  privateComment: string
  description: string
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

export function PlasmidDetailModal({ plasmidId, onClose }: Props) {
  const qc = useQueryClient()
  const { formatDate, dateInputFormat, decimalSeparator, groupSeparator } = useRegionalFormatting()
  const { colorScheme } = useMantineColorScheme()
  const theme = useMantineTheme()
  const isDark = colorScheme === 'dark'
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedAtRef = useRef<HTMLSpanElement>(null)

  const { data: resp, isLoading } = useQuery({
    queryKey: ['plasmid', plasmidId],
    queryFn: () => window.api.plasmids.get(plasmidId!),
    enabled: plasmidId !== null
  })

  const { data: catsResp } = useQuery({
    queryKey: ['categories'],
    queryFn: () => window.api.categories.list()
  })

  const { data: svResp } = useQuery({
    queryKey: ['selectionValues'],
    queryFn: () => window.api.selectionValues.list()
  })

  const plasmid = resp?.data as PlasmidRow | undefined
  const categories = (catsResp?.data ?? []) as CategoryRow[]
  const statusOptions = (svResp?.data ?? []) as SelectionValueRow[]

  const form = useForm<EditForm>({
    initialValues: {
      name: '', alias: '', categoryId: '', status: 'planned',
      backboneVector: '', marker: '', cassette: '',
      purpose: '', clonedBy: '', dateCreated: null,
      concentration: '', dateMiniprep: null,
      sequenced: false, seqMethod: '', dateSequenced: null, sequencingResult: '',
      glycerolStockId: '', dateGlycerolStock: null, box: '',
      publicComment: '', privateComment: '', description: ''
    }
  })

  useEffect(() => {
    if (plasmid) {
      form.setValues({
        name: plasmid.name,
        alias: plasmid.alias ?? '',
        categoryId: plasmid.categoryId != null ? String(plasmid.categoryId) : '',
        status: plasmid.status,
        backboneVector: plasmid.backboneVector ?? '',
        marker: plasmid.marker ?? '',
        cassette: plasmid.cassette ?? '',
        purpose: plasmid.purpose ?? '',
        clonedBy: plasmid.clonedBy ?? '',
        dateCreated: plasmid.dateCreated ? new Date(plasmid.dateCreated) : null,
        concentration: plasmid.concentration ?? '',
        dateMiniprep: plasmid.dateMiniprep ? new Date(plasmid.dateMiniprep) : null,
        sequenced: plasmid.sequenced,
        seqMethod: plasmid.seqMethod ?? '',
        dateSequenced: plasmid.dateSequenced ? new Date(plasmid.dateSequenced) : null,
        sequencingResult: plasmid.sequencingResult ?? '',
        glycerolStockId: plasmid.glycerolStockId ?? '',
        dateGlycerolStock: plasmid.dateGlycerolStock ? new Date(plasmid.dateGlycerolStock) : null,
        box: plasmid.box ?? '',
        publicComment: plasmid.publicComment ?? '',
        privateComment: plasmid.privateComment ?? '',
        description: plasmid.description ?? ''
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plasmid?.id])

  const showSaved = () => {
    if (savedTimer.current) clearTimeout(savedTimer.current)
    if (savedAtRef.current) {
      savedAtRef.current.style.opacity = '1'
      savedTimer.current = setTimeout(() => {
        if (savedAtRef.current) savedAtRef.current.style.opacity = '0'
      }, 1800)
    }
  }

  const { mutate } = useMutation({
    mutationFn: (data: UpdatePlasmid) => window.api.plasmids.update(plasmidId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plasmids'] })
      showSaved()
    }
  })

  const saveOnBlur = () => {
    if (!plasmid) return
    const v = form.values
    mutate({
      name: v.name.trim() || plasmid.name,
      alias: v.alias.trim() || undefined,
      categoryId: v.categoryId ? parseInt(v.categoryId) : null,
      backboneVector: v.backboneVector.trim() || undefined,
      marker: v.marker.trim() || undefined,
      cassette: v.cassette.trim() || undefined,
      purpose: v.purpose.trim() || undefined,
      clonedBy: v.clonedBy.trim() || undefined,
      concentration: v.concentration !== '' ? Number(v.concentration) : undefined,
      seqMethod: v.seqMethod.trim() || undefined,
      glycerolStockId: v.glycerolStockId.trim() || undefined,
      box: v.box.trim() || undefined,
      publicComment: v.publicComment.trim() || undefined,
      privateComment: v.privateComment.trim() || undefined,
      description: v.description.trim() || undefined
    })
  }

  const saveWith = (patch: UpdatePlasmid) => {
    if (!plasmid) return
    mutate(patch)
  }

  const dividerColor = isDark ? theme.colors.dark[5] : theme.colors.gray[2]

  return (
    <Modal
      opened={plasmidId !== null}
      onClose={onClose}
      title={
        <Group gap={10}>
          <Text fw={600} size="md" ff="monospace">{plasmid?.name ?? '…'}</Text>
          <Text
            component="span"
            ref={savedAtRef}
            size="xs"
            c={`${theme.primaryColor}.5`}
            style={{ opacity: 0, transition: 'opacity 0.4s' }}
            aria-live="polite"
          >
            Saved
          </Text>
        </Group>
      }
      size="xl"
      centered
      styles={{
        content: { borderRadius: 12 },
        header: {
          borderBottom: `1px solid ${dividerColor}`,
          paddingBottom: 12,
          marginBottom: 0
        },
        body: { padding: '20px 24px' }
      }}
    >
      {isLoading || !plasmid ? (
        <Stack gap={10}>
          {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} height={36} radius="sm" />)}
        </Stack>
      ) : (
        <Stack gap={20}>

          {/* ── Identity ─────────────────────────────────────── */}
          <FormSection label="Identity">
            <Group grow gap="md">
              <TextInput label="Name" required {...form.getInputProps('name')} onBlur={saveOnBlur} />
              <TextInput label="Alias / Backbone alias" placeholder="e.g. pXXB-GFP" {...form.getInputProps('alias')} onBlur={saveOnBlur} />
            </Group>
            <Group grow gap="md">
              <Select
                label="Status"
                data={statusOptions.length
                  ? statusOptions.map((sv) => ({
                      value: sv.value,
                      label: sv.label
                    }))
                  : [{ value: 'planned', label: 'Planned' }]
                }
                renderOption={({ option }) => {
                  const sv = statusOptions.find((s) => s.value === option.value)
                  return (
                    <Group gap={8} wrap="nowrap">
                      {sv?.colour && (
                        <Box w={8} h={8} style={{ borderRadius: '50%', flexShrink: 0, backgroundColor: sv.colour }} />
                      )}
                      <Text size="sm">{option.label}</Text>
                    </Group>
                  )
                }}
                {...form.getInputProps('status')}
                onChange={(v) => {
                  form.setFieldValue('status', v ?? 'planned')
                  saveWith({ status: v ?? 'planned' })
                }}
              />
              <Select
                label="Category"
                placeholder="—"
                clearable
                data={categories.map((c) => ({ value: String(c.id), label: c.name }))}
                {...form.getInputProps('categoryId')}
                onChange={(v) => {
                  form.setFieldValue('categoryId', v ?? '')
                  saveWith({ categoryId: v ? parseInt(v) : null })
                }}
              />
            </Group>
            <TextInput
              label="Creator"
              value={[plasmid.creatorInitials, plasmid.creatorName].filter(Boolean).join(' · ') || '—'}
              readOnly
              styles={{ input: { color: isDark ? theme.colors.dark[2] : theme.colors.gray[6] } }}
            />
          </FormSection>

          <Divider color={dividerColor} />

          {/* ── Construct ────────────────────────────────────── */}
          <FormSection label="Construct">
            <TextInput
              label="Cassette"
              placeholder="e.g. 35S-GFP-NOS"
              description="Dash-separated feature tokens"
              {...form.getInputProps('cassette')}
              onBlur={saveOnBlur}
              styles={{ input: { fontFamily: 'monospace' } }}
            />
            <Group grow gap="md">
              <TextInput label="Backbone vector" placeholder="e.g. pEarleyGate101" {...form.getInputProps('backboneVector')} onBlur={saveOnBlur} />
              <TextInput label="Marker" placeholder="e.g. KanR, Bar" {...form.getInputProps('marker')} onBlur={saveOnBlur} />
            </Group>
            <Group grow gap="md">
              <TextInput label="Purpose / gene" {...form.getInputProps('purpose')} onBlur={saveOnBlur} />
              <TextInput label="Cloned by" {...form.getInputProps('clonedBy')} onBlur={saveOnBlur} />
            </Group>
            <DatePickerInput
              label="Date created (cloned)"
              clearable
              valueFormat={dateInputFormat}
              {...form.getInputProps('dateCreated')}
              onChange={(v) => { form.setFieldValue('dateCreated', v); saveWith({ dateCreated: v ?? undefined }) }}
            />
          </FormSection>

          <Divider color={dividerColor} />

          {/* ── Miniprep & Storage ───────────────────────────── */}
          <FormSection label="Miniprep & Storage">
            <Group grow gap="md">
              <NumberInput
                label="Concentration (ng/µL)"
                min={0}
                decimalScale={1}
                decimalSeparator={decimalSeparator}
                thousandSeparator={groupSeparator}
                {...form.getInputProps('concentration')}
                onBlur={saveOnBlur}
              />
              <DatePickerInput
                label="Date miniprep"
                clearable
                valueFormat={dateInputFormat}
                {...form.getInputProps('dateMiniprep')}
                onChange={(v) => { form.setFieldValue('dateMiniprep', v); saveWith({ dateMiniprep: v ?? undefined }) }}
              />
            </Group>
            <Group grow gap="md">
              <TextInput label="Glycerol stock ID" placeholder="e.g. CJM001" {...form.getInputProps('glycerolStockId')} onBlur={saveOnBlur} />
              <DatePickerInput
                label="Date glycerol stock"
                clearable
                valueFormat={dateInputFormat}
                {...form.getInputProps('dateGlycerolStock')}
                onChange={(v) => { form.setFieldValue('dateGlycerolStock', v); saveWith({ dateGlycerolStock: v ?? undefined }) }}
              />
            </Group>
            <TextInput label="Box" placeholder="Physical freezer box label" {...form.getInputProps('box')} onBlur={saveOnBlur} />
          </FormSection>

          <Divider color={dividerColor} />

          {/* ── Sequencing ───────────────────────────────────── */}
          <FormSection label="Sequencing">
            <Group gap="md" align="flex-end">
              <Switch
                label="Sequenced"
                checked={form.values.sequenced}
                onChange={(e) => {
                  form.setFieldValue('sequenced', e.currentTarget.checked)
                  saveWith({ sequenced: e.currentTarget.checked })
                }}
              />
              {form.values.sequenced && (
                <Badge variant="light" color="green" size="sm">Confirmed</Badge>
              )}
            </Group>
            {form.values.sequenced && (
              <>
                <Group grow gap="md">
                  <Select
                    label="Method"
                    placeholder="—"
                    clearable
                    data={[
                      { value: 'Sanger', label: 'Sanger' },
                      { value: 'ONT', label: 'Oxford Nanopore (ONT)' },
                      { value: 'Illumina', label: 'Illumina' },
                      { value: 'Other', label: 'Other' }
                    ]}
                    {...form.getInputProps('seqMethod')}
                    onChange={(v) => {
                      form.setFieldValue('seqMethod', v ?? '')
                      saveWith({ seqMethod: v ?? undefined })
                    }}
                  />
                  <Select
                    label="Result"
                    placeholder="—"
                    clearable
                    data={[
                      { value: 'pending', label: 'Pending' },
                      { value: 'passed', label: 'Passed ✓' },
                      { value: 'failed', label: 'Failed ✗' }
                    ]}
                    {...form.getInputProps('sequencingResult')}
                    onChange={(v) => {
                      form.setFieldValue('sequencingResult', v ?? '')
                      saveWith({ sequencingResult: (v as 'pending' | 'passed' | 'failed') || undefined })
                    }}
                  />
                </Group>
                <DatePickerInput
                  label="Date sequenced"
                  clearable
                  valueFormat={dateInputFormat}
                  {...form.getInputProps('dateSequenced')}
                  onChange={(v) => { form.setFieldValue('dateSequenced', v); saveWith({ dateSequenced: v ?? undefined }) }}
                />
              </>
            )}
          </FormSection>

          <Divider color={dividerColor} />

          {/* ── Comments ─────────────────────────────────────── */}
          <FormSection label="Comments">
            <Textarea
              label="Public comment"
              description="Visible to all team members when published"
              autosize
              minRows={2}
              maxRows={4}
              {...form.getInputProps('publicComment')}
              onBlur={saveOnBlur}
            />
            <Textarea
              label="Private comment"
              description="Personal only — never shared or published"
              autosize
              minRows={2}
              maxRows={4}
              styles={{
                label: { color: isDark ? theme.colors.yellow[4] : theme.colors.yellow[7] }
              }}
              {...form.getInputProps('privateComment')}
              onBlur={saveOnBlur}
            />
          </FormSection>

          <Divider color={dividerColor} />

          <FormSection label="Description">
            <Textarea
              autosize
              minRows={2}
              maxRows={5}
              placeholder="Additional notes…"
              {...form.getInputProps('description')}
              onBlur={saveOnBlur}
            />
          </FormSection>

          <Divider color={dividerColor} />

          <PlasmidGmoSection plasmidId={plasmid.id} />

          {/* ── Footer ───────────────────────────────────────── */}
          <Group justify="space-between" pt={4}>
            <Text size="xs" c="dimmed">
              Created {formatDate(plasmid.createdAt)}
              {plasmid.updatedAt && String(plasmid.updatedAt) !== String(plasmid.createdAt)
                ? ` · Updated ${formatDate(plasmid.updatedAt)}`
                : ''}
            </Text>
          </Group>

        </Stack>
      )}
    </Modal>
  )
}
