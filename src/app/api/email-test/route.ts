import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check environment variables
    const envVars = {
      EMAIL_HOST: process.env.EMAIL_HOST,
      EMAIL_PORT: process.env.EMAIL_PORT,
      EMAIL_USER: process.env.EMAIL_USER,
      EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ? '***SET***' : 'NOT SET',
      EMAIL_FROM: process.env.EMAIL_FROM,
      EMAIL_RECIPIENT: process.env.EMAIL_RECIPIENT,
      EMAIL_SECURE: process.env.EMAIL_SECURE
    };

    const missingVars = Object.entries(envVars)
      .filter(([key, value]) => !value || value === 'NOT SET')
      .map(([key]) => key);

    return NextResponse.json({
      success: missingVars.length === 0,
      environment: envVars,
      missing: missingVars,
      message: missingVars.length === 0 
        ? 'All email environment variables are set correctly'
        : `Missing environment variables: ${missingVars.join(', ')}`
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 