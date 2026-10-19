import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';

import { api } from './_generated/api';
import schema from './schema';
import { modules, setupHousehold } from './test/fixtures.test-utils';

describe('children.list', () => {
  test('throws when signed out', async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.children.list, {})).rejects.toThrow('Not signed in');
  });

  test('returns an empty list for a user with no household', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) =>
      ctx.db.insert('users', { tokenIdentifier: 'token-new', unitPreference: 'ml' }),
    );
    const asNew = t.withIdentity({ tokenIdentifier: 'token-new' });
    expect(await asNew.query(api.children.list, {})).toEqual([]);
  });

  test("never returns another household's children", async () => {
    const t = convexTest(schema, modules);
    const a = await setupHousehold(t, 'token-a');
    await setupHousehold(t, 'token-b');
    const asA = t.withIdentity({ tokenIdentifier: 'token-a' });
    const children = await asA.query(api.children.list, {});
    expect(children.map((c) => c._id)).toEqual([a.childId]);
  });

  test('returns children from every household the user belongs to, oldest first', async () => {
    const t = convexTest(schema, modules);
    const a = await setupHousehold(t, 'token-a');
    const b = await setupHousehold(t, 'token-b');
    const { secondChildId } = await t.run(async (ctx) => {
      // A joins B's household as a caregiver, then A's household adds a second child.
      await ctx.db.insert('householdMembers', {
        householdId: b.householdId,
        userId: a.userId,
        role: 'caregiver',
      });
      const secondChildId = await ctx.db.insert('children', {
        householdId: a.householdId,
        name: 'Second',
        birthDate: '2026-09-01',
        timezone: 'America/Chicago',
      });
      return { secondChildId };
    });

    const asA = t.withIdentity({ tokenIdentifier: 'token-a' });
    const children = await asA.query(api.children.list, {});
    expect(children.map((c) => c._id)).toEqual([a.childId, b.childId, secondChildId]);
  });
});
