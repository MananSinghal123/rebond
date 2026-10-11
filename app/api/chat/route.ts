import { handleChat } from '@/lib/assistant/chat';
import { assistantEnabled, assistantModel, getAnthropic } from '@/lib/assistant/client';
import { createRateLimiter } from '@/lib/assistant/rate-limit';
import { getSession } from '@/lib/auth/session';

export const runtime = 'nodejs';

const rateLimit = createRateLimiter();

/** Public FAQ assistant. Not behind middleware: visitors can ask too, so it's rate limited per IP. */
export async function POST(request: Request) {
  if (!assistantEnabled()) return Response.json({ error: 'The assistant is not configured.' }, { status: 503 });
  return handleChat(request, { anthropic: getAnthropic, model: assistantModel(), getSession, rateLimit });
}
