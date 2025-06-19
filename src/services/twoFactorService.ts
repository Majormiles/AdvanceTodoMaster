import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import { generateRandomString } from '../utils/helpers';

// Interface for 2FA settings
interface TwoFactorSettings {
  twofa_enabled: boolean;
  twofa_type?: 'email' | 'totp' | null;
  twofa_secret?: string | null;
  twofa_backup_codes: string[];
  twofa_backup_email?: string | null;
  twofa_last_used: string | null;
  twofa_temp_code?: string | null;
  twofa_temp_code_expires?: Date | null;
  twofa_email_code_attempts?: number;
  twofa_email_sent_at?: Date | null;
}

// Firebase Functions base URL - use emulator in development, production URL in production
const FUNCTIONS_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://us-central1-advancetodomaster.cloudfunctions.net'
  : '/api';

// Get user's 2FA settings
export const get2FASettings = async (userId: string): Promise<TwoFactorSettings> => {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) {
    return {
      twofa_enabled: false,
      twofa_backup_codes: [],
      twofa_last_used: null,
    };
  }
  
  return {
    twofa_enabled: userDoc.data().twofa_enabled || false,
    twofa_backup_codes: userDoc.data().twofa_backup_codes || [],
    twofa_last_used: userDoc.data().twofa_last_used,
  };
};

// Generate a new secret key for 2FA
export const generateSecret = () => {
  return OTPAuth.Secret.generate();
};

// Generate QR code for 2FA setup
export const generateQRCode = async (secret: string, email: string): Promise<string> => {
  const totp = new OTPAuth.TOTP({
    issuer: 'Advanced Todo List',
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });

  const otpauth = totp.toString();
  return await QRCode.toDataURL(otpauth);
};

// Generate backup codes
export const generateBackupCodes = (count: number): string[] => {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(generateRandomString(10));
  }
  return codes;
};

// Verify 2FA token
export const verify2FAToken = (token: string, secret: string): boolean => {
  const totp = new OTPAuth.TOTP({
    issuer: 'Advanced Todo List',
    label: 'user',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });

  return totp.validate({ token, window: 1 }) !== null;
};

// Verify backup code
export const verifyBackupCode = async (userId: string, code: string): Promise<boolean> => {
  try {
    const settings = await get2FASettings(userId);
    const index = settings.twofa_backup_codes.indexOf(code);
    
    if (index === -1) {
      return false;
    }
    
    // Remove used backup code
    settings.twofa_backup_codes.splice(index, 1);
    await update2FASettings(userId, {
      twofa_backup_codes: settings.twofa_backup_codes
    });
    
    return true;
  } catch (error) {
    console.error('Error verifying backup code:', error);
    return false;
  }
};

// Update 2FA settings
export const update2FASettings = async (userId: string, settings: Partial<TwoFactorSettings>): Promise<void> => {
  try {
    const settingsRef = doc(db, 'users', userId, 'settings', '2fa');
    await updateDoc(settingsRef, {
      ...settings,
      ...(settings.twofa_enabled !== undefined && { twofa_last_used: new Date().toISOString() })
    });
  } catch (error) {
    console.error('Error updating 2FA settings:', error);
    throw error;
  }
};

// Complete 2FA setup
export const complete2FASetup = async (
  userId: string,
  secret: string,
  backupCodes: string[]
): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  
  await setDoc(userRef, {
    twofa_enabled: true,
    twofa_secret: secret,
    twofa_backup_codes: backupCodes,
    twofa_type: 'totp',
    twofa_last_used: null,
  }, { merge: true });
};

// Disable 2FA
export const disable2FA = async (userId: string): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  
  await updateDoc(userRef, {
    twofa_enabled: false,
    twofa_secret: null,
    twofa_backup_codes: [],
    twofa_type: null,
    twofa_backup_email: null,
    twofa_last_used: null,
  });
};

// Generate a secure 6-digit code for email-based 2FA
export const generateEmailCode = (): string => {
  const array = new Uint8Array(4);
  window.crypto.getRandomValues(array);
  const code = Array.from(array)
    .reduce((acc, val) => (acc * val) % 1000000, 0)
    .toString()
    .padStart(6, '0');
  return code;
};

// Send 2FA code via email
export const sendEmailCode = async (userId: string, email: string): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  
  // Check rate limiting
  if (userDoc.exists()) {
    const data = userDoc.data();
    const lastSentAt = data.twofa_email_sent_at?.toDate();
    if (lastSentAt && Date.now() - lastSentAt.getTime() < 60000) { // 1 minute cooldown
      throw new Error('Please wait before requesting another code');
    }
  }
  
  const code = generateEmailCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
  
  try {
    // Save the code to Firestore first
    await setDoc(userRef, {
      twofa_temp_code: code,
      twofa_temp_code_expires: expiresAt,
      twofa_email_code_attempts: 0,
      twofa_email_sent_at: new Date(),
    }, { merge: true });
    
    // Send the code via Firebase Function
    const response = await fetch(`${FUNCTIONS_BASE_URL}/send2FAEmail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        code,
        expiresAt: expiresAt.toISOString(),
      }),
    });
    
    if (!response.ok) {
      // If the API call fails, clean up the saved code
      await updateDoc(userRef, {
        twofa_temp_code: null,
        twofa_temp_code_expires: null,
        twofa_email_code_attempts: 0,
        twofa_email_sent_at: null,
      });
      
      const errorText = await response.text();
      throw new Error(`Failed to send verification code: ${errorText}`);
    }
  } catch (error: any) {
    console.error('Error in sendEmailCode:', error);
    throw new Error(error.message || 'Failed to send verification code');
  }
};

// Verify email-based 2FA code
export const verifyEmailCode = async (userId: string, code: string): Promise<boolean> => {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) {
    throw new Error('User not found');
  }
  
  const data = userDoc.data();
  const attempts = data.twofa_email_code_attempts || 0;
  
  // Check max attempts
  if (attempts >= 5) {
    throw new Error('Too many failed attempts. Please request a new code.');
  }
  
  // Check code expiration
  const expiresAt = data.twofa_temp_code_expires?.toDate();
  if (!expiresAt || expiresAt < new Date()) {
    throw new Error('Verification code has expired. Please request a new one.');
  }
  
  // Increment attempts
  await updateDoc(userRef, {
    twofa_email_code_attempts: attempts + 1,
  });
  
  // Verify code
  if (data.twofa_temp_code === code) {
    // Clear temporary code data on success
    await updateDoc(userRef, {
      twofa_temp_code: null,
      twofa_temp_code_expires: null,
      twofa_email_code_attempts: 0,
      twofa_last_used: new Date().toISOString(),
    });
    return true;
  }
  
  return false;
};

// Complete email 2FA setup
export const completeEmail2FASetup = async (
  userId: string,
  backupEmail: string | null = null
): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  const backupCodes = generateBackupCodes(8); // Generate backup codes for recovery
  
  await setDoc(userRef, {
    twofa_enabled: true,
    twofa_type: 'email',
    twofa_backup_email: backupEmail,
    twofa_backup_codes: backupCodes,
    twofa_last_used: new Date().toISOString(),
    twofa_temp_code: null,
    twofa_temp_code_expires: null,
    twofa_email_code_attempts: 0,
  }, { merge: true });
}; 