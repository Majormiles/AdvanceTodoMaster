import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  FormControl,
  FormLabel,
  Input,
  Button,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  PinInput,
  PinInputField,
  Divider,
  Spinner,
  Center,
  Flex,
  Icon,
} from '@chakra-ui/react';
import { FaEnvelope, FaShieldAlt, FaClock, FaRedo } from 'react-icons/fa';
import { verifyEmail2FACode, resend2FACode, verifyBackupCode } from '../../services/twoFactorService';
import { useAuth } from '../../contexts/AuthContext';

interface TwoFactorVerifyProps {
  userId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const TwoFactorVerify: React.FC<TwoFactorVerifyProps> = ({ userId, onSuccess, onCancel }) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [showBackupCode, setShowBackupCode] = useState(false);
  const [codeExpiry, setCodeExpiry] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState('');

  const toast = useToast();
  const navigate = useNavigate();
  const { pendingUser, complete2FALogin, setRequires2FA } = useAuth();

  // Use userId from props or pendingUser
  const currentUserId = userId || pendingUser?.uid;

  useEffect(() => {
    if (!currentUserId) {
      navigate('/login');
      return;
    }

    // Start initial countdown for resend
    setCountdown(30);
    
    // Set code expiry (10 minutes from now)
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 10);
    setCodeExpiry(expiry);
  }, [currentUserId, navigate]);

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Expiry countdown timer
  useEffect(() => {
    if (!codeExpiry) return;

    const updateTimeLeft = () => {
      const now = new Date();
      const diff = codeExpiry.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimeLeft();
    const timer = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [codeExpiry]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || !currentUserId) {
      setError('Please enter the verification code');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await verifyEmail2FACode(currentUserId, verificationCode);
      
      toast({
        title: 'Verification Successful',
        description: 'Two-factor authentication completed successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Complete the login process
      if (pendingUser) {
        await complete2FALogin(pendingUser);
      }

      if (onSuccess) {
        onSuccess();
      }

      navigate('/dashboard');
    } catch (err: any) {
      console.error('2FA verification error:', err);
      setError(err.message || 'Invalid verification code. Please try again.');
      
      // Clear the input on error
      setVerificationCode('');
      
      toast({
        title: 'Verification Failed',
        description: err.message || 'Invalid verification code',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackupCodeVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupCode || !currentUserId) {
      setError('Please enter a backup code');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await verifyBackupCode(currentUserId, backupCode);
      
      toast({
        title: 'Backup Code Verified',
        description: 'Successfully verified with backup code',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Complete the login process
      if (pendingUser) {
        await complete2FALogin(pendingUser);
      }

      if (onSuccess) {
        onSuccess();
      }

      navigate('/dashboard');
    } catch (err: any) {
      console.error('Backup code verification error:', err);
      setError(err.message || 'Invalid backup code. Please try again.');
      setBackupCode('');
      
      toast({
        title: 'Verification Failed',
        description: err.message || 'Invalid backup code',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (!currentUserId) return;

    try {
      setIsResending(true);
      setError(null);
      
      await resend2FACode(currentUserId);
      
      // Reset countdown and expiry
      setCountdown(30);
      const newExpiry = new Date();
      newExpiry.setMinutes(newExpiry.getMinutes() + 10);
      setCodeExpiry(newExpiry);
      
      toast({
        title: 'Code Sent',
        description: 'A new verification code has been sent to your email',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err: any) {
      console.error('Error resending code:', err);
      setError(err.message || 'Failed to resend code');
      toast({
        title: 'Failed to Resend',
        description: err.message || 'Failed to resend verification code',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleCancel = () => {
    setRequires2FA(false);
    if (onCancel) {
      onCancel();
    } else {
      navigate('/login');
    }
  };

  if (!currentUserId) {
    return (
      <Center h="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  return (
    <Box maxW="md" mx="auto" p={6}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <VStack spacing={3} textAlign="center">
          <Flex align="center" justify="center">
            <Icon as={FaShieldAlt} color="blue.500" boxSize={8} mr={2} />
            <Heading size="lg">Two-Factor Authentication</Heading>
          </Flex>
          <Text color="gray.600">
            We've sent a verification code to your email address
          </Text>
        </VStack>

        {/* Status indicators */}
        <HStack spacing={4} justify="center">
          <HStack>
            <Icon as={FaEnvelope} color="green.500" />
            <Text fontSize="sm" color="green.500">Email Sent</Text>
          </HStack>
          <HStack>
            <Icon as={FaClock} color={timeLeft === 'Expired' ? 'red.500' : 'blue.500'} />
            <Text fontSize="sm" color={timeLeft === 'Expired' ? 'red.500' : 'blue.500'}>
              {timeLeft === 'Expired' ? 'Code Expired' : `Expires in ${timeLeft}`}
            </Text>
          </HStack>
        </HStack>

        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <Box>
              <AlertTitle>Verification Failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Box>
          </Alert>
        )}

        {/* Main verification form */}
        {!showBackupCode ? (
          <form onSubmit={handleVerify}>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel textAlign="center">Enter Verification Code</FormLabel>
                <HStack justify="center">
                  <PinInput 
                    value={verificationCode} 
                    onChange={setVerificationCode}
                    size="lg"
                    isDisabled={isSubmitting}
                  >
                    <PinInputField />
                    <PinInputField />
                    <PinInputField />
                    <PinInputField />
                    <PinInputField />
                    <PinInputField />
                  </PinInput>
                </HStack>
                <Text fontSize="sm" color="gray.500" textAlign="center" mt={2}>
                  Enter the 6-digit code from your email
                </Text>
              </FormControl>

              <Button
                type="submit"
                colorScheme="blue"
                width="full"
                size="lg"
                isLoading={isSubmitting}
                loadingText="Verifying..."
                isDisabled={verificationCode.length !== 6}
              >
                Verify Code
              </Button>
            </VStack>
          </form>
        ) : (
          /* Backup code form */
          <form onSubmit={handleBackupCodeVerify}>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Enter Backup Code</FormLabel>
                <Input
                  type="text"
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value)}
                  placeholder="Enter your backup code"
                  size="lg"
                  textAlign="center"
                  textTransform="uppercase"
                  isDisabled={isSubmitting}
                />
                <Text fontSize="sm" color="gray.500" textAlign="center" mt={2}>
                  Enter one of your backup recovery codes
                </Text>
              </FormControl>

              <Button
                type="submit"
                colorScheme="blue"
                width="full"
                size="lg"
                isLoading={isSubmitting}
                loadingText="Verifying..."
                isDisabled={!backupCode.trim()}
              >
                Verify Backup Code
              </Button>
            </VStack>
          </form>
        )}

        <Divider />

        {/* Action buttons */}
        <VStack spacing={2}>
          <Button
            variant="outline"
            width="full"
            onClick={handleResendCode}
            isDisabled={countdown > 0 || timeLeft === 'Expired'}
            isLoading={isResending}
            loadingText="Sending..."
            leftIcon={<FaRedo />}
          >
            {countdown > 0
              ? `Resend code in ${countdown}s`
              : timeLeft === 'Expired'
              ? 'Request New Code'
              : 'Resend Code'}
          </Button>

          <Button
            variant="ghost"
            width="full"
            onClick={() => setShowBackupCode(!showBackupCode)}
            isDisabled={isSubmitting}
          >
            {showBackupCode ? 'Use Email Code Instead' : 'Use Backup Code Instead'}
          </Button>

          <Button
            variant="ghost"
            width="full"
            onClick={handleCancel}
            isDisabled={isSubmitting || isResending}
            color="gray.500"
          >
            Cancel and Return to Login
          </Button>
        </VStack>

        {/* Help text */}
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Box fontSize="sm">
            <Text fontWeight="medium">Having trouble?</Text>
            <Text>
              Check your spam folder or try using a backup code if you can't receive the email.
            </Text>
          </Box>
        </Alert>
      </VStack>
    </Box>
  );
};

export default TwoFactorVerify; 