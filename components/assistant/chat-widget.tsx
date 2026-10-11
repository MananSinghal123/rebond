'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Button, CONTROL } from '@/components/ui';

type Message = { role: 'user' | 'assistant'; content: string };

const STORAGE_KEY = 'rebond-assistant';
const MAX_HISTORY = 20;
const MAX_CHARS = 2000;
const STOPPED = '(Stopped.)';
const STARTERS = ['How does a bond get listed?', "What's the minimum investment?", 'What do curators do?'];

const ICON_BUTTON = 'grid size-9 place-items-center rounded-[6px] text-muted transition-colors duration-150 hover:bg-fill hover:text-ink';

function loadHistory(): Message[] {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(saved) ? saved.filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content) : [];
  } catch {
    return [];
  }
}

function saveHistory(messages: Message[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_HISTORY)));
  } catch {
    // Storage unavailable (private mode, blocked): history just won't survive a reload.
  }
}

/** The API needs alternating turns that start with the user, within the history cap. */
function forRequest(messages: Message[]): Message[] {
  const recent = messages.slice(-MAX_HISTORY);
  return recent[0]?.role === 'assistant' ? recent.slice(1) : recent;
}

/** Floating FAQ assistant: a launcher in the corner that opens a non-modal chat panel. */
export function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const controller = useRef<AbortController | null>(null);
  const wasOpen = useRef(false);

  useEffect(() => setMessages(loadHistory()), []);

  useEffect(() => {
    if (!streaming) saveHistory(messages);
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [messages, streaming]);

  useEffect(() => {
    if (open) input.current?.focus();
    else if (wasOpen.current) launcher.current?.focus();
    wasOpen.current = open;
  }, [open]);

  useEffect(() => () => controller.current?.abort(), []);

  // Document-level so Esc still works after focus falls to <body> (e.g. a starter button unmounts).
  useEffect(() => {
    if (!open) return;
    const onKey = (event: globalThis.KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  async function ask(history: Message[]) {
    setError(null);
    setStreaming(true);
    setMessages([...history, { role: 'assistant', content: '' }]);
    const abort = new AbortController();
    controller.current = abort;
    let answer = '';
    const show = (content: string) => setMessages([...history, { role: 'assistant', content }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: forRequest(history), path: pathname }),
        signal: abort.signal,
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Something went wrong. Please try again.');
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
        answer += decoder.decode(chunk.value, { stream: true });
        show(answer);
      }
      if (!answer) throw new Error('No answer came back. Please try again.');
    } catch (err) {
      if (abort.signal.aborted) {
        // A cleared chat detaches its controller first; only a Stop keeps the partial answer.
        if (controller.current === abort) show(answer || STOPPED);
      } else {
        // Leave the question last so Retry can resend it.
        setMessages(history);
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      }
    } finally {
      controller.current = null;
      setStreaming(false);
    }
  }

  function send(text: string) {
    const content = text.trim().slice(0, MAX_CHARS);
    if (!content || streaming) return;
    // Drop a question that failed earlier so turns keep alternating.
    const base = messages.at(-1)?.role === 'user' ? messages.slice(0, -1) : messages;
    setDraft('');
    input.current?.focus();
    void ask([...base, { role: 'user', content }]);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    send(draft);
  }

  function onComposerKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send(draft);
    }
  }

  function clear() {
    const running = controller.current;
    controller.current = null;
    running?.abort();
    setMessages([]);
    setError(null);
    input.current?.focus();
  }

  return (
    <>
      {!open && (
        <button
          ref={launcher}
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className="fixed right-4 bottom-4 z-40 inline-flex h-11 items-center gap-2 rounded-[8px] border border-line-strong bg-surface px-4 text-[15px] font-medium text-ink shadow-[0_6px_20px_oklch(0.2_0.008_255/0.12)] transition-colors duration-150 hover:bg-fill sm:right-6 sm:bottom-6"
        >
          <svg aria-hidden viewBox="0 0 20 20" className="size-[18px] text-accent" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
            <path d="M3.5 4.5h13v9h-7l-4 3v-3h-2z" />
          </svg>
          Ask ReBond
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="ReBond assistant"
          className="fixed inset-x-0 bottom-0 z-40 flex h-[85dvh] flex-col rounded-t-[8px] border border-line-strong bg-surface text-ink shadow-[0_12px_40px_oklch(0.2_0.008_255/0.18)] sm:inset-x-auto sm:right-6 sm:bottom-6 sm:h-[min(560px,calc(100dvh-7rem))] sm:w-[380px] sm:rounded-[8px]"
        >
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-line pr-1.5 pl-4">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Ask ReBond</h2>
            <div className="flex items-center">
              {messages.length > 0 && (
                <button type="button" onClick={clear} className="h-9 rounded-[6px] px-2.5 text-[13px] text-muted transition-colors duration-150 hover:bg-fill hover:text-ink">
                  Clear chat
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant" className={ICON_BUTTON}>
                <svg aria-hidden viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M5 5l10 10M15 5L5 15" />
                </svg>
              </button>
            </div>
          </div>

          <div ref={log} role="log" aria-live="polite" aria-busy={streaming} className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            {messages.length === 0 ? (
              <div className="grid gap-3">
                <p className="text-[14px] text-ink-2">Questions about how ReBond works? Ask here, or try one of these:</p>
                <ul className="grid gap-2">
                  {STARTERS.map((question) => (
                    <li key={question}>
                      <button
                        type="button"
                        onClick={() => send(question)}
                        className="w-full rounded-[6px] border border-line bg-paper px-3 py-2 text-left text-[14px] text-ink transition-colors duration-150 hover:border-line-strong hover:bg-fill"
                      >
                        {question}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <ol className="grid gap-3">
                {messages.map((message, index) => (
                  <li
                    key={index}
                    className={
                      message.role === 'user'
                        ? 'ml-8 justify-self-end rounded-[8px] bg-accent/[0.08] px-3 py-2 text-[14px] whitespace-pre-wrap text-ink'
                        : 'mr-4 text-[14px] leading-relaxed whitespace-pre-wrap text-ink-2'
                    }
                  >
                    <span className="sr-only">{message.role === 'user' ? 'You: ' : 'Assistant: '}</span>
                    {message.content || <span className="text-muted">Thinking…</span>}
                  </li>
                ))}
              </ol>
            )}
            {error && (
              <div role="alert" className="mt-3 flex items-center justify-between gap-3 rounded-[6px] border border-bad/30 px-3 py-2 text-[13px] text-bad">
                <span>{error}</span>
                <button type="button" onClick={() => ask(messages)} className="shrink-0 font-medium underline underline-offset-2">
                  Retry
                </button>
              </div>
            )}
          </div>

          <form onSubmit={onSubmit} className="shrink-0 border-t border-line p-3">
            <div className="flex items-end gap-2">
              <label htmlFor="assistant-input" className="sr-only">
                Your question
              </label>
              <textarea
                id="assistant-input"
                ref={input}
                rows={1}
                value={draft}
                maxLength={MAX_CHARS}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={onComposerKey}
                placeholder="Ask a question"
                className={`${CONTROL} max-h-32 resize-none py-2`}
              />
              {streaming ? (
                <Button type="button" variant="secondary" onClick={() => controller.current?.abort()}>
                  Stop
                </Button>
              ) : (
                <Button type="submit" disabled={!draft.trim()}>
                  Send
                </Button>
              )}
            </div>
            <p className="mt-2 text-[12px] text-muted">AI answers can be wrong. Demo: no real funds.</p>
          </form>
        </div>
      )}
    </>
  );
}
