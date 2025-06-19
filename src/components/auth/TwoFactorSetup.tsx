import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  FormControl,
  FormLabel,
  Input,
  Checkbox,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Grid,
  GridItem,
  Code,
  Icon,
} from '@chakra-ui/react';
import { FaEnvelope, FaShieldAlt, FaKey, FaCheckCircle } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import {
  enableEmail2FA,
  sendEmail2FACode,
  verifyEmail2FACode,
} from '../../services/twoFactorService';

interface TwoFactorSetupProps {
  onComplete: () => void;
}

const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({ onComplete }) => {
  const { currentUser } = useAuth();
  const toast = useToast();
  
  const [step, setStep] = useState<'intro' | 'email-setup' | 'test-code' | 'backup-codes'>('intro');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupEmail, setBackupEmail] = useState('');
  const [useBackupEmail, setUseBackupEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [hasAcknowledgedBackup, setHasAcknowledgedBackup] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleEmailSetup = async () => {
    if (!currentUser?.email) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const targetEmail = useBackupEmail ? backupEmail : currentUser.email;
      
      // Send test verification code
      await sendEmail2FACode(currentUser.uid, targetEmail);
      
      setStep('test-code');
      toast({
        title: 'Test Code Sent',
        description: `Please check your email at ${targetEmail} for a verification code.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error: any) {
      setError(error.message);
      toast({
        title: 'Failed to Send Code',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestCodeVerification = async () => {
    if (!currentUser?.uid) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      await verifyEmail2FACode(currentUser.uid, verificationCode);
      
      // Enable 2FA and get backup codes
      const result = await enableEmail2FA(
        currentUser.uid, 
        useBackupEmail ? backupEmail : undefined
      );
      
      setBackupCodes(result.backupCodes);
      setStep('backup-codes');
      
      toast({
        title: 'Email Verified Successfully',
        description: 'Two-factor authentication is almost ready. Please save your backup codes.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
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

  const handleComplete = () => {
    if (!hasAcknowledgedBackup) {
      setError('Please confirm that you have saved your backup codes.');
      return;
    }

    toast({
      title: '2FA Setup Complete',
      description: 'Email-based two-factor authentication has been enabled successfully.',
      status: 'success',
      duration: 5000,
      isClosable: true,
    });
    
    onComplete();
  };

  const downloadBackupCodes = () => {
    const content = `Advanced Todo List - Backup Codes\n\nGenerated: ${new Date().toLocaleString()}\n\nBackup Codes (use each code only once):\n${backupCodes.map((code, index) => `${index + 1}. ${code}`).join('\n')}\n\nKeep these codes safe and secure. They can be used to access your account if you lose access to your email.`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'advanced-todo-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderIntro = () => (
    <VStack spacing={6} align="stretch">
      <VStack spacing={4} textAlign="center">
        <Icon as={FaShieldAlt} boxSize={16} color="blue.500" />
        <Heading size="lg">Set Up Two-Factor Authentication</Heading>
        <Text color="gray.600" maxW="md">
          Secure your account with email-based two-factor authentication. 
          You'll receive a verification code via email each time you sign in.
        </Text>
      </VStack>

      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <Box>
          <AlertTitle>How it works:</AlertTitle>
          <AlertDescription>
            <VStack align="start" spacing={1} mt={2}>
              <Text>• Enter your email and password as usual</Text>
              <Text>• Check your email for a 6-digit verification code</Text>
              <Text>• Enter the code to complete your login</Text>
            </VStack>
          </AlertDescription>
        </Box>
      </Alert>

      <Button
        colorScheme="blue"
        size="lg"
        onClick={() => setStep('email-setup')}
        leftIcon={<FaEnvelope />}
      >
        Set Up Email 2FA
      </Button>
    </VStack>
  );

  const renderEmailSetup = () => (
    <VStack spacing={6} align="stretch">
      <VStack spacing={2} textAlign="center">
        <Icon as={FaEnvelope} boxSize={12} color="blue.500" />
        <Heading size="lg">Configure Email Settings</Heading>
        <Text color="gray.600">
          Choose which email address to use for receiving verification codes.
        </Text>
      </VStack>
      
      <FormControl>
        <FormLabel>Email for 2FA Verification</FormLabel>
        <VStack align="stretch" spacing={3}>
          <Checkbox
            isChecked={!useBackupEmail}
            onChange={() => setUseBackupEmail(false)}
            size="lg"
          >
            <VStack align="start" spacing={1}>
              <Text fontWeight="medium">Use my account email</Text>
              <Text fontSize="sm" color="gray.500">{currentUser?.email}</Text>
            </VStack>
          </Checkbox>
          <Checkbox
            isChecked={useBackupEmail}
            onChange={() => setUseBackupEmail(true)}
            size="lg"
          >
            <Text fontWeight="medium">Use a different email address</Text>
          </Checkbox>
          {useBackupEmail && (
            <Input
              type="email"
              value={backupEmail}
              onChange={(e) => setBackupEmail(e.target.value)}
              placeholder="Enter backup email address"
              size="lg"
              ml={6}
            />
          )}
        </VStack>
      </FormControl>
      
      <HStack spacing={3}>
        <Button
          variant="outline"
          onClick={() => setStep('intro')}
          flex={1}
        >
          Back
        </Button>
        <Button
          colorScheme="blue"
          onClick={handleEmailSetup}
          isLoading={isLoading}
          isDisabled={useBackupEmail && !backupEmail}
          flex={2}
        >
          Send Test Code
        </Button>
      </HStack>
    </VStack>
  );

  const renderTestCode = () => (
    <VStack spacing={6} align="stretch">
      <VStack spacing={2} textAlign="center">
        <Icon as={FaKey} boxSize={12} color="green.500" />
        <Heading size="lg">Verify Your Email</Heading>
        <Text color="gray.600">
          We've sent a 6-digit verification code to{' '}
          <Text as="span" fontWeight="medium">
            {useBackupEmail ? backupEmail : currentUser?.email}
          </Text>
        </Text>
      </VStack>

      <FormControl>
        <FormLabel textAlign="center">Enter Verification Code</FormLabel>
        <Input
          type="text"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value)}
          placeholder="Enter 6-digit code"
          textAlign="center"
          fontSize="xl"
          letterSpacing="wide"
          maxLength={6}
          size="lg"
        />
        <Text fontSize="sm" color="gray.500" textAlign="center" mt={2}>
          Code expires in 10 minutes
        </Text>
      </FormControl>

      <HStack spacing={3}>
        <Button
          variant="outline"
          onClick={() => setStep('email-setup')}
          flex={1}
        >
          Back
        </Button>
        <Button
          colorScheme="blue"
          onClick={handleTestCodeVerification}
          isLoading={isLoading}
          isDisabled={verificationCode.length !== 6}
          flex={2}
        >
          Verify Code
        </Button>
      </HStack>
    </VStack>
  );

  const renderBackupCodes = () => (
    <VStack spacing={6} align="stretch">
      <VStack spacing={2} textAlign="center">
        <Icon as={FaCheckCircle} boxSize={12} color="green.500" />
        <Heading size="lg">Save Your Backup Codes</Heading>
        <Text color="gray.600">
          These backup codes can be used to access your account if you lose access to your email.
        </Text>
      </VStack>

      <Alert status="warning" borderRadius="md">
        <AlertIcon />
        <Box>
          <AlertTitle>Important!</AlertTitle>
          <AlertDescription>
            Save these codes in a secure location. Each code can only be used once.
          </AlertDescription>
        </Box>
      </Alert>

      <Box bg="gray.50" p={4} borderRadius="md" border="1px" borderColor="gray.200">
        <Grid templateColumns="repeat(2, 1fr)" gap={2}>
          {backupCodes.map((code, index) => (
            <GridItem key={index}>
              <Code fontSize="sm" p={2} display="block" textAlign="center">
                {code}
              </Code>
            </GridItem>
          ))}
        </Grid>
      </Box>

      <HStack spacing={3}>
        <Button
          variant="outline"
          onClick={downloadBackupCodes}
          leftIcon={<FaKey />}
          flex={1}
        >
          Download Codes
        </Button>
        <Button
          variant="outline"
          onClick={onOpen}
          flex={1}
        >
          Copy Codes
        </Button>
      </HStack>

      <Checkbox
        isChecked={hasAcknowledgedBackup}
        onChange={(e) => setHasAcknowledgedBackup(e.target.checked)}
        size="lg"
      >
        <Text fontSize="sm">
          I have saved these backup codes in a secure location
        </Text>
      </Checkbox>

      <Button
        colorScheme="green"
        size="lg"
        onClick={handleComplete}
        isDisabled={!hasAcknowledgedBackup}
        leftIcon={<FaCheckCircle />}
      >
        Complete Setup
      </Button>
    </VStack>
  );

  return (
    <Box maxW="md" mx="auto" p={6}>
      {error && (
        <Alert status="error" mb={6} borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>Setup Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Box>
        </Alert>
      )}

      {step === 'intro' && renderIntro()}
      {step === 'email-setup' && renderEmailSetup()}
      {step === 'test-code' && renderTestCode()}
      {step === 'backup-codes' && renderBackupCodes()}

      {/* Backup codes modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Backup Codes</ModalHeader>
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Text fontSize="sm" color="gray.600">
                Copy these codes and store them securely:
              </Text>
              <Box
                as="textarea"
                value={backupCodes.join('\n')}
                readOnly
                rows={backupCodes.length}
                p={3}
                border="1px"
                borderColor="gray.200"
                borderRadius="md"
                fontFamily="mono"
                fontSize="sm"
                resize="none"
              />
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default TwoFactorSetup; 