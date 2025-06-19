import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, functions } from '../firebase/config';
import { httpsCallable } from 'firebase/functions';
import { generateToken } from '../utils/helpers';

// Interface for 2FA settings - updated to focus on email-based 2FA
interface TwoFactorSettings {
  twofa_enabled: boolean;
  twofa_method: 'email' | 'disabled';
  twofa_backup_codes: string[];
  twofa_backup_email?: string | null;
  twofa_last_used: string | null;
  twofa_email_code?: string | null;
  twofa_email_code_expires?: string | null;
  twofa_email_code_attempts?: number;
  twofa_email_sent_at?: string | null;
  twofa_setup_date?: string | null;
  twofa_last_verified?: string | null;
}

// Constants for security and rate limiting
const CODE_EXPIRY_MINUTES = 10;
const MAX_CODE_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MINUTES = 15;
const MAX_CODES_PER_WINDOW = 3;



// Session management for 2FA verification status
const TWO_FACTOR_SESSION_KEY = '2fa_verified_session';

export const set2FAVerified = (userId: string) => {
  const sessionData = {
    userId,
    verifiedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
  };
  sessionStorage.setItem(TWO_FACTOR_SESSION_KEY, JSON.stringify(sessionData));
};

export const check2FAVerified = (userId: string): boolean => {
  const sessionData = sessionStorage.getItem(TWO_FACTOR_SESSION_KEY);
  if (!sessionData) return false;

  try {
    const { userId: storedUserId, expiresAt } = JSON.parse(sessionData);
    const now = new Date();
    const expiration = new Date(expiresAt);

    return storedUserId === userId && now < expiration;
  } catch {
    return false;
  }
};

export const clear2FAVerified = () => {
  sessionStorage.removeItem(TWO_FACTOR_SESSION_KEY);
};

// Get comprehensive 2FA settings for a user
export const get2FASettings = async (userId: string): Promise<TwoFactorSettings> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return {
        twofa_enabled: false,
        twofa_method: 'disabled',
        twofa_backup_codes: [],
        twofa_last_used: null,
        twofa_email_code_attempts: 0,
      };
    }

    const userData = userDoc.data();
    return {
      twofa_enabled: userData.twofa_enabled || false,
      twofa_method: userData.twofa_method || 'disabled',
      twofa_backup_codes: userData.twofa_backup_codes || [],
      twofa_backup_email: userData.twofa_backup_email || null,
      twofa_last_used: userData.twofa_last_used || null,
      twofa_email_code: userData.twofa_email_code || null,
      twofa_email_code_expires: userData.twofa_email_code_expires || null,
      twofa_email_code_attempts: userData.twofa_email_code_attempts || 0,
      twofa_email_sent_at: userData.twofa_email_sent_at || null,
      twofa_setup_date: userData.twofa_setup_date || null,
      twofa_last_verified: userData.twofa_last_verified || null,
    };
  } catch (error) {
    console.error('Error getting 2FA settings:', error);
    throw new Error('Failed to retrieve 2FA settings');
  }
};

// Generate secure 6-digit code for email verification
export const generateEmailCode = (): string => {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  // Ensure 6-digit code between 100000-999999
  const code = (array[0] % 900000 + 100000).toString();
  return code;
};

// Generate backup codes for account recovery
export const generateBackupCodes = (count: number = 8): string[] => {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(generateToken(10).toUpperCase());
  }
  return codes;
};

// Check rate limiting for email code generation
const checkRateLimit = async (userId: string): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) return true;

    const userData = userDoc.data();
    const lastSentAt = userData.twofa_email_sent_at;
    const attempts = userData.twofa_email_code_attempts || 0;

    if (!lastSentAt) return true;

    const lastSent = new Date(lastSentAt);
    const now = new Date();
    const timeDiff = now.getTime() - lastSent.getTime();
    const minutesDiff = timeDiff / (1000 * 60);

    // Reset attempts if window has passed
    if (minutesDiff > RATE_LIMIT_WINDOW_MINUTES) {
      return true;
    }

    // Check if user has exceeded rate limit
    return attempts < MAX_CODES_PER_WINDOW;
  } catch (error) {
    console.error('Error checking rate limit:', error);
    return false;
  }
};

