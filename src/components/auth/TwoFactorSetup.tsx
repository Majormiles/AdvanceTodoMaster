import React, { useState } from 'react';
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
  AlertTitle,
  AlertDescription,
  Code,
  Grid,
  GridItem,
  ListItem,
  UnorderedList,
  Checkbox,
  FormControl,
  FormLabel,
  Input,
} from '@chakra-ui/react';
import { FaExclamationTriangle, FaEnvelope } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import {
  generateBackupCodes,
  completeEmail2FASetup,
  sendEmailCode,
  verifyEmailCode,
} from '../../services/twoFactorService';

interface TwoFactorSetupProps {
  onComplete: () => void;
}

const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({ onComplete }) => {
  const { currentUser } = useAuth();
  const toast = useToast();
  
  const [step, setStep] = useState<'email' | 'email-verify' | 'backup'>('email');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupEmail, setBackupEmail] = useState('');
  const [useBackupEmail, setUseBackupEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [hasAcknowledgedBackup, setHasAcknowledgedBackup] = useState(false);

  const handleEmailSetup = async () => {
    if (!currentUser?.email) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const targetEmail = useBackupEmail ? backupEmail : currentUser.email;
      await sendEmailCode(currentUser.uid, targetEmail);
      
      setStep('email-verify');
      toast({
        title: 'Verification Code Sent',
        description: `Please check your email at ${targetEmail} for the verification code.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailVerify = async () => {
    if (!currentUser?.uid) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const isValid = await verifyEmailCode(currentUser.uid, verificationCode);
      
      if (!isValid) {
        throw new Error('Invalid verification code. Please try again.');
      }
      
      // Generate backup codes after successful verification
      const codes = generateBackupCodes(8);
      setBackupCodes(codes);
      setStep('backup');
      
      toast({
        title: 'Verification Successful',
        description: 'Please save your backup codes in the next step.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!currentUser?.uid || !hasAcknowledgedBackup) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      await completeEmail2FASetup(currentUser.uid, useBackupEmail ? backupEmail : null);
      
      toast({
        title: '2FA Setup Complete',
        description: 'Email-based two-factor authentication has been enabled.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      onComplete();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderEmailSetup = () => (
    <VStack spacing={6} align="stretch">
      <Heading size="lg">Set Up Email-Based 2FA</Heading>
      <Text>
        Two-factor authentication adds an extra layer of security to your account.
        Each time you sign in, you'll need to enter a verification code sent to your email.
      </Text>
      
      <FormControl>
        <FormLabel>Email for 2FA Verification</FormLabel>
        <VStack align="stretch" spacing={3}>
          <Checkbox
            isChecked={!useBackupEmail}
            onChange={() => setUseBackupEmail(false)}
          >
            Use my account email: {currentUser?.email}
          </Checkbox>
          <Checkbox
            isChecked={useBackupEmail}
            onChange={() => setUseBackupEmail(true)}
          >
            Use a different email address
          </Checkbox>
          {useBackupEmail && (
            <Input
              type="email"
              value={backupEmail}
              onChange={(e) => setBackupEmail(e.target.value)}
              placeholder="Enter backup email address"
            />
          )}
        </VStack>
      </FormControl>
      
      <Button
        leftIcon={<FaEnvelope />}
        colorScheme="blue"
        onClick={handleEmailSetup}
        isLoading={isLoading}
        isDisabled={useBackupEmail && !backupEmail}
      >
        Send Verification Code
      </Button>
    </VStack>
  );

  const renderEmailVerify = () => (
    <VStack spacing={6} align="stretch">
      <Heading size="lg">Verify Your Email</Heading>
      <Text>
        Enter the 6-digit verification code sent to your email:
        {useBackupEmail ? backupEmail : currentUser?.email}
      </Text>
      
      <HStack justifyContent="center">
        <PinInput
          value={verificationCode}
          onChange={setVerificationCode}
          otp
          size="lg"
        >
          {[...Array(6)].map((_, i) => (
            <PinInputField key={i} />
          ))}
        </PinInput>
      </HStack>
      
      <Button
        colorScheme="blue"
        onClick={handleEmailVerify}
        isLoading={isLoading}
        isDisabled={verificationCode.length !== 6}
      >
        Verify Code
      </Button>
      
      <Button
        variant="ghost"
        onClick={handleEmailSetup}
        isDisabled={isLoading}
      >
        Resend Code
      </Button>
    </VStack>
  );

  const renderBackupCodes = () => (
    <VStack spacing={6} align="stretch">
      <Heading size="lg">Save Your Backup Codes</Heading>
      <Alert status="warning">
        <AlertIcon />
        <Box>
          <AlertTitle>Important!</AlertTitle>
          <AlertDescription>
            Save these backup codes in a secure place. You'll need them if you lose access to your email.
            Each code can only be used once.
          </AlertDescription>
        </Box>
      </Alert>
      
      <Grid templateColumns="repeat(2, 1fr)" gap={4}>
        {backupCodes.map((code, index) => (
          <GridItem key={index}>
            <Code p={2} borderRadius="md" width="100%" textAlign="center">
              {code}
            </Code>
          </GridItem>
        ))}
      </Grid>
      
      <UnorderedList spacing={2}>
        <ListItem>Keep these codes safe and accessible</ListItem>
        <ListItem>Each code can only be used once</ListItem>
        <ListItem>Generate new codes if you run out or suspect compromise</ListItem>
      </UnorderedList>
      
      <Checkbox
        isChecked={hasAcknowledgedBackup}
        onChange={(e) => setHasAcknowledgedBackup(e.target.checked)}
      >
        I have saved these backup codes in a secure location
      </Checkbox>
      
      <Button
        colorScheme="blue"
        onClick={handleComplete}
        isLoading={isLoading}
        isDisabled={!hasAcknowledgedBackup}
      >
        Complete Setup
      </Button>
    </VStack>
  );

  if (error) {
    return (
      <Alert status="error" mb={4}>
        <AlertIcon />
        <Box>
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Box>
      </Alert>
    );
  }

  return (
    <Box maxW="600px" mx="auto" p={6}>
      {step === 'email' && renderEmailSetup()}
      {step === 'email-verify' && renderEmailVerify()}
      {step === 'backup' && renderBackupCodes()}
    </Box>
  );
};

export default TwoFactorSetup; 