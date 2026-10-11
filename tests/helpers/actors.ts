import { chooseRole, signUp } from '@/lib/services/accounts';
import { unwrap, type Actor, type Role } from '@/lib/domain/types';

let sequence = 0;

export async function makeActor(role: Role, options: { name?: string; verified?: boolean } = {}): Promise<Actor> {
  sequence += 1;
  const user = unwrap(await signUp({ email: `${role.toLowerCase()}${sequence}@example.test`, password: 'correct horse battery' }));
  unwrap(
    await chooseRole(user.id, {
      role,
      displayName: options.name ?? `${role} ${sequence}`,
      verified: options.verified ?? true,
    }),
  );
  return { userId: user.id, role };
}
