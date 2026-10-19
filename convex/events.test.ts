import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import schema from './schema';
import { modules, setupHousehold, type TestConvex } from './test/fixtures.test-utils';

const NOW = Date.UTC(2026, 9, 19, 15, 0); // 2026-10-19 10:00 Chicago
const HOUR = 60 * 60 * 1000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

/** Household A (the caller) and household B (a stranger). */
async function setup() {
  const t = convexTest(schema, modules);
  const a = await setupHousehold(t, 'token-a');
  const b = await setupHousehold(t, 'token-b');
  return {
    t,
    a,
    b,
    asA: t.withIdentity({ tokenIdentifier: 'token-a' }),
    asB: t.withIdentity({ tokenIdentifier: 'token-b' }),
  };
}

const diaper = (childId: Id<'children'>) =>
  ({ type: 'diaper', childId, startAt: NOW - HOUR, wet: true, dirty: false }) as const;

const getEvent = (t: TestConvex, id: Id<'events'>) => t.run(async (ctx) => ctx.db.get(id));

describe('events.create', () => {
  test('throws when signed out', async () => {
    const { t, a } = await setup();
    await expect(t.mutation(api.events.create, { event: diaper(a.childId) })).rejects.toThrow(
      'Not signed in',
    );
  });

  test("rejects logging for another household's child", async () => {
    const { asB, a } = await setup();
    await expect(asB.mutation(api.events.create, { event: diaper(a.childId) })).rejects.toThrow(
      'No access',
    );
  });

  test('sets loggedBy from the signed-in user', async () => {
    const { t, asA, a } = await setup();
    const id = await asA.mutation(api.events.create, { event: diaper(a.childId) });
    expect(await getEvent(t, id)).toMatchObject({ ...diaper(a.childId), loggedBy: a.userId });
  });

  test('rejects a client-supplied loggedBy', async () => {
    const { asA, a, b } = await setup();
    // The argument validator rejects fields it doesn't declare, like loggedBy.
    const event = { ...diaper(a.childId), loggedBy: b.userId };
    await expect(asA.mutation(api.events.create, { event })).rejects.toThrow();
  });

  test('rejects an open sleep while a sleep timer is running', async () => {
    const { asA, a } = await setup();
    await asA.mutation(api.events.startTimer, { childId: a.childId, type: 'sleep' });
    await expect(
      asA.mutation(api.events.create, {
        event: { type: 'sleep', childId: a.childId, startAt: NOW - HOUR },
      }),
    ).rejects.toThrow('already running');
  });

  test('allows a finished sleep while a sleep timer is running', async () => {
    const { asA, a } = await setup();
    await asA.mutation(api.events.startTimer, { childId: a.childId, type: 'sleep' });
    await expect(
      asA.mutation(api.events.create, {
        event: { type: 'sleep', childId: a.childId, startAt: NOW - 3 * HOUR, endAt: NOW - 2 * HOUR },
      }),
    ).resolves.toBeDefined();
  });
});

