import { query } from './_generated/server';
import { requireUser } from './lib/auth';

/**
 * Children in every household the signed-in user belongs to, oldest record
 * first, so the first-created child is the default selection.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const memberships = await ctx.db
      .query('householdMembers')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .take(20);
    const perHousehold = await Promise.all(
      memberships.map((m) =>
        ctx.db
          .query('children')
          .withIndex('by_household', (q) => q.eq('householdId', m.householdId))
          .take(20),
      ),
    );
    return perHousehold.flat().sort((a, b) => a._creationTime - b._creationTime);
  },
});
