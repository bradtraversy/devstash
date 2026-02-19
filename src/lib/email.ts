import { resend } from './resend'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const FROM_EMAIL = 'DevStash <noreply@devstash.io>'

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${APP_URL}/verify-email?token=${token}`

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Verify your DevStash account',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #fafafa; padding: 40px 20px; margin: 0;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #171717; border-radius: 8px; padding: 32px; border: 1px solid #262626;">
            <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 16px 0; color: #fafafa;">
              Welcome to DevStash
            </h1>
            <p style="font-size: 16px; line-height: 1.5; color: #a1a1aa; margin: 0 0 24px 0;">
              Thanks for signing up! Please verify your email address by clicking the button below.
            </p>
            <a href="${verificationUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; font-size: 14px; font-weight: 500; text-decoration: none; padding: 12px 24px; border-radius: 6px;">
              Verify Email Address
            </a>
            <p style="font-size: 14px; line-height: 1.5; color: #71717a; margin: 24px 0 0 0;">
              This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #262626; margin: 24px 0;">
            <p style="font-size: 12px; color: #52525b; margin: 0;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${verificationUrl}" style="color: #3b82f6; word-break: break-all;">${verificationUrl}</a>
            </p>
          </div>
        </body>
      </html>
    `,
    text: `Welcome to DevStash!\n\nThanks for signing up! Please verify your email address by clicking the link below:\n\n${verificationUrl}\n\nThis link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.`,
  })

  if (error) {
    console.error('Failed to send verification email:', error)
    throw new Error('Failed to send verification email')
  }

  return data
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Reset your DevStash password',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #fafafa; padding: 40px 20px; margin: 0;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #171717; border-radius: 8px; padding: 32px; border: 1px solid #262626;">
            <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 16px 0; color: #fafafa;">
              Reset Your Password
            </h1>
            <p style="font-size: 16px; line-height: 1.5; color: #a1a1aa; margin: 0 0 24px 0;">
              We received a request to reset your password. Click the button below to choose a new password.
            </p>
            <a href="${resetUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; font-size: 14px; font-weight: 500; text-decoration: none; padding: 12px 24px; border-radius: 6px;">
              Reset Password
            </a>
            <p style="font-size: 14px; line-height: 1.5; color: #71717a; margin: 24px 0 0 0;">
              This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #262626; margin: 24px 0;">
            <p style="font-size: 12px; color: #52525b; margin: 0;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #3b82f6; word-break: break-all;">${resetUrl}</a>
            </p>
          </div>
        </body>
      </html>
    `,
    text: `Reset Your Password\n\nWe received a request to reset your password. Click the link below to choose a new password:\n\n${resetUrl}\n\nThis link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.`,
  })

  if (error) {
    console.error('Failed to send password reset email:', error)
    throw new Error('Failed to send password reset email')
  }

  return data
}
