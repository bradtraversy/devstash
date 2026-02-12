import { Suspense } from 'react'
import { VerifyEmailContent } from '@/components/auth/verify-email-content'

export const metadata = {
  title: 'Verify Email - DevStash',
  description: 'Verify your DevStash email address',
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background p-4">
      <Suspense fallback={<div>Loading...</div>}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  )
}
