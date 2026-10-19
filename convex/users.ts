import { ConvexError } from 'convex/values';

import { mutation, query } from './_generated/server';

/**
 * Upserts the signed-in user's row from their Clerk identity. Called once
 * after sign-in; safe to call repeatedly.
 */
export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError('Not signed in');

    const existing = await ctx.db
      .query('users')
      .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .unique();

    const profile = {
      name: identity.name ?? identity.givenName,
      email: identity.email,
    };

    if (existing) {
      if (existing.name !== profile.name || existing.email !== profile.email) {
        await ctx.db.patch(existing._id, profile);
      }
      return existing._id;
    }

    return await ctx.db.insert('users', {
      tokenIdentifier: identity.tokenIdentifier,
      ...profile,
      unitPreference: 'ml',
    });
  },
});

/**
 * The signed-in user's row, or null if `store` hasn't run yet.
 * Throws when signed out.
 */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError('Not signed in');
    return await ctx.db
      .query('users')
      .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .unique();
  },
});
