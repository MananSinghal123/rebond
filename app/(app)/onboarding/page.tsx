import { redirect } from 'next/navigation';
import { Button, Field, Notice, PageHeader, Panel, inputClass } from '@/components/ui';
import { ROLE_HOME } from '@/lib/auth/edge';
import { requireSession } from '@/lib/auth/session';
import { chooseRoleAction } from './actions';

const ROLE_OPTIONS = [
  { value: 'INVESTOR', title: 'Investor', body: 'Compare bonds by yield, term and curator, fund them and track payouts.' },
  { value: 'COMPANY', title: 'Company', body: 'Raise capital at a fixed rate, backed by your contracted revenue.' },
  { value: 'CURATOR', title: 'Curator', body: 'Vet applications, put your name on bonds and earn a fee.' },
] as const;

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await requireSession();
  if (session.role) redirect(ROLE_HOME[session.role]);
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="How will you use ReBond?" description="Each account has one role. You can't change it later in this demo." />
      <Panel>
        <form action={chooseRoleAction} className="grid gap-6">
          <fieldset className="grid gap-3">
            <legend className="mb-2 text-sm font-medium">Role</legend>
            {ROLE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer gap-3 rounded-md border border-line p-4 has-[:checked]:border-accent"
              >
                <input type="radio" name="role" value={option.value} required className="mt-1 accent-[var(--color-accent)]" />
                <span className="grid gap-0.5">
                  <span className="text-sm font-medium">{option.title}</span>
                  <span className="text-sm text-muted">{option.body}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <Field label="Company or display name" hint="Required for companies and curators. Shown publicly on bonds.">
            <input name="displayName" maxLength={120} className={inputClass} />
          </Field>
          <label className="flex gap-3 text-sm">
            <input type="checkbox" name="verified" className="mt-0.5 accent-[var(--color-accent)]" />
            <span>
              Investors: I confirm I am a verified investor. <span className="text-muted">(Self-attested for this demo. Required to fund.)</span>
            </span>
          </label>
          {error && <Notice>{error}</Notice>}
          <Button className="justify-self-start">Continue</Button>
        </form>
      </Panel>
    </div>
  );
}
