import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Text, 
  useToast, 
  VStack,
  Input,
  HStack,
  PinInput,
  PinInputField,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure 
} from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import { 
  multiFactor, 
  PhoneAuthProvider, 
  PhoneMultiFactorGenerator, 
  RecaptchaVerifier 
} from 'firebase/auth';
import { auth } from '../firebase/config';

const MFASetup: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  // Send verification code to phone
  const sendVerificationCode = async () => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Initialize reCAPTCHA verifier
      const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'normal',
        callback: () => {
          // reCAPTCHA solved, allow sending verification code
        }
      });
      
      // Multi-factor enrollment session
      const multiFactorUser = multiFactor(currentUser);
      const multiFactorSession = await multiFactorUser.getSession();
      
      // Send SMS verification code
      const phoneInfoOptions = {
        phoneNumber: phoneNumber,
        session: multiFactorSession
      };
      
      const phoneAuthProvider = new PhoneAuthProvider(auth);
      const verificationId = await phoneAuthProvider.verifyPhoneNumber(
        phoneInfoOptions, 
        recaptchaVerifier
      );
      
      // Store verification ID
      setVerificationId(verificationId);
      
      // Move to code verification step
      setStep('code');
      
      toast({
        title: 'Verification code sent',
        description: `A verification code has been sent to ${phoneNumber}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
    } catch (err: any) {
      setError(err.message);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Verify the code and complete MFA enrollment
  const verifyAndEnrollMFA = async () => {
    if (!currentUser || !verificationId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Create credential from verification code
      const phoneAuthCredential = PhoneAuthProvider.credential(
        verificationId,
        verificationCode
      );
      
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(phoneAuthCredential);
      
      // Enroll as multi-factor authentication method
      const multiFactorUser = multiFactor(currentUser);
      await multiFactorUser.enroll(multiFactorAssertion, phoneNumber);
      
      toast({
        title: 'MFA Enrolled Successfully',
        description: 'Your account is now protected with multi-factor authentication',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Reset form and close modal
      setStep('phone');
      setPhoneNumber('');
      setVerificationCode('');
      onClose();
      
    } catch (err: any) {
      setError(err.message);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Box>
      <Button colorScheme="blue" onClick={onOpen}>
        Set Up Multi-Factor Authentication
      </Button>
      
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Set Up Multi-Factor Authentication</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {error && (
              <Alert status="error" mb={4}>
                <AlertIcon />
                <AlertTitle>Error:</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {step === 'phone' ? (
              <VStack spacing={4}>
                <Text>
                  Add an extra layer of security to your account by enabling Multi-Factor Authentication.
                </Text>
                
                <Box width="100%">
                  <Text mb={2}>Phone Number</Text>
                  <Input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter your phone number (with country code)"
                  />
                </Box>
                
                <Box id="recaptcha-container" width="100%" />
                
                <Button
                  width="100%"
                  colorScheme="blue"
                  onClick={sendVerificationCode}
                  isLoading={isLoading}
                  isDisabled={!phoneNumber}
                >
                  Send Verification Code
                </Button>
              </VStack>
            ) : (
              <VStack spacing={4}>
                <Text>
                  Enter the verification code sent to {phoneNumber}
                </Text>
                
                <HStack>
                  <PinInput onChange={setVerificationCode}>
                    <PinInputField />
                    <PinInputField />
                    <PinInputField />
                    <PinInputField />
                    <PinInputField />
                    <PinInputField />
                  </PinInput>
                </HStack>
                
                <Button
                  width="100%"
                  colorScheme="blue"
                  onClick={verifyAndEnrollMFA}
                  isLoading={isLoading}
                  isDisabled={verificationCode.length !== 6}
                >
                  Verify and Enable MFA
                </Button>
                
                <Button
                  width="100%"
                  variant="ghost"
                  onClick={() => setStep('phone')}
                >
                  Back to Phone Entry
                </Button>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default MFASetup; 