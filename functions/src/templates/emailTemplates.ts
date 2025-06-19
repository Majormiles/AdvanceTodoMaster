export const generate2FAEmailTemplate = (code: string, expiresAt: string): string => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2B6CB0;">Your Verification Code</h2>
      <p>Here is your two-factor authentication code:</p>
      <div style="background-color: #EDF2F7; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
        <h1 style="color: #2D3748; font-size: 32px; letter-spacing: 4px; margin: 0;">${code}</h1>
      </div>
      <p>This code will expire in 10 minutes (at ${new Date(expiresAt).toLocaleTimeString()}).</p>
      <p style="color: #718096; font-size: 14px;">
        If you didn't request this code, please ignore this email and consider changing your password.
      </p>
      <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 20px 0;" />
      <p style="color: #718096; font-size: 12px;">
        This is an automated message, please do not reply.
      </p>
    </div>
  `;
}; 