import type { AuthConfig } from 'convex/server';

// CLERK_JWT_ISSUER_DOMAIN is set in the Convex dashboard (per deployment), not
// in code. It's the Clerk Frontend API URL, e.g. https://xxx.clerk.accounts.dev.
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: 'convex',
    },
  ],
} satisfies AuthConfig;
