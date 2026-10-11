import Anthropic from '@anthropic-ai/sdk';
import type { Session } from '@/lib/auth/edge';
import { buildContextBlock, buildSystemPrompt } from './prompt';
import type { RateLimitResult } from './rate-limit';
import { ChatRequestSchema } from './schema';

const MAX_OUTPUT_TOKENS = 4096;
export const REFUSAL_TEXT = "Sorry, I can't help with that. I can answer questions about how ReBond works.";
export const CUT_OFF_TEXT = '\n\n(Sorry, the answer was cut off. Please try again.)';

export type ChatDeps = {
  anthropic: () => Anthropic;
  model: string;
  getSession: () => Promise<Session | null>;
  rateLimit: (key: string) => RateLimitResult;
};

const json = (status: number, error: string, headers: Record<string, string> = {}) =>
  Response.json({ error }, { status, headers });

function clientKey(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown';
}

export async function handleChat(request: Request, deps: ChatDeps): Promise<Response> {
  const limit = deps.rateLimit(clientKey(request));
  if (!limit.ok) {
    return json(429, 'Too many questions. Please wait a moment.', { 'Retry-After': String(limit.retryAfterSeconds) });
  }

  const parsed = ChatRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json(400, 'Invalid chat request.');

  const session = await deps.getSession();
  const stream = deps.anthropic().beta.messages.stream(
    {
      model: deps.model,
      max_tokens: MAX_OUTPUT_TOKENS,
      output_config: { effort: 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [
        { type: 'text', text: buildSystemPrompt(), cache_control: { type: 'ephemeral' } },
        { type: 'text', text: buildContextBlock({ role: session?.role ?? null, signedIn: Boolean(session), path: parsed.data.path }) },
      ],
      messages: parsed.data.messages,
    },
    { signal: request.signal },
  );

  const events = stream[Symbol.asyncIterator]();
  try {
    // Wait for the first event so API failures become a proper status instead of a broken stream.
    await events.next();
  } catch (error) {
    return apiErrorResponse(error);
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let wroteText = false;
      try {
        for (let next = await events.next(); !next.done; next = await events.next()) {
          const event = next.value;
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            wroteText = true;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const message = await stream.finalMessage();
        if (message.stop_reason === 'refusal') controller.enqueue(encoder.encode(wroteText ? `\n\n${REFUSAL_TEXT}` : REFUSAL_TEXT));
        console.info('[assistant]', {
          model: message.model,
          stop: message.stop_reason,
          input: message.usage.input_tokens,
          cacheRead: message.usage.cache_read_input_tokens,
          output: message.usage.output_tokens,
        });
      } catch (error) {
        if (!request.signal.aborted) {
          console.error('[assistant] stream failed', error);
          controller.enqueue(encoder.encode(CUT_OFF_TEXT));
        }
      }
      controller.close();
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}

function apiErrorResponse(error: unknown): Response {
  console.error('[assistant] request failed', error);
  if (error instanceof Anthropic.RateLimitError || error instanceof Anthropic.InternalServerError) {
    return json(503, 'The assistant is busy. Please try again shortly.');
  }
  return json(502, 'The assistant is unavailable right now.');
}
