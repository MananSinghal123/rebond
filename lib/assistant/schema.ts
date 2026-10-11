import { z } from 'zod';

export const MAX_MESSAGE_CHARS = 2000;
export const MAX_HISTORY = 20;

const ChatMessage = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(MAX_MESSAGE_CHARS),
});

export const ChatRequestSchema = z.object({
  messages: z
    .array(ChatMessage)
    .min(1)
    .max(MAX_HISTORY)
    .refine((messages) => messages[0]?.role === 'user' && messages.at(-1)?.role === 'user', {
      message: 'The conversation must start and end with a user message.',
    })
    .refine((messages) => messages.every((m, i) => i === 0 || m.role !== messages[i - 1].role), {
      message: 'Messages must alternate between user and assistant.',
    }),
  path: z.string().max(200).optional(),
});

export type ChatMessage = z.infer<typeof ChatMessage>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
