import { redirect } from 'next/navigation';
import { Button, ButtonLink, Field, Notice, PageHeader, Panel, inputClass } from '@/components/ui';
import { WalletConnect } from '@/components/wallet-connect';
import { entryPath } from '@/lib/auth/edge';
import { getSession } from '@/lib/auth/session';
import { authenticate } from './actions';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const [{ error, next = '' }, session] = await Promise.all([searchParams, getSession()]);
  if (session) redirect(entryPath(session));
  const googleHref = next ? `/login/google?next=${encodeURIComponent(next)}` : '/login/google';

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Sign in to ReBond" description="Continue with Google or a Cardano wallet. You will pick your role next." />
      <Panel className="grid gap-6">
        <div className="grid gap-2">
          <ButtonLink href={googleHref} className="h-11 text-[17px]">Continue with Google</ButtonLink>
          <p className="text-center text-[12px] text-muted">Creates a demo embedded wallet for you.</p>
        </div>

        <div className="grid gap-3">
          <p className="text-[13px] font-medium text-ink/80">Or connect a Cardano wallet</p>
          <WalletConnect mode="sign-in" next={next} />
        </div>

        <details className="group border-t border-line pt-5" open={Boolean(error)}>
          <summary className="cursor-pointer list-none text-[13px] font-medium text-muted hover:text-ink">
            Use email and password instead
          </summary>
          <form action={authenticate} className="mt-4 grid gap-4">
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
        </details>
      </Panel>
    </div>
  );
}
