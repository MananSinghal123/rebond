import Anthropic from '@anthropic-ai/sdk';

export const DEFAULT_ASSISTANT_MODEL = 'claude-opus-5-5';

let client: Anthropic | null = null;

export const assistantEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

export const assistantModel = () => process.env.ASSISTANT_MODEL || DEFAULT_ASSISTANT_MODEL;

export function getAnthropic(): Anthropic {
  client ??= new Anthropic();
  return client;
}
