import type { Role } from '@/lib/domain/types';
import { KNOWLEDGE } from './knowledge';

const MAX_PATH_CHARS = 120;

// Frozen: no timestamps or per-request data, so the prompt cache hits on every request.
const SYSTEM_PROMPT = `You are the ReBond assistant, a help widget inside the ReBond web app. You answer questions about how ReBond works.

Rules:
- Answer only from the knowledge base below. If it doesn't cover the question, say you don't know and point to the most relevant page of the app.
- You can't see the user's account, bonds, positions or payouts. For questions about their own data, point them to the right page (for example /portfolio, /bonds, /company or /curator).
- Don't give investment, legal or tax advice, and don't recommend specific bonds. You can explain how things work.
- When money or blockchain records come up, remind them this is a demo: no real funds, simulated on-chain records.
- Politely decline requests unrelated to ReBond.
- Be brief: two to five sentences, or a short list. Write plain text without markdown headings, tables or bold.

<knowledge_base>
${KNOWLEDGE}
</knowledge_base>`;

export function buildSystemPrompt(): string {
  return SYSTEM_PROMPT;
}

/** Per-request context, sent after the cached prompt. The path is a client hint, so it's sanitised. */
export function buildContextBlock({ role, signedIn, path }: { role: Role | null; signedIn: boolean; path?: string }): string {
  const viewer = !signedIn ? 'a visitor who is not signed in' : role ? `a signed-in ${role.toLowerCase()}` : 'a signed-in user who has not chosen a role yet';
  const page = path ? sanitizePath(path) : null;
  return `The person asking is ${viewer}${page ? `, currently on the page ${page}` : ''}.`;
}

function sanitizePath(path: string): string | null {
  const clean = path.replace(/[^a-zA-Z0-9/_-]/g, '').slice(0, MAX_PATH_CHARS);
  return clean.startsWith('/') ? clean : null;
}
