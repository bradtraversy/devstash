import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'

// A subscription that already ended, or that Stripe no longer knows, must not block deletion.
async function cancelIfActive(subscriptionId: string): Promise<void> {
  const stripe = getStripe()
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    if (subscription.status !== 'canceled') {
      await stripe.subscriptions.cancel(subscriptionId)
    }
  } catch (error) {
    if (error instanceof Stripe.errors.StripeInvalidRequestError && error.code === 'resource_missing') {
      return
    }
    throw error
  }
}

export async function DELETE() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Cancel billing first so a deleted account cannot keep renewing with no portal to stop it.
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeSubscriptionId: true },
    })

    if (user?.stripeSubscriptionId) {
      try {
        await cancelIfActive(user.stripeSubscriptionId)
      } catch (error) {
        console.error('Subscription cancel failed during account deletion:', error)
        return NextResponse.json(
          { error: 'We could not cancel your subscription. Please try again or contact support.' },
          { status: 502 }
        )
      }
    }

    // Delete the user - cascade will handle related data
    await prisma.user.delete({
      where: { id: session.user.id },
    })

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    })
  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json(
      { error: 'An error occurred while deleting your account' },
      { status: 500 }
    )
  }
}
