# Stripe Integration - Phase 1: Core Infrastructure

## Overview

Set up Stripe SDK, usage limit utilities, session/auth changes for `isPro`, checkout flow API, and customer portal API. This phase builds all server-side infrastructure needed before wiring up webhooks and UI.

## Prerequisites

- Stripe Dashboard configured with DevStash Pro product, monthly ($8) and yearly ($72) prices
- Environment variables set: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_YEARLY`
- Database already has `isPro`, `stripeCustomerId`, `stripeSubscriptionId` fields on User model

## Requirements

- Install `stripe` npm package
- Initialize Stripe SDK in `src/lib/stripe.ts`
- Create usage limit utilities in `src/lib/usage.ts` with unit tests
- Add `isPro` to NextAuth session and JWT types
- Update auth callbacks to sync `isPro` from database
- Create checkout session API route
- Create customer portal API route

## Implementation

### 1. Install Stripe SDK

```bash
npm install stripe
```

### 2. Create `src/lib/stripe.ts`

Initialize the Stripe Node SDK with the secret key.

```typescript
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
});
```

### 3. Create `src/lib/usage.ts`

Free tier limits and utility functions for checking user usage.

| Constant | Value |
|----------|-------|
| `MAX_ITEMS` | 50 |
| `MAX_COLLECTIONS` | 3 |

Functions:
- `getUserUsage(userId, isPro)` - Returns item/collection counts and whether user can create more
- `canCreateItem(userId, isPro)` - Quick boolean check for item creation
- `canCreateCollection(userId, isPro)` - Quick boolean check for collection creation

Pro users bypass all limits (return `true` immediately).

### 4. Unit Tests for `src/lib/usage.test.ts`

Test cases:
- `getUserUsage` returns correct counts and `canCreate` booleans
- `canCreateItem` returns `true` when under limit
- `canCreateItem` returns `false` when at limit (50 items)
- `canCreateCollection` returns `true` when under limit
- `canCreateCollection` returns `false` when at limit (3 collections)
- Pro users bypass all item limits
- Pro users bypass all collection limits
- `getUserUsage` sets `canCreateItem: false` at exactly 50 items
- `getUserUsage` sets `canCreateCollection: false` at exactly 3 collections

Mock `prisma.item.count` and `prisma.collection.count` for all tests.

### 5. Modify `src/types/next-auth.d.ts`

Add `isPro: boolean` to `Session.user` and `isPro?: boolean` to `JWT`.

### 6. Modify `src/auth.ts`

- Make `jwt` callback `async`
- Query `isPro` from database on every JWT creation (indexed primary key lookup, single boolean field)
- Pass `isPro` from token to `session.user` in session callback

Trade-off: One small DB query per session validation (`SELECT isPro FROM users WHERE id = ?`). Fast because it's indexed on PK and returns a single boolean. Ensures `session.user.isPro` is always accurate after webhook updates.

### 7. Create `src/app/api/stripe/checkout/route.ts`

POST endpoint that:
1. Authenticates user via `auth()`
2. Accepts `{ plan: 'monthly' | 'yearly' }` in request body (NOT raw priceId from client)
3. Maps plan to server-side price ID env var
4. Finds or creates Stripe customer (stores `stripeCustomerId` in DB)
5. Creates Stripe Checkout Session with `mode: 'subscription'`
6. Sets `metadata.userId` on checkout session for webhook processing
7. Returns `{ url }` for client redirect
8. Success URL: `/settings?upgraded=true`, Cancel URL: `/settings`

### 8. Create `src/app/api/stripe/portal/route.ts`

POST endpoint that:
1. Authenticates user via `auth()`
2. Looks up user's `stripeCustomerId` from database
3. Returns 400 if no billing account found
4. Creates Stripe Billing Portal session
5. Returns `{ url }` for client redirect
6. Return URL: `/settings`

## New Files

| File | Purpose |
|------|---------|
| `src/lib/stripe.ts` | Stripe SDK initialization |
| `src/lib/usage.ts` | Free tier usage limit checks |
| `src/lib/usage.test.ts` | Unit tests for usage utilities |
| `src/app/api/stripe/checkout/route.ts` | Create Stripe Checkout sessions |
| `src/app/api/stripe/portal/route.ts` | Create Stripe Customer Portal sessions |

## Modified Files

| File | Changes |
|------|---------|
| `src/types/next-auth.d.ts` | Add `isPro` to Session and JWT types |
| `src/auth.ts` | Async JWT callback with `isPro` DB sync, session callback passes `isPro` |

## Notes

- Price IDs stay server-side only (Option B from plan) - client sends `plan: 'monthly' | 'yearly'`, API maps to env var
- Checkout route validates plan value against allowed strings, not raw price IDs
- Customer portal requires prior Stripe customer creation (happens during first checkout)
- No UI changes in this phase - all API routes can be tested with curl/Postman
- Run `npm run test` to verify usage limit tests pass
- Run `npm run build` to verify no type errors
