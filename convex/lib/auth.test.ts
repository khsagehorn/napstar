import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';

import schema from '../schema';
import { modules, setupHousehold } from '../test/fixtures.test-utils';
import { requireChildAccess, requireHouseholdMember, requireUser } from './auth';

describe('requireUser', () => {
  test('throws when signed out', async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(async (ctx) => requireUser(ctx))).rejects.toThrow('Not signed in');
  });

  test('throws when the identity has no stored user', async () => {
    const t = convexTest(schema, modules);
    const asGhost = t.withIdentity({ tokenIdentifier: 'ghost' });
    await expect(asGhost.query(async (ctx) => requireUser(ctx))).rejects.toThrow(
      'User not found',
    );
  });

  test('returns the stored user', async () => {
    const t = convexTest(schema, modules);
    const a = await setupHousehold(t, 'token-a');
    const asA = t.withIdentity({ tokenIdentifier: 'token-a' });
    const user = await asA.query(async (ctx) => requireUser(ctx));
    expect(user._id).toBe(a.userId);
  });
});

describe('requireHouseholdMember', () => {
  test('allows a member', async () => {
    const t = convexTest(schema, modules);
    const a = await setupHousehold(t, 'token-a');
    const asA = t.withIdentity({ tokenIdentifier: 'token-a' });
    const { membership } = await asA.query(async (ctx) =>
      requireHouseholdMember(ctx, a.householdId),
    );
    expect(membership.role).toBe('owner');
  });

  test("rejects a non-member of another household", async () => {
    const t = convexTest(schema, modules);
    const a = await setupHousehold(t, 'token-a');
    await setupHousehold(t, 'token-b');
    const asB = t.withIdentity({ tokenIdentifier: 'token-b' });
    await expect(
      asB.query(async (ctx) => requireHouseholdMember(ctx, a.householdId)),
    ).rejects.toThrow('No access');
  });
});

describe('requireChildAccess', () => {
  test('allows a member of the child’s household', async () => {
    const t = convexTest(schema, modules);
    const a = await setupHousehold(t, 'token-a');
    const asA = t.withIdentity({ tokenIdentifier: 'token-a' });
    const { child } = await asA.query(async (ctx) => requireChildAccess(ctx, a.childId));
    expect(child._id).toBe(a.childId);
  });

  test("rejects a non-member of the child's household", async () => {
    const t = convexTest(schema, modules);
    const a = await setupHousehold(t, 'token-a');
    await setupHousehold(t, 'token-b');
    const asB = t.withIdentity({ tokenIdentifier: 'token-b' });
    await expect(asB.query(async (ctx) => requireChildAccess(ctx, a.childId))).rejects.toThrow(
      'No access',
    );
  });

  test('rejects when signed out', async () => {
    const t = convexTest(schema, modules);
    const a = await setupHousehold(t, 'token-a');
    await expect(t.query(async (ctx) => requireChildAccess(ctx, a.childId))).rejects.toThrow(
      'Not signed in',
    );
  });

  test('rejects a deleted child', async () => {
    const t = convexTest(schema, modules);
    const a = await setupHousehold(t, 'token-a');
    await t.run(async (ctx) => ctx.db.delete(a.childId));
    const asA = t.withIdentity({ tokenIdentifier: 'token-a' });
    await expect(asA.query(async (ctx) => requireChildAccess(ctx, a.childId))).rejects.toThrow(
      'Child not found',
    );
  });
});
