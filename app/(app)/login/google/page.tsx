import { redirect } from 'next/navigation';
import { Button, Field, Notice, PageHeader, Panel, inputClass } from '@/components/ui';
import { entryPath } from '@/lib/auth/edge';
import { getSession } from '@/lib/auth/session';
import { googleDemoAction } from '../actions';

export default async function GoogleDemoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const [{ error, next = '' }, session] = await Promise.all([searchParams, getSession()]);
  if (session) redirect(entryPath(session));

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Continue with Google" description="Choose the account to use with ReBond." />
      <Panel className="grid gap-5">
        <p className="rounded-[6px] border border-warn/25 bg-warn/[0.06] px-4 py-3 text-[13px] text-warn">
          Demo: this simulates Google sign-in. It creates an account and a demo embedded wallet. Nothing is sent to Google.
        </p>
        <form action={googleDemoAction} className="grid gap-4">
          <input type="hidden" name="next" value={next} />
          <Field label="Name">
            <input name="name" autoComplete="name" required maxLength={120} className={inputClass} />
          </Field>
          <Field label="Google email">
            <input name="email" type="email" autoComplete="email" required className={inputClass} />
          </Field>
          {error && <Notice>{error}</Notice>}
          <Button className="sm:h-10 sm:text-[15px]">Continue</Button>
        </form>
      </Panel>
    </div>
  );
}
