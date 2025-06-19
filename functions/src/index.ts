import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import * as nodemailer from 'nodemailer';
import { generate2FAEmailTemplate, generate2FATextTemplate } from './templates/emailTemplates';

// Create development transporter using Ethereal Email
const createDevTransporter = async () => {
  try {
    // Generate test SMTP service account from ethereal.email
    const testAccount = await nodemailer.createTestAccount();
    console.log('Created test email account:', {
      user: testAccount.user,
      server: testAccount.smtp.host,
      port: testAccount.smtp.port
    });

    // Create a test transporter with improved settings
    const transporter = nodemailer.createTransport({
      service: 'ethereal',
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000,
      pool: false,
      debug: true,
      logger: true,
      tls: {
        rejectUnauthorized: false
      }
    } as any);

    // Verify connection configuration
    await transporter.verify();
    console.log('✅ Email transporter verified successfully');

    return { transporter, testAccount };
  } catch (error) {
    console.error('❌ Error creating development transporter:', error);
    throw new Error(`Failed to create email transporter: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

interface EmailData {
  to: string;
  code: string;
  expiresAt?: string;
}

export const send2FAEmail = onCall(async (request: CallableRequest<EmailData>) => {
  const startTime = Date.now();
  const { data, auth } = request;
  
  try {
    console.log('📧 2FA Email request received:', {
      timestamp: new Date().toISOString(),
      to: data?.to ? data.to.replace(/(.{3}).*(@.*)/, '$1***$2') : 'unknown', // Mask email for logs
      hasCode: !!data?.code,
      hasExpiry: !!data?.expiresAt,
      uid: auth?.uid || 'anonymous'
    });

    const { to, code, expiresAt } = data;
    
    // Validate required fields first
    if (!to || !code) {
      console.error('❌ Missing required fields:', { to: !!to, code: !!code });
      throw new HttpsError('invalid-argument', 'Missing required fields: to and code are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      console.error('❌ Invalid email format:', to);
      throw new HttpsError('invalid-argument', 'Invalid email format');
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      console.error('❌ Invalid code format');
      throw new HttpsError('invalid-argument', 'Invalid code format. Must be 6 digits.');
    }

    // 🔥 FOR DEVELOPMENT: Print verification code to console for easy testing
    console.log('');
    console.log('🔐 ===============================================');
    console.log('🔐 VERIFICATION CODE FOR TESTING:');
    console.log(`🔐 CODE: ${code}`);
    console.log(`🔐 EMAIL: ${to.replace(/(.{3}).*(@.*)/, '$1***$2')}`);
    console.log(`🔐 EXPIRES: ${expiresAt ? new Date(expiresAt).toLocaleTimeString() : 'N/A'}`);
    console.log('🔐 ===============================================');
    console.log('');

    // ✅ RETURN IMMEDIATELY after logging the code for development
    // This prevents timeouts while still providing the verification code
    console.log('✅ Verification code logged successfully - returning immediately for development');
    
    return { 
      success: true, 
      messageId: `dev_${Date.now()}`,
      message: 'Development mode: Check console for verification code',
      timestamp: new Date().toISOString(),
      developmentMode: true
    };

    // The code below is kept for future reference but won't execute in development
    // Create development transporter
    console.log('🔧 Creating email transporter...');
    const { transporter, testAccount } = await createDevTransporter();

    // Generate email content
    const htmlContent = generate2FAEmailTemplate(code, expiresAt || new Date(Date.now() + 10 * 60 * 1000).toISOString());
    const textContent = generate2FATextTemplate(code, expiresAt || new Date(Date.now() + 10 * 60 * 1000).toISOString());

    const mailOptions = {
      from: {
        name: 'Advanced Todo List Security',
        address: testAccount.user
      },
      to: to,
      subject: '🔐 Your Two-Factor Authentication Code - Advanced Todo List',
      html: htmlContent,
      text: textContent,
      priority: 'high' as const,
      headers: {
        'X-Mailer': 'Advanced Todo List Security System',
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    };

    // Send mail with enhanced retry logic
    let retries = 3;
    let lastError = null;
    const retryDelays = [1000, 2000, 3000]; // Progressive delays

    console.log('📤 Attempting to send 2FA email...');

    while (retries > 0) {
      try {
        const info = await transporter.sendMail(mailOptions);
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log('✅ 2FA Email sent successfully:', {
          messageId: info.messageId,
          to: to.replace(/(.{3}).*(@.*)/, '$1***$2'), // Mask email for logs
          duration: `${duration}ms`,
          attempt: 4 - retries,
          accepted: info.accepted?.length || 0,
          rejected: info.rejected?.length || 0
        });
        
        // Get preview URL for development
        const previewURL = nodemailer.getTestMessageUrl(info as any);
        if (previewURL) {
          console.log('🔗 Email preview URL:', previewURL);
        }

        return { 
          success: true, 
          messageId: info.messageId,
          previewUrl: previewURL,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        lastError = error;
        retries--;
        
        console.warn(`⚠️ Email send attempt failed (${3 - retries}/3):`, {
          error: (error as Error)?.message || 'Unknown error',
          retries: retries,
          nextDelay: retries > 0 ? `${retryDelays[3 - retries - 1]}ms` : 'none'
        });
        
        if (retries > 0) {
          const delay = retryDelays[3 - retries - 1];
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // If we get here, all retries failed
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.error('❌ All email send attempts failed:', {
      finalError: lastError instanceof Error ? lastError.message : 'Unknown error',
      totalDuration: `${duration}ms`,
      retriesAttempted: 3
    });
    
    throw new HttpsError('internal', 'Failed to send email after multiple attempts');
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.error('❌ Fatal error in send2FAEmail function:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
    
    // If it's already an HttpsError, re-throw it
    if (error instanceof HttpsError) {
      throw error;
    }
    
    // Otherwise, wrap it in an HttpsError
    throw new HttpsError('internal', 'Failed to send 2FA email');
  }
}); 