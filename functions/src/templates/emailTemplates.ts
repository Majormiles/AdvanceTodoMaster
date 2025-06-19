export const generate2FAEmailTemplate = (code: string, expiresAt: string): string => {
  const expiryTime = new Date(expiresAt);
  const now = new Date();
  const minutesLeft = Math.floor((expiryTime.getTime() - now.getTime()) / (1000 * 60));

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Two-Factor Authentication Code</title>
      <style>
        body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; }
        .header p { color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px; }
        .content { padding: 40px 30px; }
        .security-notice { background-color: #fef5e7; border: 1px solid #fbbf24; border-radius: 8px; padding: 20px; margin-bottom: 30px; }
        .security-notice h3 { color: #92400e; margin: 0 0 10px 0; font-size: 18px; }
        .security-notice p { color: #78350f; margin: 0; font-size: 14px; line-height: 1.5; }
        .verification-code { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px solid #0ea5e9; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
        .verification-code h2 { color: #0c4a6e; margin: 0 0 15px 0; font-size: 20px; }
        .code { font-size: 48px; font-weight: bold; color: #0369a1; letter-spacing: 8px; margin: 20px 0; font-family: 'Courier New', monospace; text-shadow: 0 2px 4px rgba(3, 105, 161, 0.2); }
        .expiry { color: #0c4a6e; font-size: 14px; margin: 15px 0 0 0; }
        .instructions { background-color: #f1f5f9; border-radius: 8px; padding: 25px; margin: 25px 0; }
        .instructions h3 { color: #334155; margin: 0 0 15px 0; font-size: 18px; }
        .instructions ol { color: #475569; margin: 0; padding-left: 20px; line-height: 1.8; }
        .instructions li { margin-bottom: 8px; }
        .warning { background-color: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 20px; margin: 25px 0; }
        .warning h3 { color: #dc2626; margin: 0 0 10px 0; font-size: 16px; }
        .warning p { color: #991b1b; margin: 0; font-size: 14px; line-height: 1.5; }
        .footer { background-color: #1e293b; color: #cbd5e1; padding: 30px; text-align: center; }
        .footer p { margin: 0 0 10px 0; font-size: 14px; }
        .footer .company { font-weight: 600; color: #ffffff; }
        .footer .support { color: #94a3b8; font-size: 12px; }
        .divider { height: 1px; background: linear-gradient(to right, transparent, #e2e8f0, transparent); margin: 25px 0; }
        .btn { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .btn:hover { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); }
        @media (max-width: 600px) {
          .container { margin: 0; }
          .content { padding: 25px 20px; }
          .code { font-size: 36px; letter-spacing: 4px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <h1>🔐 Advanced Todo List</h1>
          <p>Two-Factor Authentication</p>
        </div>

        <!-- Main Content -->
        <div class="content">
          <!-- Security Notice -->
          <div class="security-notice">
            <h3>🛡️ Security Alert</h3>
            <p>A sign-in attempt was made to your Advanced Todo List account. If this was you, use the verification code below to complete your login.</p>
          </div>

          <!-- Verification Code Section -->
          <div class="verification-code">
            <h2>Your Verification Code</h2>
            <div class="code">${code}</div>
            <p class="expiry">⏰ This code expires in ${minutesLeft} minutes (at ${expiryTime.toLocaleTimeString()})</p>
          </div>

          <!-- Instructions -->
          <div class="instructions">
            <h3>📋 How to Use This Code</h3>
            <ol>
              <li>Return to the Advanced Todo List login page</li>
              <li>Enter this 6-digit verification code when prompted</li>
              <li>Complete your login to access your account</li>
            </ol>
          </div>

          <div class="divider"></div>

          <!-- Security Warning -->
          <div class="warning">
            <h3>⚠️ Important Security Information</h3>
            <p><strong>If you didn't request this code:</strong><br>
            • Do not share this code with anyone<br>
            • Someone may be trying to access your account<br>
            • Consider changing your password immediately<br>
            • Contact our support team if you're concerned</p>
          </div>

          <!-- Additional Info -->
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
            <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 16px;">🔒 Account Security Tips</h3>
            <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 1.6;">
              • Never share your verification codes with anyone<br>
              • Our support team will never ask for your verification codes<br>
              • Keep your email account secure with a strong password<br>
              • Enable two-factor authentication on your email account too
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p class="company">Advanced Todo List</p>
          <p>Secure task management for modern teams</p>
          <div class="divider" style="background: linear-gradient(to right, transparent, #475569, transparent); margin: 20px 0;"></div>
          <p class="support">
            Need help? Contact our support team<br>
            This is an automated security message - please do not reply to this email
          </p>
          <p style="font-size: 11px; color: #64748b; margin-top: 15px;">
            This email was sent because someone attempted to sign in to your account.<br>
            If you have any concerns about this activity, please contact support immediately.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Alternative plain text template for email clients that don't support HTML
export const generate2FATextTemplate = (code: string, expiresAt: string): string => {
  const expiryTime = new Date(expiresAt);
  const now = new Date();
  const minutesLeft = Math.floor((expiryTime.getTime() - now.getTime()) / (1000 * 60));

  return `
ADVANCED TODO LIST - TWO-FACTOR AUTHENTICATION

Your Verification Code: ${code}

This code expires in ${minutesLeft} minutes (at ${expiryTime.toLocaleTimeString()}).

INSTRUCTIONS:
1. Return to the Advanced Todo List login page
2. Enter this 6-digit verification code when prompted  
3. Complete your login to access your account

SECURITY NOTICE:
If you didn't request this code, do not share it with anyone. Someone may be trying to access your account. Consider changing your password and contact our support team.

IMPORTANT:
- Never share verification codes with anyone
- Our support team will never ask for verification codes
- Keep your email account secure
- This is an automated message - do not reply

Advanced Todo List Security Team
  `;
}; 