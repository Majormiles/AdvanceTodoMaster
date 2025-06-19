import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  VStack,
  Heading,
  Text,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  InputGroup,
  InputRightElement,
  Button,
  Alert,
  AlertIcon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Link,
  useToast,
  useDisclosure,
  HStack,
  Icon,
  Divider,
} from '@chakra-ui/react';
import { FaEye, FaEyeSlash, FaGoogle, FaFacebook, FaEnvelope } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const { login, googleSignIn, facebookSignIn, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  // Validation states
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [resetEmailError, setResetEmailError] = useState('');

  const validateForm = () => {
    let isValid = true;
    
    // Reset errors
    setEmailError('');
    setPasswordError('');
    
    // Email validation
    if (!email) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Email address is invalid');
      isValid = false;
    }
    
    // Password validation
    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    }
    
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setError(null);
      setIsSubmitting(true);
      
      // Attempt to log in
      const result = await login(email, password);
      
      if (result.requires2FA) {
        // User needs 2FA verification - redirect to 2FA page
        toast({
          title: 'Verification Required',
          description: 'Please check your email for a verification code',
          status: 'info',
          duration: 5000,
          isClosable: true,
        });
        navigate('/2fa-verify');
      } else {
        // Login successful without 2FA
        toast({
          title: 'Welcome back!',
          description: 'Successfully logged in.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      let errorMessage = err.message;
      
      // Handle specific Firebase error codes
      if (err.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      } else if (err.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled. Please contact support.';
      } else if (err.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      }
      
      setError(errorMessage);
      toast({
        title: 'Login Failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      const result = await googleSignIn();
      
      if (result.requires2FA) {
        toast({
          title: 'Verification Required',
          description: 'Please check your email for a verification code',
          status: 'info',
          duration: 5000,
          isClosable: true,
        });
        navigate('/2fa-verify');
      } else {
        toast({
          title: 'Welcome back!',
          description: 'Successfully logged in with Google.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      let errorMessage = err.message || 'Failed to sign in with Google. Please try again.';
      
      // Use the improved error messages from AuthContext
      if (err.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in was cancelled. Please try again.';
      } else if (err.code === 'auth/popup-blocked') {
        errorMessage = 'Popup was blocked. Please allow popups for this site and try again.';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      }
      
      setError(errorMessage);
      toast({
        title: 'Google Sign-In Failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleFacebookSignIn = async () => {
    try {
      setError(null);
      await facebookSignIn();
      
      toast({
        title: 'Welcome back!',
        description: 'Successfully logged in with Facebook.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Facebook sign-in error:', err);
      setError('Failed to sign in with Facebook. Please try again.');
      toast({
        title: 'Facebook Sign-In Failed',
        description: 'Failed to sign in with Facebook. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const validateResetEmail = () => {
    setResetEmailError('');
    
    if (!resetEmail) {
      setResetEmailError('Please enter your email address');
      return false;
    } else if (!/\S+@\S+\.\S+/.test(resetEmail)) {
      setResetEmailError('Please enter a valid email address');
      return false;
    }
    
    return true;
  };

  const handleResetPassword = async () => {
    if (!validateResetEmail()) return;

    try {
      setIsResetting(true);
      setResetEmailError('');
      
      await resetPassword(resetEmail);
      setResetSuccess(true);
      
      toast({
        title: 'Reset Email Sent',
        description: 'Check your email for password reset instructions.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Close modal after successful reset
      setTimeout(() => {
        onClose();
        setResetSuccess(false);
        setResetEmail('');
      }, 2000);
    } catch (err: any) {
      console.error('Password reset error:', err);
      let errorMessage = err.message;
      
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many reset requests. Please try again later.';
      }
      
      setResetEmailError(errorMessage);
      toast({
        title: 'Reset Failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleModalClose = () => {
    onClose();
    setResetEmail('');
    setResetEmailError('');
    setResetSuccess(false);
  };

  return (
    <Box maxW="md" mx="auto" p={6} bg="white" borderRadius="lg" boxShadow="md">
      <VStack spacing={8} align="stretch">
        <VStack spacing={2}>
          <Heading size="xl" textAlign="center" color="blue.600">
            Welcome Back
          </Heading>
          <Text color="gray.600" textAlign="center">
            Sign in to your account to continue
          </Text>
        </VStack>
        
        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}
        
        <form onSubmit={handleSubmit}>
          <VStack spacing={4}>
            <FormControl isInvalid={!!emailError}>
              <FormLabel>Email Address</FormLabel>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                size="lg"
              />
              {emailError && <FormErrorMessage>{emailError}</FormErrorMessage>}
            </FormControl>

            <FormControl isInvalid={!!passwordError}>
              <FormLabel>Password</FormLabel>
              <InputGroup size="lg">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />
                <InputRightElement width="3rem">
                  <Button
                    h="1.75rem"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    variant="ghost"
                  >
                    <Icon as={showPassword ? FaEyeSlash : FaEye} />
                  </Button>
                </InputRightElement>
              </InputGroup>
              {passwordError && <FormErrorMessage>{passwordError}</FormErrorMessage>}
            </FormControl>

            <Button
              type="submit"
              colorScheme="blue"
              width="full"
              size="lg"
              isLoading={isSubmitting}
              loadingText="Signing in..."
            >
              Sign In
            </Button>
          </VStack>
        </form>

        <VStack spacing={3}>
          <Text fontSize="sm" color="gray.500">
            Forgot your password?{' '}
            <Link color="blue.500" onClick={onOpen} cursor="pointer">
              Reset it here
            </Link>
          </Text>
        </VStack>

        <VStack spacing={3}>
          <HStack width="full">
            <Divider />
            <Text fontSize="sm" color="gray.500" px={3}>
              Or continue with
            </Text>
            <Divider />
          </HStack>

          <HStack spacing={3} width="full">
            <Button
              variant="outline"
              width="full"
              leftIcon={<Icon as={FaGoogle} color="red.500" />}
              onClick={handleGoogleSignIn}
              isDisabled={isSubmitting}
            >
              Google
            </Button>
            <Button
              variant="outline"
              width="full"
              leftIcon={<Icon as={FaFacebook} color="blue.600" />}
              onClick={handleFacebookSignIn}
              isDisabled={isSubmitting}
            >
              Facebook
            </Button>
          </HStack>
        </VStack>

        <Text textAlign="center" fontSize="sm" color="gray.600">
          Don't have an account?{' '}
          <Link as={RouterLink} to="/register" color="blue.500">
            Sign up here
          </Link>
        </Text>
      </VStack>

      {/* Password Reset Modal */}
      <Modal isOpen={isOpen} onClose={handleModalClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack>
              <Icon as={FaEnvelope} color="blue.500" />
              <Text>Reset Password</Text>
            </HStack>
          </ModalHeader>
          <ModalBody>
            {resetSuccess ? (
              <Alert status="success" borderRadius="md">
                <AlertIcon />
                <VStack align="start" spacing={1}>
                  <Text fontWeight="medium">Email Sent Successfully!</Text>
                  <Text fontSize="sm">
                    Check your inbox for password reset instructions.
                  </Text>
                </VStack>
              </Alert>
            ) : (
              <VStack spacing={4} align="stretch">
                <Text color="gray.600">
                  Enter your email address and we'll send you a link to reset your password.
                </Text>
                <FormControl isInvalid={!!resetEmailError}>
                  <FormLabel>Email Address</FormLabel>
                  <Input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter your email address"
                  />
                  {resetEmailError && <FormErrorMessage>{resetEmailError}</FormErrorMessage>}
                </FormControl>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            {!resetSuccess && (
              <HStack spacing={3}>
                <Button variant="ghost" onClick={handleModalClose}>
                  Cancel
                </Button>
                <Button
                  colorScheme="blue"
                  onClick={handleResetPassword}
                  isLoading={isResetting}
                  loadingText="Sending..."
                >
                  Send Reset Email
                </Button>
              </HStack>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Login; 