import { query } from './_generated/server';
import { requireUser } from './lib/auth';

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
