import { ConvexError, v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { requireUser } from './lib/auth';
import { isValidDateKey, isValidTimeZone, MAX_NAME_LENGTH, todayKeyIn } from './lib/validation';

/** Households the signed-in user belongs to, with their role in each. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const memberships = await ctx.db
      .query('householdMembers')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .take(20);
    const households = await Promise.all(
      memberships.map(async (m) => {
        const household = await ctx.db.get(m.householdId);
        return household && { ...household, role: m.role };
      }),
    );
    return households.filter((h) => h !== null);
  },
});

/**
 * Onboarding: creates the caller's household (as owner) and its first child.
 * Rejects if the caller already belongs to a household, so a double-tap
 * can't create two.
 */
export const create = mutation({
  args: {
    child: v.object({
      name: v.string(),
      birthDate: v.string(), // YYYY-MM-DD
      timezone: v.string(), // IANA
    }),
  },
  handler: async (ctx, { child }) => {
    const user = await requireUser(ctx);

    const existing = await ctx.db
      .query('householdMembers')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first();
    if (existing) throw new ConvexError('You already belong to a household');

    const name = child.name.trim();
    if (!name) throw new ConvexError("Enter your child's name");
    if (name.length > MAX_NAME_LENGTH) {
      throw new ConvexError(`Name must be ${MAX_NAME_LENGTH} characters or fewer`);
    }
    if (!isValidTimeZone(child.timezone)) throw new ConvexError('Unknown time zone');
    if (!isValidDateKey(child.birthDate)) throw new ConvexError('Enter a valid birth date');
    // Mutations aren't cached, so reading the clock here is fine.
    if (child.birthDate > todayKeyIn(child.timezone, Date.now())) {
      throw new ConvexError("Birth date can't be in the future");
    }

    const householdId = await ctx.db.insert('households', {
      name: `${name}'s family`,
      createdBy: user._id,
    });
    await ctx.db.insert('householdMembers', { householdId, userId: user._id, role: 'owner' });
    const childId = await ctx.db.insert('children', {
      householdId,
      name,
      birthDate: child.birthDate,
      timezone: child.timezone,
    });
    return { householdId, childId };
  },
});
