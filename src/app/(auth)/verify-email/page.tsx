import { Suspense } from 'react'
import { VerifyEmailContent } from '@/components/auth/verify-email-content'

export const metadata = {
  title: 'Verify Email - DevStash',
  description: 'Verify your DevStash email address',
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  )
}
