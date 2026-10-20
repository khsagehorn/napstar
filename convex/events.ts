import { ConvexError, v } from 'convex/values';

import type { Id } from './_generated/dataModel';
import { mutation, type MutationCtx } from './_generated/server';
import { requireChildAccess } from './lib/auth';
import { eventRuleError } from './lib/validation';
import { eventInput, timerType, type EventInput, type TimerType } from './validators';

/** Throws the first business rule `event` breaks (see `eventRuleError`). */
function assertEventRules(event: EventInput) {
  // Mutations aren't cached, so reading the clock here is fine.
  const error = eventRuleError(event, Date.now());
  if (error) throw new ConvexError(error);
}

/** The timer type if this event would be a running (open) timer, else null. */
function openTimerType(event: EventInput): TimerType | null {
  if (event.type !== 'sleep' && event.type !== 'pump') return null;
  return event.endAt === undefined ? event.type : null;
}

/**
 * Enforces one running timer per child per type. Mutations are transactional,
 * so this check can't race with a concurrent start.
 */
async function assertNoOpenTimer(
  ctx: MutationCtx,
  childId: Id<'children'>,
  type: TimerType,
  ignoreId?: Id<'events'>,
) {
  const open = await ctx.db
    .query('events')
    .withIndex('by_child_type_open', (q) =>
      q.eq('childId', childId).eq('type', type).eq('endAt', undefined),
    )
    .take(2);
  if (open.some((e) => e._id !== ignoreId)) {
    throw new ConvexError(`A ${type} timer is already running`);
  }
}

/** Loads an event and checks the caller can access its child. Never trusts a client childId. */
async function requireEventAccess(ctx: MutationCtx, id: Id<'events'>) {
  const event = await ctx.db.get(id);
  if (!event) throw new ConvexError('Entry not found');
  const access = await requireChildAccess(ctx, event.childId);
  return { event, ...access };
}

/** Logs an event. `loggedBy` is set from the signed-in user. Returns the new id. */
export const create = mutation({
  args: { event: eventInput },
  handler: async (ctx, { event }) => {
    const { user } = await requireChildAccess(ctx, event.childId);
    assertEventRules(event);
    const timer = openTimerType(event);
    if (timer) await assertNoOpenTimer(ctx, event.childId, timer);
    return await ctx.db.insert('events', { ...event, loggedBy: user._id });
  },
});

/**
 * Replaces an event's fields (the edit form submits the whole event, so
 * cleared optional fields are removed). The child, type, and original logger
 * can't change.
 */
export const update = mutation({
  args: { id: v.id('events'), event: eventInput },
  handler: async (ctx, { id, event }) => {
    const { event: existing } = await requireEventAccess(ctx, id);
    if (event.childId !== existing.childId) {
      throw new ConvexError("An entry can't be moved to another child");
    }
    if (event.type !== existing.type) throw new ConvexError("An entry's type can't be changed");
    assertEventRules(event);
    const timer = openTimerType(event);
    if (timer) await assertNoOpenTimer(ctx, event.childId, timer, id);
    await ctx.db.replace(id, { ...event, loggedBy: existing.loggedBy });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id('events') },
  handler: async (ctx, { id }) => {
    await requireEventAccess(ctx, id);
    await ctx.db.delete(id);
    return null;
  },
});

/** Starts a sleep or pump timer now. Rejects if one of that type is already running. */
export const startTimer = mutation({
  args: { childId: v.id('children'), type: timerType },
  handler: async (ctx, { childId, type }) => {
    const { user } = await requireChildAccess(ctx, childId);
    await assertNoOpenTimer(ctx, childId, type);
    // Mutations aren't cached, so reading the clock here is fine.
    return await ctx.db.insert('events', {
      type,
      childId,
      startAt: Date.now(),
      loggedBy: user._id,
    });
  },
});

/** Stops a running timer. `amountMl` is only accepted for pump sessions. */
export const stopTimer = mutation({
  args: { eventId: v.id('events'), endAt: v.number(), amountMl: v.optional(v.number()) },
  handler: async (ctx, { eventId, endAt, amountMl }) => {
    const { event } = await requireEventAccess(ctx, eventId);
    if (event.type !== 'sleep' && event.type !== 'pump') {
      throw new ConvexError('Only sleep and pump entries have a timer');
    }
    if (event.endAt !== undefined) throw new ConvexError('This timer has already stopped');
    if (event.type === 'sleep') {
      if (amountMl !== undefined) throw new ConvexError('Sleep entries have no amount');
      assertEventRules({ ...event, endAt });
      await ctx.db.patch(eventId, { endAt });
    } else {
      assertEventRules({ ...event, endAt, amountMl });
      await ctx.db.patch(eventId, { endAt, amountMl });
    }
    return null;
  },
});
