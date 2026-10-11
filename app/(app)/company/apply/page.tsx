import { ApplicationForm } from '@/components/application-form';
import { PageHeader, Panel } from '@/components/ui';
import { requireActor } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { saveApplicationAction } from '../actions';

export default async function ApplyPage() {
  const actor = await requireActor('COMPANY');
  const company = await db.company.findUniqueOrThrow({ where: { ownerId: actor.userId } });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Apply to raise a bond"
        description="Set a fixed rate and term backed by your contracted revenue. A curator reviews it before it is listed."
      />
      <Panel>
        <ApplicationForm action={saveApplicationAction} defaults={{ companyName: company.name, description: company.description }} />
      </Panel>
    </div>
  );
}
