import { Button, Field, Notice, PageHeader, Panel, inputClass } from '@/components/ui';
import { authenticate } from './actions';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next = '' } = await searchParams;

  return (
    <div className="mx-auto max-w-sm">
      <PageHeader title="Sign in to ReBond" description="Use your email. New here? Enter an email and password and choose Create account." />
      <Panel>
        <form action={authenticate} className="grid gap-4">
          <input type="hidden" name="next" value={next} />
          <Field label="Email">
            <input name="email" type="email" autoComplete="email" required className={inputClass} />
          </Field>
          <Field label="Password" hint="At least 8 characters.">
            <input name="password" type="password" autoComplete="current-password" minLength={8} required className={inputClass} />
          </Field>
          {error && <Notice>{error}</Notice>}
          <div className="flex flex-wrap gap-3">
            <Button name="intent" value="signin">Sign in</Button>
            <Button name="intent" value="signup" variant="secondary">Create account</Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
