# Stripe Integration Plan

> Comprehensive plan for adding Stripe subscription billing to DevStash Pro ($8/mo or $72/yr).

---

## Table of Contents

- [Current State Analysis](#current-state-analysis)
- [Stripe Dashboard Setup](#stripe-dashboard-setup)
- [Implementation Order](#implementation-order)
- [Phase 1: Stripe SDK & Utilities](#phase-1-stripe-sdk--utilities)
- [Phase 2: Session & Auth Changes](#phase-2-session--auth-changes)
- [Phase 3: Checkout Flow](#phase-3-checkout-flow)
- [Phase 4: Webhook Handler](#phase-4-webhook-handler)
- [Phase 5: Customer Portal](#phase-5-customer-portal)
- [Phase 6: Feature Gating](#phase-6-feature-gating)
- [Phase 7: UI Components](#phase-7-ui-components)
- [Files Summary](#files-summary)
- [Testing Checklist](#testing-checklist)

---

## Current State Analysis

### What's Already in Place

| Area | Status | Details |
|------|--------|---------|
| **Database schema** | Ready | `isPro`, `stripeCustomerId`, `stripeSubscriptionId` fields on User model |
| **Environment variables** | Ready | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_YEARLY` in env.example |
| **NextAuth v5** | Ready | JWT strategy with `user.id` in session. Needs `isPro` added |
| **Session types** | Needs update | `next-auth.d.ts` only has `id` on session.user |
| **Rate limiting** | Ready | Upstash Redis infra exists, can extend for usage limits |
| **UI Pro badges** | Ready | Sidebar and NewItemDialog show "PRO" badges on File/Image types |
| **Pricing page** | Ready | PricingSection.tsx with Free/Pro comparison, monthly/yearly toggle |

### What Needs to Be Built

| Area | Description |
|------|-------------|
| **Stripe SDK** | `src/lib/stripe.ts` - SDK initialization |
| **Checkout API** | `src/app/api/stripe/checkout/route.ts` - Create checkout sessions |
| **Webhook handler** | `src/app/api/webhooks/stripe/route.ts` - Process Stripe events |
| **Customer portal** | `src/app/api/stripe/portal/route.ts` - Billing management redirect |
| **Usage limits** | `src/lib/usage.ts` - Check item/collection limits |
| **Feature gating** | Modify `createItem`, `createCollection`, upload route |
| **Session isPro** | Add `isPro` to JWT callback, session type, auth config |
| **Billing UI** | Billing section on settings page, upgrade prompts |

### Key Files to Modify

| File | Changes |
|------|---------|
| `src/auth.ts` | Add `isPro` to JWT callback (always sync from DB) |
| `src/types/next-auth.d.ts` | Add `isPro` to Session and JWT types |
| `src/actions/items.ts` | Add usage limit check in `createItem` |
| `src/actions/collections.ts` | Add usage limit check in `createCollection` |
| `src/app/api/upload/route.ts` | Add Pro check before file/image uploads |
| `src/app/settings/page.tsx` | Add BillingSettings section |
| `src/components/homepage/PricingSection.tsx` | Link Pro button to checkout |

---

## Stripe Dashboard Setup

Before writing code, configure these in the [Stripe Dashboard](https://dashboard.stripe.com):

### 1. Create Product

- **Name:** DevStash Pro
- **Description:** Unlimited items, collections, file uploads, and AI features

### 2. Create Two Prices

| Price | Amount | Interval | Notes |
|-------|--------|----------|-------|
| Monthly | $8.00 USD | Monthly | Copy Price ID to `STRIPE_PRICE_ID_MONTHLY` |
| Yearly | $72.00 USD | Yearly | Copy Price ID to `STRIPE_PRICE_ID_YEARLY` |

### 3. Configure Customer Portal

Go to **Settings > Billing > Customer Portal** and enable:
- Invoice history
- Subscription cancellation
- Subscription plan switching (between monthly/yearly)
- Payment method management

### 4. Create Webhook Endpoint

Go to **Developers > Webhooks** and add:
- **URL:** `https://your-domain.com/api/webhooks/stripe`
- **Events to listen for:**
  - `checkout.session.completed`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- Copy the **Signing secret** to `STRIPE_WEBHOOK_SECRET`

### 5. Environment Variables

```env
STRIPE_SECRET_KEY="sk_test_..."          # From API keys
STRIPE_PUBLISHABLE_KEY="pk_test_..."     # From API keys
STRIPE_WEBHOOK_SECRET="whsec_..."        # From webhook endpoint
STRIPE_PRICE_ID_MONTHLY="price_..."      # From monthly price
STRIPE_PRICE_ID_YEARLY="price_..."       # From yearly price
```

---

## Implementation Order

```
Phase 1: Stripe SDK & Utilities          (lib/stripe.ts, lib/usage.ts)
Phase 2: Session & Auth Changes           (auth.ts, next-auth.d.ts)
Phase 3: Checkout Flow                    (API route + success page)
Phase 4: Webhook Handler                  (API route for Stripe events)
Phase 5: Customer Portal                  (API route for billing management)
Phase 6: Feature Gating                   (server actions + upload route)
Phase 7: UI Components                    (settings billing, upgrade prompts)
```

---

## Phase 1: Stripe SDK & Utilities

### Create `src/lib/stripe.ts`

Initialize the Stripe Node SDK.

```typescript
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
});
```

**Install:** `npm install stripe`

### Create `src/lib/usage.ts`

Utility functions to check user usage against free tier limits.

```typescript
import { prisma } from '@/lib/prisma';

export const FREE_TIER_LIMITS = {
  MAX_ITEMS: 50,
  MAX_COLLECTIONS: 3,
} as const;

interface UsageResult {
  itemCount: number;
  collectionCount: number;
  canCreateItem: boolean;
  canCreateCollection: boolean;
}

/**
 * Get user's current usage and whether they can create more resources
 */
export async function getUserUsage(userId: string, isPro: boolean): Promise<UsageResult> {
  const [itemCount, collectionCount] = await Promise.all([
    prisma.item.count({ where: { userId } }),
    prisma.collection.count({ where: { userId } }),
  ]);

  return {
    itemCount,
    collectionCount,
    canCreateItem: isPro || itemCount < FREE_TIER_LIMITS.MAX_ITEMS,
    canCreateCollection: isPro || collectionCount < FREE_TIER_LIMITS.MAX_COLLECTIONS,
  };
}

/**
 * Check if user can create an item (quick check, no full usage fetch)
 */
export async function canCreateItem(userId: string, isPro: boolean): Promise<boolean> {
  if (isPro) return true;
  const count = await prisma.item.count({ where: { userId } });
  return count < FREE_TIER_LIMITS.MAX_ITEMS;
}

/**
 * Check if user can create a collection (quick check)
 */
export async function canCreateCollection(userId: string, isPro: boolean): Promise<boolean> {
  if (isPro) return true;
  const count = await prisma.collection.count({ where: { userId } });
  return count < FREE_TIER_LIMITS.MAX_COLLECTIONS;
}
```

---

## Phase 2: Session & Auth Changes

### Modify `src/types/next-auth.d.ts`

Add `isPro` to Session and JWT types.

```typescript
import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      isPro: boolean
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    isPro?: boolean
  }
}
```

### Modify `src/auth.ts`

Update the JWT callback to always sync `isPro` from the database. This ensures the session reflects webhook-triggered changes without relying on `trigger === "update"`, which does not reliably work for server-side updates (like Stripe webhooks).

**Current JWT callback (line 80):**
```typescript
jwt({ token, user }) {
  if (user?.id) {
    token.id = user.id
  }
  return token
},
```

**Updated JWT callback:**
```typescript
async jwt({ token, user }) {
  if (user?.id) {
    token.id = user.id
  }

  // Always sync isPro from database to catch webhook updates
  if (token.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: token.id as string },
      select: { isPro: true },
    });
    token.isPro = dbUser?.isPro ?? false;
  }

  return token;
},
```

**Updated session callback (line 87):**
```typescript
session({ session, token }) {
  if (token?.id && session.user) {
    session.user.id = token.id as string
    session.user.isPro = token.isPro ?? false
  }
  return session
},
```

> **Trade-off:** This adds one small DB query (`SELECT isPro FROM users WHERE id = ?`) per session validation. The query is indexed on primary key and returns a single boolean, so it's extremely fast. The benefit is that `session.user.isPro` is always accurate after a Stripe webhook updates the database.

---

## Phase 3: Checkout Flow

### Create `src/app/api/stripe/checkout/route.ts`

Creates a Stripe Checkout Session and returns the URL.

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { priceId } = await request.json();

    // Validate price ID
    const validPriceIds = [
      process.env.STRIPE_PRICE_ID_MONTHLY,
      process.env.STRIPE_PRICE_ID_YEARLY,
    ];

    if (!priceId || !validPriceIds.includes(priceId)) {
      return NextResponse.json({ error: 'Invalid price' }, { status: 400 });
    }

    // Get or create Stripe customer
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: session.user.id },
      });

      customerId = customer.id;

      await prisma.user.update({
        where: { id: session.user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?upgraded=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
      metadata: { userId: session.user.id },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
```

---

## Phase 4: Webhook Handler

### Create `src/app/api/webhooks/stripe/route.ts`

Handles Stripe webhook events to sync subscription status.

```typescript
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
    }
  } catch (error) {
    console.error(`Error handling ${event.type}:`, error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId) return;

  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;

  if (!subscriptionId) return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      isPro: true,
      stripeCustomerId: typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id ?? undefined,
      stripeSubscriptionId: subscriptionId,
    },
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId =
    typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id;

  if (!customerId) return;

  // Ensure user stays pro after successful renewal
  await prisma.user.updateMany({
    where: { stripeCustomerId: customerId },
    data: { isPro: true },
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId =
    typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id;

  if (!customerId) return;

  // Optional: Log or notify. Don't immediately downgrade.
  // Stripe retries failed payments. Only downgrade on subscription.deleted.
  console.warn(`Payment failed for customer ${customerId}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id;

  if (!customerId) return;

  // Handle status changes (e.g., past_due, canceled, active)
  const isActive = ['active', 'trialing'].includes(subscription.status);

  await prisma.user.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      isPro: isActive,
      stripeSubscriptionId: subscription.id,
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id;

  if (!customerId) return;

  await prisma.user.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      isPro: false,
      stripeSubscriptionId: null,
    },
  });
}
```

**Important:** The webhook route must receive the raw body (not JSON-parsed). Next.js App Router routes receive raw body by default when using `request.text()`, so no special config is needed.

---

## Phase 5: Customer Portal

### Create `src/app/api/stripe/portal/route.ts`

Redirects authenticated Pro users to Stripe's hosted billing portal.

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No billing account found' },
        { status: 400 }
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('Portal error:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
```

---

## Phase 6: Feature Gating

### Modify `src/actions/items.ts` - `createItem`

Add usage limit check before creating an item.

```typescript
// Add import at top
import { canCreateItem } from '@/lib/usage';

export async function createItem(input: CreateItemInput): Promise<ActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  // Check Pro requirement for file/image types
  if (['file', 'image'].includes(input.typeName) && !session.user.isPro) {
    return { success: false, error: 'File and image uploads require a Pro subscription' };
  }

  // Check usage limits
  const allowed = await canCreateItem(session.user.id, session.user.isPro);
  if (!allowed) {
    return { success: false, error: 'You have reached the free tier limit of 50 items. Upgrade to Pro for unlimited items.' };
  }

  // ... rest of existing createItem logic
}
```

### Modify `src/actions/collections.ts` - `createCollection`

Add usage limit check before creating a collection.

```typescript
// Add import at top
import { canCreateCollection } from '@/lib/usage';

export async function createCollection(input: CreateCollectionInput): Promise<ActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  // Check usage limits
  const allowed = await canCreateCollection(session.user.id, session.user.isPro);
  if (!allowed) {
    return { success: false, error: 'You have reached the free tier limit of 3 collections. Upgrade to Pro for unlimited collections.' };
  }

  // ... rest of existing createCollection logic
}
```

### Modify `src/app/api/upload/route.ts`

Add Pro check before allowing file/image uploads.

```typescript
// After the auth check, add:
if (!session.user.isPro) {
  return NextResponse.json(
    { error: 'File uploads require a Pro subscription' },
    { status: 403 }
  );
}
```

> **Note:** The upload route currently uses `session.user.id` only. After Phase 2, `session.user.isPro` will be available. However, the upload route uses `auth()` directly (not from the JWT client side), so `isPro` will need to be fetched from the database here since the upload API route may not have the JWT-enhanced session. An alternative is to query `isPro` directly:

```typescript
const user = await prisma.user.findUnique({
  where: { id: session.user.id },
  select: { isPro: true },
});

if (!user?.isPro) {
  return NextResponse.json(
    { error: 'File uploads require a Pro subscription' },
    { status: 403 }
  );
}
```

---

## Phase 7: UI Components

### Create `src/components/settings/billing-settings.tsx`

A client component for the settings page showing current plan and upgrade/manage options.

```typescript
'use client';

import { useState } from 'react';
import { CreditCard, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface BillingSettingsProps {
  isPro: boolean;
  itemCount: number;
  collectionCount: number;
}

export default function BillingSettings({ isPro, itemCount, collectionCount }: BillingSettingsProps) {
  const [loading, setLoading] = useState<'monthly' | 'yearly' | 'portal' | null>(null);

  async function handleUpgrade(plan: 'monthly' | 'yearly') {
    setLoading(plan);
    try {
      const priceId = plan === 'monthly'
        ? process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY
        : process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY;

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Failed to start checkout');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(null);
    }
  }

  async function handleManageBilling() {
    setLoading('portal');
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Failed to open billing portal');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CreditCard className="size-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Billing</h2>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        {/* Current Plan */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Current Plan</span>
              <Badge variant={isPro ? 'default' : 'secondary'}>
                {isPro ? 'Pro' : 'Free'}
              </Badge>
            </div>
            {!isPro && (
              <p className="text-sm text-muted-foreground mt-1">
                {itemCount}/50 items &middot; {collectionCount}/3 collections
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        {isPro ? (
          <Button
            variant="outline"
            onClick={handleManageBilling}
            disabled={loading === 'portal'}
          >
            {loading === 'portal' ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <ExternalLink className="size-4 mr-2" />
            )}
            Manage Billing
          </Button>
        ) : (
          <div className="flex gap-3">
            <Button
              onClick={() => handleUpgrade('monthly')}
              disabled={loading !== null}
            >
              {loading === 'monthly' && <Loader2 className="size-4 animate-spin mr-2" />}
              Upgrade $8/mo
            </Button>
            <Button
              variant="outline"
              onClick={() => handleUpgrade('yearly')}
              disabled={loading !== null}
            >
              {loading === 'yearly' && <Loader2 className="size-4 animate-spin mr-2" />}
              Upgrade $72/yr (save 25%)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
```

### Modify `src/app/settings/page.tsx`

Add BillingSettings between EditorSettings and AccountSettings.

```typescript
// Add imports
import BillingSettings from '@/components/settings/billing-settings';
import { getUserUsage } from '@/lib/usage';

// In the component, after fetching user data:
const usage = await getUserUsage(user.id, session.user.isPro ?? false);

// In the JSX, between EditorSettings and AccountSettings:
<BillingSettings
  isPro={session.user.isPro ?? false}
  itemCount={usage.itemCount}
  collectionCount={usage.collectionCount}
/>
```

### Add `NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY` and `NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY`

The checkout button on the client needs the price IDs. Either:
- **Option A:** Make price IDs public env vars (prefix with `NEXT_PUBLIC_`) - simpler
- **Option B:** Keep them server-side only and pass through the checkout API - more secure

**Recommended: Option B** - Keep price IDs server-side. The client sends `plan: 'monthly' | 'yearly'` and the API route maps to the correct price ID:

```typescript
// In the checkout API route:
const priceId = plan === 'monthly'
  ? process.env.STRIPE_PRICE_ID_MONTHLY
  : process.env.STRIPE_PRICE_ID_YEARLY;
```

Update BillingSettings to send `plan` instead of `priceId`:
```typescript
const res = await fetch('/api/stripe/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ plan }), // 'monthly' or 'yearly'
});
```

### Modify `src/components/homepage/PricingSection.tsx`

Update the Pro "Start Free Trial" button to link to `/register` for unauthenticated users (current behavior) or `/settings` for authenticated users. This can be handled with a simple check or by keeping the current flow where users register first and upgrade from settings.

### Show `?upgraded=true` Toast

After successful checkout, users redirect to `/settings?upgraded=true`. Add a toast notification:

```typescript
// In settings page or BillingSettings:
import { useSearchParams } from 'next/navigation';

const searchParams = useSearchParams();
useEffect(() => {
  if (searchParams.get('upgraded') === 'true') {
    toast.success('Welcome to DevStash Pro!');
    // Clean up URL
    window.history.replaceState({}, '', '/settings');
  }
}, [searchParams]);
```

---

## Files Summary

### New Files to Create

| File | Purpose |
|------|---------|
| `src/lib/stripe.ts` | Stripe SDK initialization |
| `src/lib/usage.ts` | Free tier usage limit checks |
| `src/app/api/stripe/checkout/route.ts` | Create Stripe Checkout sessions |
| `src/app/api/stripe/portal/route.ts` | Create Stripe Customer Portal sessions |
| `src/app/api/webhooks/stripe/route.ts` | Handle Stripe webhook events |
| `src/components/settings/billing-settings.tsx` | Billing UI on settings page |

### Existing Files to Modify

| File | Changes |
|------|---------|
| `src/auth.ts` | Make JWT callback async, add `isPro` sync from DB |
| `src/types/next-auth.d.ts` | Add `isPro` to Session and JWT types |
| `src/actions/items.ts` | Add usage limit + Pro type check in `createItem` |
| `src/actions/collections.ts` | Add usage limit check in `createCollection` |
| `src/app/api/upload/route.ts` | Add Pro check for file/image uploads |
| `src/app/settings/page.tsx` | Add BillingSettings component + usage data |
| `env.example` | Already has Stripe vars (no change needed) |

### NPM Package to Install

```bash
npm install stripe
```

---

## Testing Checklist

### Stripe CLI Testing

Use the [Stripe CLI](https://stripe.com/docs/stripe-cli) for local webhook testing:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local dev
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Copy the webhook signing secret and set as STRIPE_WEBHOOK_SECRET
```

### Manual Testing

- [ ] **Checkout Flow**
  - [ ] Click "Upgrade $8/mo" from settings - redirects to Stripe Checkout
  - [ ] Click "Upgrade $72/yr" from settings - redirects to Stripe Checkout
  - [ ] Complete payment with test card `4242 4242 4242 4242`
  - [ ] Redirected back to `/settings?upgraded=true`
  - [ ] "Welcome to DevStash Pro!" toast appears
  - [ ] Plan shows as "Pro" on settings page
  - [ ] `session.user.isPro` is `true` after page reload

- [ ] **Webhook Processing**
  - [ ] `checkout.session.completed` sets `isPro=true`, stores `stripeCustomerId` and `stripeSubscriptionId`
  - [ ] `invoice.paid` keeps `isPro=true`
  - [ ] `invoice.payment_failed` logs warning (does not downgrade)
  - [ ] `customer.subscription.deleted` sets `isPro=false`, clears `stripeSubscriptionId`
  - [ ] `customer.subscription.updated` with `status=active` keeps `isPro=true`
  - [ ] `customer.subscription.updated` with `status=canceled` sets `isPro=false`

- [ ] **Customer Portal**
  - [ ] Pro user can click "Manage Billing" - redirects to Stripe portal
  - [ ] Can view invoices
  - [ ] Can cancel subscription
  - [ ] Can switch between monthly/yearly
  - [ ] Returns to `/settings` after portal

- [ ] **Feature Gating**
  - [ ] Free user can create up to 50 items
  - [ ] Free user sees error at 50 items: "You have reached the free tier limit..."
  - [ ] Free user can create up to 3 collections
  - [ ] Free user sees error at 3 collections
  - [ ] Free user cannot create File or Image items
  - [ ] Free user cannot upload files (403 from upload route)
  - [ ] Pro user has no limits on items or collections
  - [ ] Pro user can create File and Image items
  - [ ] Pro user can upload files

- [ ] **Session Sync**
  - [ ] After Stripe webhook updates `isPro`, a page reload reflects the change
  - [ ] No stale `isPro=false` after successful checkout

- [ ] **Edge Cases**
  - [ ] User who was Pro and cancels: `isPro` set to `false` after `subscription.deleted`
  - [ ] Webhook signature verification fails: returns 400, no DB changes
  - [ ] Duplicate webhook events: idempotent (updateMany is safe)
  - [ ] User without Stripe customer: checkout creates new customer

### Unit Tests to Write

| Test | File |
|------|------|
| `getUserUsage` returns correct counts and limits | `src/lib/usage.test.ts` |
| `canCreateItem` returns false at limit | `src/lib/usage.test.ts` |
| `canCreateCollection` returns false at limit | `src/lib/usage.test.ts` |
| Pro users bypass all limits | `src/lib/usage.test.ts` |
| `createItem` rejects file type for free users | `src/actions/items.test.ts` |
| `createItem` rejects at item limit | `src/actions/items.test.ts` |
| `createCollection` rejects at collection limit | `src/actions/collections.test.ts` |

### Stripe Test Cards

| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 0002` | Card declined |
| `4000 0000 0000 3220` | 3D Secure required |

---

_Generated: February 2026_
