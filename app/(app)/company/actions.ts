'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { FormState } from '@/components/application-form';
import { requireActor } from '@/lib/auth/session';
import { saveApplication } from '@/lib/services/applications';

const textFields = (formData: FormData) =>
  Object.fromEntries([...formData].filter((entry): entry is [string, string] => typeof entry[1] === 'string'));

export async function saveApplicationAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor('COMPANY');
  const files = formData.getAll('documents').filter((value): value is File => value instanceof File && value.size > 0);
  const documents = await Promise.all(
    files.map(async (file) => ({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) })),
  );

  const result = await saveApplication(actor, {
    bondId: String(formData.get('bondId') ?? '') || undefined,
    submit: formData.get('intent') === 'submit',
    fields: Object.fromEntries(formData),
    documents,
  });
  if (!result.ok) return { error: result.error, values: textFields(formData) };

  revalidatePath('/company');
  redirect(`/company/bonds/${result.value.bondId}`);
}
