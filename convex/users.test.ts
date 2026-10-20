import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';

import { api } from './_generated/api';
import schema from './schema';
import { modules } from './test/fixtures.test-utils';

const identity = { tokenIdentifier: 'token-a', name: 'Ada', email: 'ada@example.com' };

describe('users.store', () => {
  test('throws when signed out', async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.users.store, {})).rejects.toThrow('Not signed in');
  });

  test('creates the user once and is idempotent', async () => {
    const t = convexTest(schema, modules);
    const asA = t.withIdentity(identity);
    const first = await asA.mutation(api.users.store, {});
    const second = await asA.mutation(api.users.store, {});
    expect(second).toBe(first);

    const users = await t.run(async (ctx) => ctx.db.query('users').collect());
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({
      tokenIdentifier: 'token-a',
      name: 'Ada',
      email: 'ada@example.com',
      unitPreference: 'ml',
    });
  });

  test('refreshes name and email but keeps preferences', async () => {
    const t = convexTest(schema, modules);
    const id = await t.withIdentity(identity).mutation(api.users.store, {});
    await t.run(async (ctx) => ctx.db.patch(id, { unitPreference: 'oz' }));

    await t
      .withIdentity({ ...identity, name: 'Ada L.', email: 'ada@new.example.com' })
      .mutation(api.users.store, {});

    const user = await t.run(async (ctx) => ctx.db.get(id));
    expect(user).toMatchObject({ name: 'Ada L.', email: 'ada@new.example.com', unitPreference: 'oz' });
  });
});

describe('users.me', () => {
  test('throws when signed out', async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.users.me, {})).rejects.toThrow('Not signed in');
  });

  test('returns null before store, then the user', async () => {
    const t = convexTest(schema, modules);
    const asA = t.withIdentity(identity);
    expect(await asA.query(api.users.me, {})).toBeNull();
    const id = await asA.mutation(api.users.store, {});
    expect((await asA.query(api.users.me, {}))?._id).toBe(id);
  });

  test("only returns the caller's own row", async () => {
    const t = convexTest(schema, modules);
    await t.withIdentity(identity).mutation(api.users.store, {});
    const asB = t.withIdentity({ tokenIdentifier: 'token-b' });
    expect(await asB.query(api.users.me, {})).toBeNull();
  });
});

describe('users.setUnitPreference', () => {
  test('throws when signed out', async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.users.setUnitPreference, { unitPreference: 'oz' }),
    ).rejects.toThrow('Not signed in');
  });

  test('throws before the user is stored', async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.withIdentity(identity).mutation(api.users.setUnitPreference, { unitPreference: 'oz' }),
    ).rejects.toThrow('User not found');
  });

  test("updates only the caller's own preference", async () => {
    const t = convexTest(schema, modules);
    const asA = t.withIdentity(identity);
    const asB = t.withIdentity({ tokenIdentifier: 'token-b' });
    await asA.mutation(api.users.store, {});
    await asB.mutation(api.users.store, {});

    await asA.mutation(api.users.setUnitPreference, { unitPreference: 'oz' });
    expect((await asA.query(api.users.me, {}))?.unitPreference).toBe('oz');
    expect((await asB.query(api.users.me, {}))?.unitPreference).toBe('ml');

    await asA.mutation(api.users.setUnitPreference, { unitPreference: 'ml' });
    expect((await asA.query(api.users.me, {}))?.unitPreference).toBe('ml');
  });

  test('rejects an unknown unit', async () => {
    const t = convexTest(schema, modules);
    const asA = t.withIdentity(identity);
    await asA.mutation(api.users.store, {});
    await expect(
      // @ts-expect-error: the validator only allows 'ml' | 'oz'
      asA.mutation(api.users.setUnitPreference, { unitPreference: 'cups' }),
    ).rejects.toThrow();
  });
});
