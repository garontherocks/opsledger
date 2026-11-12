// In-memory OpenTelemetry SDK for tests and local recordings (ADR 0020).
// The app only depends on @opentelemetry/api; this registers a real provider so spans can be asserted or exported.
import { context, trace, type HrTime } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { InMemorySpanExporter, SimpleSpanProcessor, TracerProvider, type ReadableSpan } from '@opentelemetry/sdk-trace';

let exporter: InMemorySpanExporter | undefined;

/** Registers the global provider once per process and clears previously finished spans. */
export function memoryTracing() {
  if (!exporter) {
    exporter = new InMemorySpanExporter();
    context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());
    trace.setGlobalTracerProvider(new TracerProvider({ spanProcessors: [new SimpleSpanProcessor({ exporter })] }));
  }
  exporter.reset();
  const current = exporter;
  return {
    spans: () => [...current.getFinishedSpans()].sort((a, b) => nanos(a.startTime) - nanos(b.startTime)),
    reset: () => current.reset(),
  };
}

const nanos = ([s, ns]: HrTime) => s * 1e9 + ns;

/** One flat, JSON-serializable record per span: the shape of the JSONL trace files recorded on the desktop. */
export function spanRecord(span: ReadableSpan) {
  return {
    traceId: span.spanContext().traceId,
    spanId: span.spanContext().spanId,
    parentSpanId: span.parentSpanContext?.spanId ?? null,
    name: span.name,
    kind: span.kind,
    status: span.status.code,
    durationMs: Math.round(nanos(span.duration) / 1e4) / 100,
    attributes: span.attributes,
    events: span.events.map(e => ({ name: e.name, attributes: e.attributes ?? {} })),
  };
}
export type SpanRecord = ReturnType<typeof spanRecord>;

export const toJsonl = (spans: readonly ReadableSpan[]) =>
  spans.map(s => JSON.stringify(spanRecord(s))).join('\n') + '\n';