// Send 2FA verification code via email
export const sendEmail2FACode = async (userId: string, userEmail: string): Promise<void> => {
  try {
    // Check rate limiting
    const canSend = await checkRateLimit(userId);
    if (!canSend) {
      throw new Error(`Rate limit exceeded. You can only request ${MAX_CODES_PER_WINDOW} codes every ${RATE_LIMIT_WINDOW_MINUTES} minutes.`);
    }

    // Generate secure 6-digit code
    const code = generateEmailCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + CODE_EXPIRY_MINUTES);

    // Get current user data for rate limiting
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.exists() ? userDoc.data() : {};
    
    const lastSentAt = userData.twofa_email_sent_at;
    const currentAttempts = userData.twofa_email_code_attempts || 0;
    
    // Determine new attempt count
    let newAttempts = 1;
    if (lastSentAt) {
      const lastSent = new Date(lastSentAt);
      const now = new Date();
      const timeDiff = now.getTime() - lastSent.getTime();
      const minutesDiff = timeDiff / (1000 * 60);
      
      if (minutesDiff <= RATE_LIMIT_WINDOW_MINUTES) {
        newAttempts = currentAttempts + 1;
      }
    }

    // Store code and metadata in database
    await updateDoc(userRef, {
      twofa_email_code: code,
      twofa_email_code_expires: expiresAt.toISOString(),
      twofa_email_code_attempts: newAttempts,
      twofa_email_sent_at: new Date().toISOString(),
    });

    // Determine which email to use
    const targetEmail = userData.twofa_backup_email || userEmail;

    // Send email via Firebase function using httpsCallable
    const send2FAEmail = httpsCallable(functions, 'send2FAEmail');
    
    console.log('🔧 Calling Firebase Function send2FAEmail with data:', {
      to: targetEmail.replace(/(.{3}).*(@.*)/, '$1***$2'), // Mask email for logs
      hasCode: !!code,
      hasExpiresAt: !!expiresAt
    });
    
    try {
      const result = await send2FAEmail({
        to: targetEmail,
        code,
        expiresAt: expiresAt.toISOString(),
      });

      console.log('✅ 2FA email sent successfully:', result.data);
    } catch (functionError: any) {
      console.error('❌ Firebase Function Error Details:', {
        code: functionError.code,
        message: functionError.message,
        details: functionError.details
      });
      
      // Provide more specific error messages
      if (functionError.code === 'internal') {
        throw new Error('Email service is temporarily unavailable. Please try again in a few minutes.');
      } else if (functionError.code === 'unauthenticated') {
        throw new Error('Authentication required. Please log in again.');
      } else {
        throw new Error(`Failed to send verification email: ${functionError.message}`);
      }
    }

  } catch (error) {
    console.error('Error sending 2FA email:', error);
    throw error;
  }
};

// Verify email-based 2FA code
export const verifyEmail2FACode = async (userId: string, inputCode: string): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    const storedCode = userData.twofa_email_code;
    const expiresAt = userData.twofa_email_code_expires;
    const attempts = userData.twofa_email_code_attempts || 0;

    // Check if code exists
    if (!storedCode) {
      throw new Error('No verification code found. Please request a new code.');
    }

    // Check if code has expired
    if (!expiresAt || new Date() > new Date(expiresAt)) {
      // Clear expired code
      await updateDoc(userRef, {
        twofa_email_code: null,
        twofa_email_code_expires: null,
      });
      throw new Error('Verification code has expired. Please request a new code.');
    }

    // Check if too many attempts
    if (attempts >= MAX_CODE_ATTEMPTS) {
      // Clear code after max attempts
      await updateDoc(userRef, {
        twofa_email_code: null,
        twofa_email_code_expires: null,
      });
      throw new Error('Too many invalid attempts. Please request a new code.');
    }

    // Verify code
    if (inputCode.trim() !== storedCode) {
      // Increment attempt counter
      await updateDoc(userRef, {
        twofa_email_code_attempts: attempts + 1,
      });
      throw new Error('Invalid verification code. Please try again.');
    }

    // Code is valid - clear it and update verification status
    await updateDoc(userRef, {
      twofa_email_code: null,
      twofa_email_code_expires: null,
      twofa_email_code_attempts: 0,
      twofa_last_verified: new Date().toISOString(),
    });

    // Set session verification
    set2FAVerified(userId);

    return true;
  } catch (error) {
    console.error('Error verifying 2FA code:', error);
    throw error;
  }
};