describe('events.update', () => {
  test("rejects editing another household's event", async () => {
    const { asA, asB, a } = await setup();
    const id = await asA.mutation(api.events.create, { event: diaper(a.childId) });
    await expect(
      asB.mutation(api.events.update, { id, event: { ...diaper(a.childId), dirty: true } }),
    ).rejects.toThrow('No access');
  });

  test('replaces the fields and keeps the original logger', async () => {
    const { t, asA, a } = await setup();
    const id = await asA.mutation(api.events.create, {
      event: {
        type: 'feeding',
        childId: a.childId,
        startAt: NOW - HOUR,
        method: 'formula',
        amountMl: 120,
        notes: 'spit up a bit',
      },
    });
    // A caregiver in the same household edits it and clears the amount and notes.
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { tokenIdentifier: 'token-c', unitPreference: 'oz' });
      await ctx.db.insert('householdMembers', { householdId: a.householdId, userId, role: 'caregiver' });
    });
    const asC = t.withIdentity({ tokenIdentifier: 'token-c' });
    await asC.mutation(api.events.update, {
      id,
      event: { type: 'feeding', childId: a.childId, startAt: NOW - 2 * HOUR, method: 'breast_milk' },
    });

    const stored = await getEvent(t, id);
    expect(stored).toMatchObject({ method: 'breast_milk', startAt: NOW - 2 * HOUR, loggedBy: a.userId });
    expect(stored).not.toHaveProperty('amountMl');
    expect(stored).not.toHaveProperty('notes');
  });

  test("can't move an event to another child, even in the same household", async () => {
    const { t, asA, a } = await setup();
    const id = await asA.mutation(api.events.create, { event: diaper(a.childId) });
    const siblingId = await t.run(async (ctx) =>
      ctx.db.insert('children', {
        householdId: a.householdId,
        name: 'Sibling',
        birthDate: '2026-06-01',
        timezone: 'America/Chicago',
      }),
    );
    await expect(
      asA.mutation(api.events.update, { id, event: diaper(siblingId) }),
    ).rejects.toThrow('another child');
  });

  test("can't move an event into another household's child", async () => {
    const { asA, a, b } = await setup();
    const id = await asA.mutation(api.events.create, { event: diaper(a.childId) });
    await expect(asA.mutation(api.events.update, { id, event: diaper(b.childId) })).rejects.toThrow();
  });

  test("can't change an event's type", async () => {
    const { asA, a } = await setup();
    const id = await asA.mutation(api.events.create, { event: diaper(a.childId) });
    await expect(
      asA.mutation(api.events.update, {
        id,
        event: { type: 'feeding', childId: a.childId, startAt: NOW, method: 'formula' },
      }),
    ).rejects.toThrow('type');
  });

  test('can edit the start of a running timer without tripping the one-timer rule', async () => {
    const { t, asA, a } = await setup();
    const id = await asA.mutation(api.events.startTimer, { childId: a.childId, type: 'sleep' });
    await asA.mutation(api.events.update, {
      id,
      event: { type: 'sleep', childId: a.childId, startAt: NOW - HOUR },
    });
    expect(await getEvent(t, id)).toMatchObject({ startAt: NOW - HOUR });
  });

  test('rejects reopening a finished sleep while another sleep timer runs', async () => {
    const { asA, a } = await setup();
    const id = await asA.mutation(api.events.create, {
      event: { type: 'sleep', childId: a.childId, startAt: NOW - 3 * HOUR, endAt: NOW - 2 * HOUR },
    });
    await asA.mutation(api.events.startTimer, { childId: a.childId, type: 'sleep' });
    await expect(
      asA.mutation(api.events.update, {
        id,
        event: { type: 'sleep', childId: a.childId, startAt: NOW - 3 * HOUR },
      }),
    ).rejects.toThrow('already running');
  });
});

describe('events.remove', () => {
  test("rejects deleting another household's event", async () => {
    const { t, asA, asB, a } = await setup();
    const id = await asA.mutation(api.events.create, { event: diaper(a.childId) });
    await expect(asB.mutation(api.events.remove, { id })).rejects.toThrow('No access');
    expect(await getEvent(t, id)).not.toBeNull();
  });

  test('deletes the event', async () => {
    const { t, asA, a } = await setup();
    const id = await asA.mutation(api.events.create, { event: diaper(a.childId) });
    await asA.mutation(api.events.remove, { id });
    expect(await getEvent(t, id)).toBeNull();
  });

  test('throws for an event that no longer exists', async () => {
    const { asA, a } = await setup();
    const id = await asA.mutation(api.events.create, { event: diaper(a.childId) });
    await asA.mutation(api.events.remove, { id });
    await expect(asA.mutation(api.events.remove, { id })).rejects.toThrow('not found');
  });
});

