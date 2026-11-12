// OpenTelemetry tracing for model calls, embeddings, retrieval, agent turns and tool calls (ADR 0020).
//
// The app depends only on @opentelemetry/api: without a registered provider every call below is a no-op.
// Tests and the desktop recordings register an SDK provider and read the spans.
//
// The GenAI semantic conventions are still in Development, so every gen_ai.* name lives here and nowhere else,
// and the convention version they follow is recorded on each span. Prompts, model output, tool arguments and
// source text are never recorded: only identities, counts, durations, outcomes and hashes.
import { SpanKind, SpanStatusCode, trace, type Attributes, type Span } from '@opentelemetry/api';
import { HttpError } from './errors.ts';
import type { Generation, TextProvider } from './local-model.ts';

export const TRACER_NAME = 'opsledger';
/** GenAI semantic conventions these attribute names follow (Development status). */
export const GENAI_CONVENTIONS = 'opentelemetry-semantic-conventions@1.43.0 (gen_ai: development)';

export const ATTR = {
  operation: 'gen_ai.operation.name',
  provider: 'gen_ai.provider.name',
  requestModel: 'gen_ai.request.model',
  responseModel: 'gen_ai.response.model',
  inputTokens: 'gen_ai.usage.input_tokens',
  outputTokens: 'gen_ai.usage.output_tokens',
  finishReasons: 'gen_ai.response.finish_reasons',
  agentName: 'gen_ai.agent.name',
  toolName: 'gen_ai.tool.name',
  toolType: 'gen_ai.tool.type',
  dataSource: 'gen_ai.data_source.id',
  topK: 'gen_ai.request.top_k',
  errorType: 'error.type',
  conventions: 'opsledger.telemetry.conventions',
  modelDigest: 'opsledger.model.digest',
  modelRuntime: 'opsledger.model.runtime',
} as const;

export const tracer = () => trace.getTracer(TRACER_NAME);

/** Stable, non-sensitive error classification: our HttpError codes, otherwise the error class name. */
export const errorType = (error: unknown) =>
  error instanceof HttpError ? error.code : error instanceof Error ? error.name || 'Error' : 'unknown';

/** Runs `work` inside an active span; marks the span as an error and rethrows if `work` throws. */
export async function inSpan<T>(
  name: string,
  attributes: Attributes,
  work: (span: Span) => Promise<T>,
  kind: SpanKind = SpanKind.INTERNAL,
): Promise<T> {
  return tracer().startActiveSpan(
    name,
    { kind, attributes: { [ATTR.conventions]: GENAI_CONVENTIONS, ...attributes } },
    async span => {
      try {
        return await work(span);
      } catch (error) {
        span.setAttribute(ATTR.errorType, errorType(error));
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      } finally {
        span.end();
      }
    },
  );
}

/** One model call as a `text_completion` client span, with the model identity and token usage it reported. */
export function traceGeneration(
  provider: TextProvider,
  prompt: string,
  format?: Record<string, unknown>,
  attributes: Attributes = {},
): Promise<Generation> {
  return inSpan(
    'text_completion',
    { [ATTR.operation]: 'text_completion', [ATTR.provider]: 'ollama', ...attributes },
    async span => {
      const generated = await provider.generate(prompt, format);
      span.updateName(`text_completion ${generated.model}`);
      span.setAttributes({
        [ATTR.responseModel]: generated.model,
        [ATTR.modelDigest]: generated.digest,
        [ATTR.modelRuntime]: generated.runtime,
        [ATTR.finishReasons]: [generated.truncated ? 'length' : 'stop'],
        ...(generated.promptTokens !== null ? { [ATTR.inputTokens]: generated.promptTokens } : {}),
        ...(generated.outputTokens !== null ? { [ATTR.outputTokens]: generated.outputTokens } : {}),
      });
      return generated;
    },
    SpanKind.CLIENT,
  );
}

/** One embedding request as an `embeddings` client span; records how many inputs, never the inputs. */
export function traceEmbeddings<T>(model: string, inputs: number, purpose: string, work: () => Promise<T>) {
  return inSpan(
    `embeddings ${model}`,
    {
      [ATTR.operation]: 'embeddings',
      [ATTR.provider]: 'ollama',
      [ATTR.requestModel]: model,
      'opsledger.embeddings.inputs': inputs,
      'opsledger.embeddings.purpose': purpose,
    },
    () => work(),
    SpanKind.CLIENT,
  );
}

/** One tool call as an `execute_tool` span. */
export function traceTool<T>(name: string, work: (span: Span) => Promise<T>, attributes: Attributes = {}) {
  return inSpan(
    `execute_tool ${name}`,
    { [ATTR.operation]: 'execute_tool', [ATTR.toolName]: name, [ATTR.toolType]: 'function', ...attributes },
    work,
  );
}

/** Copies only primitive, non-content fields of an internal event onto the active span. */
export function spanEvent(span: Span, name: string, data: unknown) {
  const safe: Attributes = {};
  if (data && typeof data === 'object')
    for (const key of ['reason', 'name', 'passed'] as const) {
      const value = (data as Record<string, unknown>)[key];
      if (typeof value === 'string' || typeof value === 'boolean') safe[`opsledger.${key}`] = value;
    }
  span.addEvent(name, safe);
}
