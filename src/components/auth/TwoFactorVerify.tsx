import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  Button,
  PinInput,
  PinInputField,
  HStack,
  useToast,
  Alert,
  AlertIcon,
  Link,
  Progress,
} from '@chakra-ui/react';
import { verifyBackupCode, get2FASettings, sendEmailCode, verifyEmailCode } from '../../services/twoFactorService';
import { useAuth } from '../../contexts/AuthContext';

interface TwoFactorVerifyProps {
  onSuccess: () => void;
  onCancel: () => void;
  userId: string;
}

const TwoFactorVerify: React.FC<TwoFactorVerifyProps> = ({ onSuccess, onCancel, userId }) => {
  const { currentUser } = useAuth();
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isUsingBackupCode, setIsUsingBackupCode] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [emailSentAt, setEmailSentAt] = useState<Date | null>(null);
  const toast = useToast();
  
  useEffect(() => {
    loadUserSettings();
  }, [userId]);
  
  useEffect(() => {
    if (emailSentAt && timeLeft > 0) {
      const timer = setInterval(() => {
        const now = new Date();
        const diff = 60 - Math.floor((now.getTime() - emailSentAt.getTime()) / 1000);
        setTimeLeft(diff > 0 ? diff : 0);
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [emailSentAt, timeLeft]);
  
  const loadUserSettings = async () => {
    try {
      const settings = await get2FASettings(userId);
      if (settings.twofa_type === 'email') {
        handleSendEmailCode();
      } else {
        throw new Error('Email-based 2FA is not configured');
      }
    } catch (error: any) {
      setError(error.message);
    }
  };
  
  const handleSendEmailCode = async () => {
    if (!userId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const settings = await get2FASettings(userId);
      const targetEmail = settings.twofa_backup_email || currentUser?.email;
      
      if (!targetEmail) {
        throw new Error('No email configured for 2FA');
      }
      
      await sendEmailCode(userId, targetEmail);
      setEmailSentAt(new Date());
      setTimeLeft(60);
      
      toast({
        title: 'Verification Code Sent',
        description: `Please check your email at ${targetEmail} for the verification code.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error: any) {
      setError(error.message);
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleVerify = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const settings = await get2FASettings(userId);
      
      if (!settings.twofa_enabled) {
        throw new Error('2FA is not properly configured');
      }
      
      let isValid = false;
      
      if (isUsingBackupCode) {
        isValid = await verifyBackupCode(userId, verificationCode);
      } else {
        isValid = await verifyEmailCode(userId, verificationCode);
      }
      
      if (!isValid) {
        throw new Error(
          isUsingBackupCode
            ? 'Invalid backup code. Please try again.'
            : 'Invalid verification code. Please try again.'
        );
      }
      
      toast({
        title: 'Verification Successful',
        description: 'You have successfully verified your identity.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      onSuccess();
    } catch (error: any) {
      setError(error.message);
      toast({
        title: 'Verification Failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const toggleBackupCode = () => {
    setIsUsingBackupCode(!isUsingBackupCode);
    setVerificationCode('');
    setError(null);
  };
  
  return (
    <Box maxW="md" mx="auto" p={6}>
      <VStack spacing={8} align="stretch">
        <Heading size="lg" textAlign="center">
          Two-Factor Authentication
        </Heading>
        
        <Alert status="info">
          <AlertIcon />
          <Box>
            <Text>
              {isUsingBackupCode
                ? 'Enter one of your backup codes to verify your identity.'
                : 'Enter the 6-digit code sent to your email.'}
            </Text>
          </Box>
        </Alert>
        
        {!isUsingBackupCode && timeLeft > 0 && (
          <Box>
            <Text mb={2} fontSize="sm" color="gray.600">
              Resend code in {timeLeft} seconds
            </Text>
            <Progress value={(60 - timeLeft) * (100 / 60)} size="xs" colorScheme="blue" />
          </Box>
        )}
        
        <VStack spacing={4}>
          {isUsingBackupCode ? (
            <PinInput
              type="alphanumeric"
              value={verificationCode}
              onChange={setVerificationCode}
              placeholder=""
              size="lg"
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <PinInputField key={i} />
              ))}
            </PinInput>
          ) : (
            <HStack justify="center">
              <PinInput
                type="number"
                value={verificationCode}
                onChange={setVerificationCode}
                otp
                size="lg"
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <PinInputField key={i} />
                ))}
              </PinInput>
            </HStack>
          )}
          
          {error && (
            <Alert status="error">
              <AlertIcon />
              {error}
            </Alert>
          )}
          
          <Button
            colorScheme="blue"
            onClick={handleVerify}
            isLoading={isLoading}
            isDisabled={
              isUsingBackupCode
                ? verificationCode.length !== 8
                : verificationCode.length !== 6
            }
            size="lg"
            width="full"
          >
            Verify
          </Button>
          
          {!isUsingBackupCode && timeLeft === 0 && (
            <Button
              variant="ghost"
              onClick={handleSendEmailCode}
              isDisabled={isLoading}
              size="sm"
            >
              Resend Code
            </Button>
          )}
          
          <Link
            color="blue.500"
            onClick={toggleBackupCode}
            _hover={{ textDecoration: 'underline', cursor: 'pointer' }}
            textAlign="center"
            fontSize="sm"
          >
            {isUsingBackupCode
              ? 'Use verification code instead'
              : 'Use backup code instead'}
          </Link>
          
          <Button
            variant="ghost"
            onClick={onCancel}
            size="sm"
            isDisabled={isLoading}
          >
            Cancel
          </Button>
        </VStack>
      </VStack>
    </Box>
  );
};

export default TwoFactorVerify; 