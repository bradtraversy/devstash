# Stripe Integration Research

## Output

`docs/stripe-integration-plan.md`

## Research

Analyze the codebase to create a comprehensive Stripe subscription integration plan for DevStash Pro ($8/mo monthly, $72/year annual).

## Include

### Current State Analysis

- User model schema (especially isPro, stripeCustomerId, stripeSubscriptionId fields)
- NextAuth configuration and session handling
- How user data is accessed in server actions and components
- Any existing subscription or payment-related code

### Feature Gating Analysis

- Free tier limits from project spec (50 items, 3 collections)
- Where item/collection counts are checked or could be checked
- Pro-only features (file uploads, AI, custom types, export)
- Settings page structure

### API & Webhook Patterns

- How API routes are structured
- Server action error handling patterns
- Environment variable patterns

## Deliverable

A complete implementation plan with:

1. Files to create (with code examples)
2. Files to modify (with specific changes)
3. Stripe Dashboard setup steps
4. Testing checklist
5. Implementation order

## Notes

The NextAuth v5 documentation suggests using `trigger === "update"` in the JWT callback to refresh session data when calling `update()` from `useSession()`. However, this approach doesn't reliably work for our use case where a Stripe webhook updates `isPro` in the database and we want the client session to pick up the change.

**The workaround:** Instead of relying on `trigger === "update"`, modify the JWT callback to always sync `isPro` from the database on every session validation:

```typescript
async jwt({ token, user }) {
  if (user) {
    token.sub = user.id;
  }

  // Always sync isPro from database to catch webhook updates
  if (token.sub) {
    const dbUser = await prisma.user.findUnique({
      where: { id: token.sub },
      select: { isPro: true },
    });
    token.isPro = dbUser?.isPro ?? false;
  }

  return token;
},
```

This adds one small DB query per session validation but guarantees the session stays in sync after webhook updates. A simple page reload after checkout is then sufficient to pick up the new Pro status.
