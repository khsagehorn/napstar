/// <reference types="vite/client" />
import type { TestConvex as GenericTestConvex } from 'convex-test';

import type { Id } from '../_generated/dataModel';
import type schema from '../schema';

export type TestConvex = GenericTestConvex<typeof schema>;

export const modules = import.meta.glob('../**/*.*s');

/** Creates a user, a household they own, and one child in it. */
export async function setupHousehold(t: TestConvex, token: string) {
  return t.run(async (ctx) => {
    const userId = await ctx.db.insert('users', { tokenIdentifier: token, unitPreference: 'ml' });
    const householdId = await ctx.db.insert('households', { name: 'H', createdBy: userId });
    await ctx.db.insert('householdMembers', { householdId, userId, role: 'owner' });
    const childId: Id<'children'> = await ctx.db.insert('children', {
      householdId,
      name: 'Baby',
      birthDate: '2026-06-01',
      timezone: 'America/Chicago',
    });
    return { userId, householdId, childId };
  });
}