describe('events.startTimer', () => {
  test("rejects starting a timer for another household's child", async () => {
    const { asB, a } = await setup();
    await expect(
      asB.mutation(api.events.startTimer, { childId: a.childId, type: 'sleep' }),
    ).rejects.toThrow('No access');
  });

  test('starts an open timer now, logged by the caller', async () => {
    const { t, asA, a } = await setup();
    const id = await asA.mutation(api.events.startTimer, { childId: a.childId, type: 'pump' });
    const stored = await getEvent(t, id);
    expect(stored).toMatchObject({ type: 'pump', childId: a.childId, startAt: NOW, loggedBy: a.userId });
    expect(stored).not.toHaveProperty('endAt');
  });

  test('rejects a second timer of the same type for the same child', async () => {
    const { asA, a } = await setup();
    await asA.mutation(api.events.startTimer, { childId: a.childId, type: 'sleep' });
    await expect(
      asA.mutation(api.events.startTimer, { childId: a.childId, type: 'sleep' }),
    ).rejects.toThrow('already running');
  });

  test('allows a sleep and a pump timer at the same time', async () => {
    const { asA, a } = await setup();
    await asA.mutation(api.events.startTimer, { childId: a.childId, type: 'sleep' });
    await expect(
      asA.mutation(api.events.startTimer, { childId: a.childId, type: 'pump' }),
    ).resolves.toBeDefined();
  });

  test('allows a new timer once the previous one stops', async () => {
    const { asA, a } = await setup();
    const id = await asA.mutation(api.events.startTimer, { childId: a.childId, type: 'sleep' });
    await asA.mutation(api.events.stopTimer, { eventId: id, endAt: NOW + HOUR });
    await expect(
      asA.mutation(api.events.startTimer, { childId: a.childId, type: 'sleep' }),
    ).resolves.toBeDefined();
  });

  test("another household's running timer doesn't block this child", async () => {
    const { asA, asB, a, b } = await setup();
    await asB.mutation(api.events.startTimer, { childId: b.childId, type: 'sleep' });
    await expect(
      asA.mutation(api.events.startTimer, { childId: a.childId, type: 'sleep' }),
    ).resolves.toBeDefined();
  });
});

describe('events.stopTimer', () => {
  test("rejects stopping another household's timer", async () => {
    const { asA, asB, a } = await setup();
    const id = await asA.mutation(api.events.startTimer, { childId: a.childId, type: 'sleep' });
    await expect(
      asB.mutation(api.events.stopTimer, { eventId: id, endAt: NOW + HOUR }),
    ).rejects.toThrow('No access');
  });

  test('stops a pump timer and records the amount', async () => {
    const { t, asA, a } = await setup();
    const id = await asA.mutation(api.events.startTimer, { childId: a.childId, type: 'pump' });
    await asA.mutation(api.events.stopTimer, { eventId: id, endAt: NOW + HOUR, amountMl: 90 });
    expect(await getEvent(t, id)).toMatchObject({ endAt: NOW + HOUR, amountMl: 90 });
  });

  test('rejects an amount on a sleep timer', async () => {
    const { asA, a } = await setup();
    const id = await asA.mutation(api.events.startTimer, { childId: a.childId, type: 'sleep' });
    await expect(
      asA.mutation(api.events.stopTimer, { eventId: id, endAt: NOW + HOUR, amountMl: 90 }),
    ).rejects.toThrow('no amount');
  });

  test('rejects stopping a timer twice', async () => {
    const { asA, a } = await setup();
    const id = await asA.mutation(api.events.startTimer, { childId: a.childId, type: 'sleep' });
    await asA.mutation(api.events.stopTimer, { eventId: id, endAt: NOW + HOUR });
    await expect(
      asA.mutation(api.events.stopTimer, { eventId: id, endAt: NOW + 2 * HOUR }),
    ).rejects.toThrow('already stopped');
  });

  test('rejects stopping an event that is not a timer', async () => {
    const { asA, a } = await setup();
    const id = await asA.mutation(api.events.create, { event: diaper(a.childId) });
    await expect(
      asA.mutation(api.events.stopTimer, { eventId: id, endAt: NOW + HOUR }),
    ).rejects.toThrow('timer');
  });
});
