import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

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

describe('households.create', () => {
  const child = { name: 'Juno', birthDate: '2026-06-01', timezone: 'America/Chicago' };

  async function newUser(t: ReturnType<typeof convexTest>, token = 'token-new') {
    await t.run(async (ctx) =>
      ctx.db.insert('users', { tokenIdentifier: token, unitPreference: 'ml' }),
    );
    return t.withIdentity({ tokenIdentifier: token });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.UTC(2026, 9, 19, 15, 0)); // 2026-10-19 10:00 Chicago
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test('throws when signed out', async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.households.create, { child })).rejects.toThrow('Not signed in');
  });

  test('creates the household, owner membership, and first child', async () => {
    const t = convexTest(schema, modules);
    const asNew = await newUser(t);
    const { householdId, childId } = await asNew.mutation(api.households.create, {
      child: { ...child, name: '  Juno  ' },
    });

    const households = await asNew.query(api.households.mine, {});
    expect(households).toHaveLength(1);
    expect(households[0]).toMatchObject({ _id: householdId, name: "Juno's family", role: 'owner' });

    const stored = await t.run(async (ctx) => ctx.db.get(childId));
    expect(stored).toMatchObject({
      householdId,
      name: 'Juno',
      birthDate: '2026-06-01',
      timezone: 'America/Chicago',
    });
  });

  test('rejects a second household for the same user', async () => {
    const t = convexTest(schema, modules);
    const asNew = await newUser(t);
    await asNew.mutation(api.households.create, { child });
    await expect(asNew.mutation(api.households.create, { child })).rejects.toThrow(
      'already belong',
    );
    const count = await t.run(async (ctx) => (await ctx.db.query('households').collect()).length);
    expect(count).toBe(1);
  });

  test.each([
    [{ name: '   ' }, "child's name"],
    [{ name: 'x'.repeat(51) }, '50 characters'],
    [{ birthDate: '2026-02-30' }, 'valid birth date'],
    [{ birthDate: '06/01/2026' }, 'valid birth date'],
    [{ birthDate: '2026-10-20' }, 'future'],
    [{ timezone: 'Mars/Olympus' }, 'time zone'],
  ])('rejects invalid input %o', async (override, message) => {
    const t = convexTest(schema, modules);
    const asNew = await newUser(t);
    await expect(
      asNew.mutation(api.households.create, { child: { ...child, ...override } }),
    ).rejects.toThrow(message);
  });

  test("allows a birth date of today in the child's zone, even if UTC is a day ahead", async () => {
    // 2026-10-20 03:00 UTC is still 2026-10-19 in Chicago.
    vi.setSystemTime(Date.UTC(2026, 9, 20, 3, 0));
    const t = convexTest(schema, modules);
    const asNew = await newUser(t);
    await expect(
      asNew.mutation(api.households.create, { child: { ...child, birthDate: '2026-10-19' } }),
    ).resolves.toBeDefined();
  });
});
