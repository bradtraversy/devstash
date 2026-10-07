import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { generateVerificationToken } from '@/lib/tokens';
import { sendVerificationEmail } from '@/lib/email';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { skipsEmailVerification } from '@/lib/auth/email-verification';

export async function POST(request: Request) {
  try {
    // Check rate limit (3 attempts per hour by IP)
    const rateLimit = await checkRateLimit('register');
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.retryAfter);
    }

    const body = await request.json();
    const { name, email, password, confirmPassword } = body;

    // Validate required fields
    if (!email || !password || !confirmPassword) {
      return NextResponse.json(
        { error: 'Email, password, and confirm password are required' },
        { status: 400 },
      );
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 },
      );
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 },
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 },
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    const skipVerification = skipsEmailVerification();

    // Create user (emailVerified is set if skipping verification)
    const user = await prisma.user.create({
      data: {
        name: name || null,
        email,
        password: hashedPassword,
        emailVerified: skipVerification ? new Date() : null,
      },
    });

    // Generate verification token and send email (unless skipped)
    if (!skipVerification) {
      const token = await generateVerificationToken(email);
      await sendVerificationEmail(email, token);
    }

    return NextResponse.json(
      {
        success: true,
        message: skipVerification
          ? 'Account created successfully'
          : 'Please check your email to verify your account',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 },
    );
  }
}