// Verify backup code
export const verifyBackupCode = async (userId: string, inputCode: string): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    const backupCodes = userData.twofa_backup_codes || [];
    
    // Find and remove the used backup code
    const codeIndex = backupCodes.findIndex((code: string) => 
      code.toLowerCase() === inputCode.toLowerCase().trim()
    );

    if (codeIndex === -1) {
      throw new Error('Invalid backup code');
    }

    // Remove the used backup code
    backupCodes.splice(codeIndex, 1);

    // Update database
    await updateDoc(userRef, {
      twofa_backup_codes: backupCodes,
      twofa_last_verified: new Date().toISOString(),
    });

    // Set session verification
    set2FAVerified(userId);

    return true;
  } catch (error) {
    console.error('Error verifying backup code:', error);
    throw error;
  }
};

// Enable email-based 2FA for a user
export const enableEmail2FA = async (userId: string, backupEmail?: string): Promise<{ success: boolean; backupCodes: string[] }> => {
  try {
    const userRef = doc(db, 'users', userId);
    
    // Generate backup codes
    const backupCodes = generateBackupCodes(8);

    // Update user document with 2FA settings
    await updateDoc(userRef, {
      twofa_enabled: true,
      twofa_method: 'email',
      twofa_backup_email: backupEmail || null,
      twofa_backup_codes: backupCodes,
      twofa_setup_date: new Date().toISOString(),
      twofa_last_used: null,
      twofa_email_code: null,
      twofa_email_code_expires: null,
      twofa_email_code_attempts: 0,
    });

    // Dispatch custom events to notify components immediately
    window.dispatchEvent(new CustomEvent('2fa-enabled'));
    window.dispatchEvent(new CustomEvent('2fa-status-changed'));
    console.log('🔧 2FA Service: Dispatched 2fa-enabled and status-changed events');

    return {
      success: true,
      backupCodes,
    };
  } catch (error) {
    console.error('Error enabling 2FA:', error);
    throw new Error('Failed to enable 2FA');
  }
};

// Disable 2FA for a user
export const disable2FA = async (userId: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    
    await updateDoc(userRef, {
      twofa_enabled: false,
      twofa_method: 'disabled',
      twofa_backup_codes: [],
      twofa_backup_email: null,
      twofa_email_code: null,
      twofa_email_code_expires: null,
      twofa_email_code_attempts: 0,
      twofa_email_sent_at: null,
      twofa_last_verified: null,
    });

    // Clear any active verification session
    clear2FAVerified();

    // Dispatch custom events to notify components immediately
    window.dispatchEvent(new CustomEvent('2fa-disabled'));
    window.dispatchEvent(new CustomEvent('2fa-status-changed'));
    console.log('🔧 2FA Service: Dispatched 2fa-disabled and status-changed events');
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    throw new Error('Failed to disable 2FA');
  }
};

// Resend 2FA code (with rate limiting)
export const resend2FACode = async (userId: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    const userEmail = userData.email;

    if (!userEmail) {
      throw new Error('User email not found');
    }

    // Use the same send function which includes rate limiting
    await sendEmail2FACode(userId, userEmail);
  } catch (error) {
    console.error('Error resending 2FA code:', error);
    throw error;
  }
};

// Check if user requires 2FA verification
export const requiresVerification = async (userId: string): Promise<boolean> => {
  try {
    const settings = await get2FASettings(userId);
    
    if (!settings.twofa_enabled) {
      return false;
    }

    // Check if already verified in this session
    return !check2FAVerified(userId);
  } catch (error) {
    console.error('Error checking 2FA requirement:', error);
    return false;
  }
};

// Get remaining backup codes count
export const getBackupCodesCount = async (userId: string): Promise<number> => {
  try {
    const settings = await get2FASettings(userId);
    return settings.twofa_backup_codes?.length || 0;
  } catch (error) {
    console.error('Error getting backup codes count:', error);
    return 0;
  }
};

// Regenerate backup codes
export const regenerateBackupCodes = async (userId: string): Promise<string[]> => {
  try {
    const userRef = doc(db, 'users', userId);
    const newBackupCodes = generateBackupCodes(8);

    await updateDoc(userRef, {
      twofa_backup_codes: newBackupCodes,
    });

    return newBackupCodes;
  } catch (error) {
    console.error('Error regenerating backup codes:', error);
    throw new Error('Failed to regenerate backup codes');
  }
}; 