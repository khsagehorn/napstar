import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';

import { api } from './_generated/api';
import schema from './schema';
import { modules, setupHousehold } from './test/fixtures.test-utils';

describe('households.mine', () => {
  test('throws when signed out', async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.households.mine, {})).rejects.toThrow('Not signed in');
  });

  test('returns an empty list for a user with no household', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) =>
      ctx.db.insert('users', { tokenIdentifier: 'token-new', unitPreference: 'ml' }),
    );
    const asNew = t.withIdentity({ tokenIdentifier: 'token-new' });
    expect(await asNew.query(api.households.mine, {})).toEqual([]);
  });

  test("returns only the caller's households", async () => {
    const t = convexTest(schema, modules);
    const a = await setupHousehold(t, 'token-a');
    await setupHousehold(t, 'token-b');
    const asA = t.withIdentity({ tokenIdentifier: 'token-a' });
    const households = await asA.query(api.households.mine, {});
    expect(households).toHaveLength(1);
    expect(households[0]).toMatchObject({ _id: a.householdId, role: 'owner' });
  });
});
