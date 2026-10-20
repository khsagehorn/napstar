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
    vi.setSystemTime(NOW + 2 * HOUR); // the timer has been running for 2h
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
    vi.setSystemTime(NOW + 2 * HOUR); // the timer has been running for 2h
    await expect(
      asB.mutation(api.events.stopTimer, { eventId: id, endAt: NOW + HOUR }),
    ).rejects.toThrow('No access');
  });

  test('stops a pump timer and records the amount', async () => {
    const { t, asA, a } = await setup();
    const id = await asA.mutation(api.events.startTimer, { childId: a.childId, type: 'pump' });
    vi.setSystemTime(NOW + 2 * HOUR); // the timer has been running for 2h
    await asA.mutation(api.events.stopTimer, { eventId: id, endAt: NOW + HOUR, amountMl: 90 });
    expect(await getEvent(t, id)).toMatchObject({ endAt: NOW + HOUR, amountMl: 90 });
  });

  test('rejects an amount on a sleep timer', async () => {
    const { asA, a } = await setup();
    const id = await asA.mutation(api.events.startTimer, { childId: a.childId, type: 'sleep' });
    vi.setSystemTime(NOW + 2 * HOUR); // the timer has been running for 2h
    await expect(
      asA.mutation(api.events.stopTimer, { eventId: id, endAt: NOW + HOUR, amountMl: 90 }),
    ).rejects.toThrow('no amount');
  });

  test('rejects stopping a timer twice', async () => {
    const { asA, a } = await setup();
    const id = await asA.mutation(api.events.startTimer, { childId: a.childId, type: 'sleep' });
    vi.setSystemTime(NOW + 2 * HOUR); // the timer has been running for 2h
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

  test('rejects an end time before the start', async () => {
    const { asA, a } = await setup();
    const id = await asA.mutation(api.events.startTimer, { childId: a.childId, type: 'sleep' });
    await expect(
      asA.mutation(api.events.stopTimer, { eventId: id, endAt: NOW - HOUR }),
    ).rejects.toThrow('after start');
  });

  test('rejects an end time in the future', async () => {
    const { asA, a } = await setup();
    const id = await asA.mutation(api.events.startTimer, { childId: a.childId, type: 'sleep' });
    await expect(
      asA.mutation(api.events.stopTimer, { eventId: id, endAt: NOW + HOUR }),
    ).rejects.toThrow('future');
  });

  test('rejects an out-of-range pump amount', async () => {
    const { asA, a } = await setup();
    const id = await asA.mutation(api.events.startTimer, { childId: a.childId, type: 'pump' });
    vi.setSystemTime(NOW + HOUR);
    await expect(
      asA.mutation(api.events.stopTimer, { eventId: id, endAt: NOW + HOUR, amountMl: 1001 }),
    ).rejects.toThrow('between 0 and 1000');
  });
});

describe('business rules (1.3)', () => {
  const feeding = (childId: Id<'children'>) =>
    ({ type: 'feeding', childId, startAt: NOW - HOUR, method: 'formula' }) as const;

  test.each([
    ['a diaper that is neither wet nor dirty', { wet: false, dirty: false }, 'wet, dirty, or both'],
    ['a start more than 5 minutes in the future', { startAt: NOW + 6 * 60 * 1000 }, 'future'],
  ])('create rejects %s', async (_label, override, message) => {
    const { asA, a } = await setup();
    await expect(
      asA.mutation(api.events.create, { event: { ...diaper(a.childId), ...override } }),
    ).rejects.toThrow(message);
  });

  test('create allows a start up to 5 minutes ahead (device clock drift)', async () => {
    const { asA, a } = await setup();
    await expect(
      asA.mutation(api.events.create, {
        event: { ...diaper(a.childId), startAt: NOW + 5 * 60 * 1000 },
      }),
    ).resolves.toBeDefined();
  });

  test.each([
    ['a negative amount', { amountMl: -1 }, 'between 0 and 1000'],
    ['a huge amount', { amountMl: 1001 }, 'between 0 and 1000'],
    ['a food name on a formula feeding', { foodName: 'banana' }, 'only for solids'],
  ])('create rejects a feeding with %s', async (_label, override, message) => {
    const { asA, a } = await setup();
    await expect(
      asA.mutation(api.events.create, { event: { ...feeding(a.childId), ...override } }),
    ).rejects.toThrow(message);
  });

  test('create accepts a solid feeding with a food name', async () => {
    const { asA, a } = await setup();
    await expect(
      asA.mutation(api.events.create, {
        event: { ...feeding(a.childId), method: 'solid', foodName: 'banana', amountMl: 30 },
      }),
    ).resolves.toBeDefined();
  });

  test('create rejects a sleep that ends before it starts', async () => {
    const { asA, a } = await setup();
    await expect(
      asA.mutation(api.events.create, {
        event: { type: 'sleep', childId: a.childId, startAt: NOW - HOUR, endAt: NOW - HOUR },
      }),
    ).rejects.toThrow('after start');
  });

  test('update applies the same rules and leaves the entry unchanged', async () => {
    const { t, asA, a } = await setup();
    const id = await asA.mutation(api.events.create, { event: diaper(a.childId) });
    await expect(
      asA.mutation(api.events.update, {
        id,
        event: { ...diaper(a.childId), wet: false, dirty: false },
      }),
    ).rejects.toThrow('wet, dirty, or both');
    expect(await getEvent(t, id)).toMatchObject({ wet: true, dirty: false });
  });
});

