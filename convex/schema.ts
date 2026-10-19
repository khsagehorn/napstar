import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

import { eventDoc, memberRole, unitPreference } from './validators';

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    unitPreference,
  }).index('by_token', ['tokenIdentifier']),

  households: defineTable({
    name: v.string(),
    createdBy: v.id('users'),
  }),

  householdMembers: defineTable({
    householdId: v.id('households'),
    userId: v.id('users'),
    role: memberRole,
  })
    .index('by_user', ['userId'])
    .index('by_household', ['householdId'])
    .index('by_household_user', ['householdId', 'userId']),

  children: defineTable({
    householdId: v.id('households'),
    name: v.string(),
    birthDate: v.string(), // YYYY-MM-DD
    timezone: v.string(), // IANA, e.g. "America/Chicago"
  }).index('by_household', ['householdId']),

  invites: defineTable({
    householdId: v.id('households'),
    code: v.string(),
    createdBy: v.id('users'),
    expiresAt: v.number(),
    usedBy: v.optional(v.id('users')),
  }).index('by_code', ['code']),

  events: defineTable(eventDoc)
    .index('by_child_time', ['childId', 'startAt'])
    .index('by_child_type_time', ['childId', 'type', 'startAt'])
    .index('by_child_type_open', ['childId', 'type', 'endAt']),
});
