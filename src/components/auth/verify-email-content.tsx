'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import AuthCard from '@/components/auth/auth-card'

type VerificationStatus = 'loading' | 'success' | 'error' | 'no-token'

export function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<VerificationStatus>(
    token ? 'loading' : 'no-token'
  )
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) return

    async function verifyEmail() {
      try {
        const response = await fetch(`/api/auth/verify?token=${token}`)
        const data = await response.json()

        if (response.ok) {
          setStatus('success')
          setMessage(data.message)
        } else {
          setStatus('error')
          setMessage(data.error || 'Verification failed')
        }
      } catch {
        setStatus('error')
        setMessage('An unexpected error occurred')
      }
    }

    verifyEmail()
  }, [token])

  return (
    <AuthCard>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4">
          {status === 'loading' && (
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
          )}
          {status === 'success' && (
            <CheckCircle className="h-12 w-12 text-green-500" />
          )}
          {status === 'error' && (
            <XCircle className="h-12 w-12 text-destructive" />
          )}
          {status === 'no-token' && (
            <Mail className="h-12 w-12 text-muted-foreground" />
          )}
        </div>
        <CardTitle className="text-2xl">
          {status === 'loading' && 'Verifying your email...'}
          {status === 'success' && 'Email Verified!'}
          {status === 'error' && 'Verification Failed'}
          {status === 'no-token' && 'Check your email'}
        </CardTitle>
        <CardDescription>
          {status === 'loading' && 'Please wait while we verify your email address.'}
          {status === 'success' && message}
          {status === 'error' && message}
          {status === 'no-token' &&
            "We've sent you a verification link. Please check your inbox."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === 'error' && message.includes('expired') && (
          <p className="text-center text-sm text-muted-foreground">
            Your verification link has expired. Please request a new one.
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        {status === 'success' && (
          <Button asChild variant="brand" className="w-full">
            <Link href="/sign-in">Sign in to your account</Link>
          </Button>
        )}
        {status === 'error' && (
          <Button asChild variant="outline" className="w-full">
            <Link href="/register">Try registering again</Link>
          </Button>
        )}
        {status === 'no-token' && (
          <Button asChild variant="outline" className="w-full">
            <Link href="/sign-in">Back to sign in</Link>
          </Button>
        )}
      </CardFooter>
    </AuthCard>
  )
}