describe('events.latestByType', () => {
  test('throws when signed out', async () => {
    const { t, a } = await setup();
    await expect(t.query(api.events.latestByType, { childId: a.childId })).rejects.toThrow(
      'Not signed in',
    );
  });

  test("rejects reading another household's child", async () => {
    const { asB, a } = await setup();
    await expect(asB.query(api.events.latestByType, { childId: a.childId })).rejects.toThrow(
      'No access',
    );
  });

  test('returns null for every type when nothing is logged', async () => {
    const { asA, a } = await setup();
    expect(await asA.query(api.events.latestByType, { childId: a.childId })).toEqual({
      feeding: null,
      sleep: null,
      pump: null,
      medication: null,
      diaper: null,
    });
  });

  test('picks the latest start time, not the latest logged (backdating)', async () => {
    const { asA, a } = await setup();
    const recentId = await asA.mutation(api.events.create, {
      event: { ...diaper(a.childId), startAt: NOW - HOUR },
    });
    // Logged afterwards, but it happened earlier.
    await asA.mutation(api.events.create, {
      event: { ...diaper(a.childId), startAt: NOW - 3 * HOUR, dirty: true },
    });
    const latest = await asA.query(api.events.latestByType, { childId: a.childId });
    expect(latest.diaper?._id).toBe(recentId);
  });

  test('keeps types and children separate', async () => {
    const { t, asA, a } = await setup();
    const siblingId = await t.run(async (ctx) =>
      ctx.db.insert('children', {
        householdId: a.householdId,
        name: 'Sibling',
        birthDate: '2026-06-01',
        timezone: 'America/Chicago',
      }),
    );
    const feedingId = await asA.mutation(api.events.create, {
      event: {
        type: 'feeding',
        childId: a.childId,
        startAt: NOW - 2 * HOUR,
        method: 'formula',
        amountMl: 120,
      },
    });
    const sleepId = await asA.mutation(api.events.startTimer, { childId: a.childId, type: 'sleep' });
    await asA.mutation(api.events.create, { event: diaper(siblingId) });

    const latest = await asA.query(api.events.latestByType, { childId: a.childId });
    expect(latest.feeding).toMatchObject({ _id: feedingId, method: 'formula', amountMl: 120 });
    expect(latest.sleep?._id).toBe(sleepId);
    expect(latest.diaper).toBeNull();
    expect(latest.pump).toBeNull();
    expect(latest.medication).toBeNull();
  });
});

describe('events.openTimers', () => {
  test('throws when signed out', async () => {
    const { t, a } = await setup();
    await expect(t.query(api.events.openTimers, { childId: a.childId })).rejects.toThrow(
      'Not signed in',
    );
  });

  test("rejects reading another household's child", async () => {
    const { asB, a } = await setup();
    await expect(asB.query(api.events.openTimers, { childId: a.childId })).rejects.toThrow(
      'No access',
    );
  });

  test('returns running timers only', async () => {
    const { asA, a } = await setup();
    await asA.mutation(api.events.create, {
      event: { type: 'sleep', childId: a.childId, startAt: NOW - 3 * HOUR, endAt: NOW - 2 * HOUR },
    });
    const pumpId = await asA.mutation(api.events.startTimer, { childId: a.childId, type: 'pump' });
    expect(await asA.query(api.events.openTimers, { childId: a.childId })).toMatchObject({
      sleep: null,
      pump: { _id: pumpId, type: 'pump', startAt: NOW },
    });
  });

  test('a stopped timer is no longer returned', async () => {
    const { asA, a } = await setup();
    const id = await asA.mutation(api.events.startTimer, { childId: a.childId, type: 'sleep' });
    vi.setSystemTime(NOW + HOUR);
    await asA.mutation(api.events.stopTimer, { eventId: id, endAt: NOW + HOUR });
    expect(await asA.query(api.events.openTimers, { childId: a.childId })).toEqual({
      sleep: null,
      pump: null,
    });
  });

  test("ignores another child's running timer", async () => {
    const { asA, asB, a, b } = await setup();
    await asB.mutation(api.events.startTimer, { childId: b.childId, type: 'sleep' });
    expect(await asA.query(api.events.openTimers, { childId: a.childId })).toEqual({
      sleep: null,
      pump: null,
    });
  });
});
