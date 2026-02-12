import AsyncStorage from '@react-native-async-storage/async-storage';

type TraceLevel = 'info' | 'warn' | 'error';

export type DebugTraceEntry = {
  ts: number;
  level: TraceLevel;
  event: string;
  meta?: Record<string, unknown>;
};

const STORAGE_KEY = '@farmenglish:debug_trace_v1';
const MAX_TRACE_ENTRIES = 180;
const FLUSH_DELAY_MS = 550;
const TRACE_PERSIST_ENABLED = typeof __DEV__ !== 'undefined' ? !!__DEV__ : false;

let traceBuffer: DebugTraceEntry[] = [];
let loaded = false;
let loadPromise: Promise<void> | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function safeMeta(meta: unknown): Record<string, unknown> | undefined {
  if (!meta || typeof meta !== 'object') return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta as Record<string, unknown>)) {
    if (value === undefined) continue;
    if (value === null) {
      out[key] = null;
      continue;
    }
    if (typeof value === 'number') {
      out[key] = Number.isFinite(value) ? value : null;
      continue;
    }
    if (typeof value === 'string' || typeof value === 'boolean') {
      out[key] = value;
      continue;
    }
    if (Array.isArray(value)) {
      out[key] = value.slice(0, 20).map((item) => {
        if (item === null) return null;
        if (typeof item === 'number') return Number.isFinite(item) ? item : null;
        if (typeof item === 'string' || typeof item === 'boolean') return item;
        return String(item);
      });
      continue;
    }
    out[key] = String(value);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

async function ensureLoaded(): Promise<void> {
  if (!TRACE_PERSIST_ENABLED) {
    loaded = true;
    return;
  }
  if (loaded) return;
  if (loadPromise) return loadPromise;

  loadPromise = AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      if (!raw) {
        traceBuffer = [];
        return;
      }
      try {
        const parsed = JSON.parse(raw) as DebugTraceEntry[];
        if (Array.isArray(parsed)) {
          traceBuffer = parsed
            .filter((entry) => entry && typeof entry.event === 'string' && typeof entry.ts === 'number')
            .slice(-MAX_TRACE_ENTRIES);
        } else {
          traceBuffer = [];
        }
      } catch {
        traceBuffer = [];
      }
    })
    .catch(() => {
      traceBuffer = [];
    })
    .finally(() => {
      loaded = true;
      loadPromise = null;
    });

  return loadPromise;
}

function scheduleFlush(): void {
  if (!TRACE_PERSIST_ENABLED) return;
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(traceBuffer.slice(-MAX_TRACE_ENTRIES))).catch(() => {});
  }, FLUSH_DELAY_MS);
}

export function traceEvent(event: string, meta?: Record<string, unknown>, level: TraceLevel = 'info'): void {
  const safeEvent = typeof event === 'string' ? event.trim() : '';
  if (!safeEvent) return;

  ensureLoaded()
    .catch(() => {})
    .finally(() => {
      const entry: DebugTraceEntry = {
        ts: Date.now(),
        level,
        event: safeEvent,
        meta: safeMeta(meta),
      };
      traceBuffer.push(entry);
      if (traceBuffer.length > MAX_TRACE_ENTRIES) {
        traceBuffer = traceBuffer.slice(traceBuffer.length - MAX_TRACE_ENTRIES);
      }

      if (level === 'error') {
        console.error('[trace]', safeEvent, entry.meta || {});
      } else if (level === 'warn') {
        console.warn('[trace]', safeEvent, entry.meta || {});
      } else {
        console.log('[trace]', safeEvent, entry.meta || {});
      }

      scheduleFlush();
    });
}

export async function readTraceEvents(limit: number = 80): Promise<DebugTraceEntry[]> {
  await ensureLoaded();
  const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)));
  return traceBuffer.slice(-safeLimit);
}

export async function clearTraceEvents(): Promise<void> {
  traceBuffer = [];
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (!TRACE_PERSIST_ENABLED) return;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}
