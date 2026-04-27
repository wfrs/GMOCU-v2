import { useEffect, useRef, useState } from 'react'
import { Box, Group, Text, Badge, ActionIcon, Tooltip, Stack, Title } from '@mantine/core'
import type { LogEntry, LogLevel } from '../../../shared/types'

// ─── Level config ──────────────────────────────────────────────────────────────

const LEVELS: { id: LogLevel | 'all'; label: string; color: string }[] = [
  { id: 'all',      label: 'All',      color: 'gray'  },
  { id: 'ipc-in',   label: 'IPC →',   color: 'blue'  },
  { id: 'ipc-ok',   label: 'IPC ✓',   color: 'teal'  },
  { id: 'ipc-err',  label: 'IPC ✗',   color: 'red'   },
  { id: 'info',     label: 'Info',     color: 'cyan'  },
  { id: 'warn',     label: 'Warn',     color: 'yellow'},
  { id: 'error',    label: 'Error',    color: 'red'   },
  { id: 'renderer', label: 'Renderer', color: 'grape' },
]

const LEVEL_COLORS: Record<LogLevel, string> = {
  'ipc-in':  '#60a5fa',
  'ipc-ok':  '#34d399',
  'ipc-err': '#f87171',
  'info':    '#67e8f9',
  'warn':    '#fbbf24',
  'error':   '#f87171',
  'renderer':'#c084fc',
}

const LEVEL_PREFIX: Record<LogLevel, string> = {
  'ipc-in':  '→',
  'ipc-ok':  '✓',
  'ipc-err': '✗',
  'info':    'ℹ',
  'warn':    '⚠',
  'error':   '✖',
  'renderer':'⬡',
}

function mergeUniqueEntries(current: LogEntry[], incoming: LogEntry[]): LogEntry[] {
  if (incoming.length === 0) return current

  const seen = new Set(current.map((entry) => entry.id))
  const merged = [...current]

  for (const entry of incoming) {
    if (seen.has(entry.id)) continue
    seen.add(entry.id)
    merged.push(entry)
  }

  return merged.length > 500 ? merged.slice(merged.length - 500) : merged
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function DevLogsPage() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [filter, setFilter] = useState<LogLevel | 'all'>('all')
  const [autoScroll, setAutoScroll] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load buffered entries on mount, then subscribe to live updates
  useEffect(() => {
    window.api.dev.getLogs().then((buffered) => {
      setEntries((prev) => mergeUniqueEntries(prev, buffered))
    })

    const unsub = window.api.dev.onLog((entry) => {
      setEntries((prev) => mergeUniqueEntries(prev, [entry]))
    })

    return unsub
  }, [])

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' })
    }
  }, [entries, autoScroll])

  // Detect manual scroll up to pause auto-scroll
  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    setAutoScroll(atBottom)
  }

  const filtered = filter === 'all' ? entries : entries.filter((e) => e.level === filter)

  return (
    <Box style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
      <Title order={4} mb="sm" c="dimmed" fw={500}>Dev Logs</Title>
      {/* Toolbar */}
      <Group justify="space-between" mb="xs" wrap="nowrap">
        <Group gap={4} wrap="wrap">
          {LEVELS.map((l) => (
            <Badge
              key={l.id}
              color={l.color}
              variant={filter === l.id ? 'filled' : 'light'}
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => setFilter(l.id as LogLevel | 'all')}
            >
              {l.label}
            </Badge>
          ))}
        </Group>
        <Group gap={6} wrap="nowrap">
          <Text size="xs" c="dimmed">{filtered.length} entries</Text>
          <Tooltip label="Clear display">
            <ActionIcon
              size="sm"
              variant="subtle"
              color="gray"
              onClick={() => setEntries([])}
              aria-label="Clear log display"
            >
              ✕
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {/* Log list */}
      <Box
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          backgroundColor: '#0d1117',
          borderRadius: 8,
          padding: '8px 0',
          fontFamily: 'ui-monospace, "Cascadia Code", "Fira Code", monospace',
          fontSize: 12,
          lineHeight: 1.6,
        }}
      >
        {filtered.length === 0 && (
          <Stack align="center" justify="center" h={200}>
            <Text size="xs" c="dimmed" style={{ fontFamily: 'inherit' }}>No log entries yet</Text>
          </Stack>
        )}
        {filtered.map((entry) => (
          <LogRow key={entry.id} entry={entry} />
        ))}
        <div ref={bottomRef} />
      </Box>

      {!autoScroll && (
        <Text
          size="xs"
          c="dimmed"
          ta="center"
          mt={4}
          style={{ cursor: 'pointer' }}
          onClick={() => {
            setAutoScroll(true)
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
          }}
        >
          ↓ Scroll to bottom to resume live tail
        </Text>
      )}
    </Box>
  )
}

function LogRow({ entry }: { entry: LogEntry }) {
  const color = LEVEL_COLORS[entry.level]
  const prefix = LEVEL_PREFIX[entry.level]

  return (
    <Box
      px={12}
      py={1}
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'baseline',
        ':hover': { backgroundColor: 'rgba(255,255,255,0.03)' },
      }}
    >
      {/* Timestamp */}
      <Text
        component="span"
        style={{
          color: '#484f58',
          fontSize: 11,
          flexShrink: 0,
          fontFamily: 'inherit',
        }}
      >
        {entry.ts}
      </Text>

      {/* Level prefix */}
      <Text
        component="span"
        style={{
          color,
          fontWeight: 700,
          flexShrink: 0,
          width: 12,
          textAlign: 'center',
          fontFamily: 'inherit',
        }}
      >
        {prefix}
      </Text>

      {/* Message */}
      <Text
        component="span"
        style={{
          color: entry.level === 'ipc-in' ? '#93c5fd' : '#e6edf3',
          fontFamily: 'inherit',
          fontSize: 12,
        }}
      >
        {entry.message}
      </Text>

      {/* Detail */}
      {entry.detail && (
        <Text
          component="span"
          style={{
            color: '#6e7681',
            fontFamily: 'inherit',
            fontSize: 11,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 400,
          }}
        >
          {entry.detail}
        </Text>
      )}

      {/* Duration */}
      {entry.duration !== undefined && (
        <Text
          component="span"
          style={{
            color: entry.duration > 200 ? '#fbbf24' : '#484f58',
            fontFamily: 'inherit',
            fontSize: 11,
            marginLeft: 'auto',
            flexShrink: 0,
          }}
        >
          {entry.duration}ms
        </Text>
      )}
    </Box>
  )
}
