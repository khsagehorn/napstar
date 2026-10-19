import { ConvexError } from 'convex/values';

import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';

type Ctx = QueryCtx | MutationCtx;

/** The signed-in user's row. Throws if signed out or not yet stored. */
export async function requireUser(ctx: Ctx): Promise<Doc<'users'>> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError('Not signed in');
  const user = await ctx.db
    .query('users')
    .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
    .unique();
  if (!user) throw new ConvexError('User not found');
  return user;
}

/** Ensures the signed-in user belongs to `householdId`. */
export async function requireHouseholdMember(ctx: Ctx, householdId: Id<'households'>) {
  const user = await requireUser(ctx);
  const membership = await ctx.db
    .query('householdMembers')
    .withIndex('by_household_user', (q) =>
      q.eq('householdId', householdId).eq('userId', user._id),
    )
    .unique();
  if (!membership) throw new ConvexError('No access');
  return { user, membership };
}

/** Ensures the signed-in user belongs to the household that owns `childId`. */
export async function requireChildAccess(ctx: Ctx, childId: Id<'children'>) {
  const child = await ctx.db.get(childId);
  if (!child) throw new ConvexError('Child not found');
  const { user, membership } = await requireHouseholdMember(ctx, child.householdId);
  return { user, child, membership };
}
