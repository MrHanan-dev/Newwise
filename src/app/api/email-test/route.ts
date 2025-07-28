import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    console.log('🧪 Starting email test...');
    
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.example.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER || 'user@example.com',
        pass: process.env.EMAIL_PASSWORD || 'password',
      },
      socketTimeout: 10000,
      connectionTimeout: 10000,
      greetingTimeout: 5000
    });

    console.log('📧 Test email configuration:');
    console.log('- Host:', process.env.EMAIL_HOST);
    console.log('- Port:', process.env.EMAIL_PORT);
    console.log('- User:', process.env.EMAIL_USER ? '***SET***' : 'NOT SET');
    console.log('- From:', process.env.EMAIL_FROM);
    console.log('- To:', process.env.EMAIL_RECIPIENT);

    // Send test email
    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'ShiftWise <test@example.com>',
      to: process.env.EMAIL_RECIPIENT || 'test@example.com',
      subject: 'ShiftWise Email Test',
      text: 'This is a test email from ShiftWise to verify email configuration.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">ShiftWise Email Test</h2>
          <p>This is a test email to verify that your email configuration is working correctly on Vercel.</p>
          <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          <p style="color: #6b7280; font-size: 12px;">If you receive this email, your email configuration is working!</p>
        </div>
      `
    });

    console.log('✅ Test email sent successfully!');
    console.log('📧 Message ID:', result.messageId);

    return NextResponse.json({ 
      success: true, 
      message: 'Test email sent successfully',
      messageId: result.messageId 
    });

  } catch (error: any) {
    console.error('❌ Test email failed:', error);
    console.error('🔍 Error details:', {
      message: error?.message,
      code: error?.code,
      command: error?.command,
      responseCode: error?.responseCode,
      response: error?.response
    });

    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Unknown error',
      details: {
        code: error?.code,
        command: error?.command,
        responseCode: error?.responseCode,
        response: error?.response
      }
    }, { status: 500 });
  }
} 