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
  useDisclosure
} from '@chakra-ui/react';
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
  const { login, googleSignIn, resetPassword } = useAuth();
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

  const validateResetEmail = () => {
    if (!resetEmail) {
      setResetEmailError('Email is required');
      return false;
    } else if (!/\S+@\S+\.\S+/.test(resetEmail)) {
      setResetEmailError('Email address is invalid');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setError(null);
      setIsSubmitting(true);
      
      await login(email, password);
      navigate('/dashboard');
      toast({
        title: "Welcome back!",
        description: "Successfully logged in.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error",
        description: err.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!validateResetEmail()) return;
    
    try {
      setError(null);
      setIsResetting(true);
      
      await resetPassword(resetEmail);
      setResetSuccess(true);
      toast({
        title: "Reset link sent",
        description: "Please check your email for password reset instructions.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error",
        description: err.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetModalClose = () => {
    setResetSuccess(false);
    setResetEmail('');
    setResetEmailError('');
    setError(null);
    onClose();
  };

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      setIsSubmitting(true);
      
      await googleSignIn();
      navigate('/dashboard');
      toast({
        title: "Welcome!",
        description: "Successfully signed in with Google.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error",
        description: err.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box 
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={4}
    >
      <Box 
        maxW="md" 
        w="full"
        p={6} 
        borderWidth={1} 
        borderRadius="lg"
      >
        <VStack gap={6}>
          <Heading size="lg">Log In</Heading>
          
          {error && (
            <Alert status="error">
              <AlertIcon />
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <VStack gap={4} align="flex-start" width="100%">
              <FormControl isInvalid={!!emailError}>
                <FormLabel>Email Address</FormLabel>
                <Input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {emailError && <FormErrorMessage>{emailError}</FormErrorMessage>}
              </FormControl>

              <FormControl isInvalid={!!passwordError}>
                <FormLabel>Password</FormLabel>
                <InputGroup>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <InputRightElement width="4.5rem">
                    <Button
                      h="1.75rem"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </Button>
                  </InputRightElement>
                </InputGroup>
                {passwordError && <FormErrorMessage>{passwordError}</FormErrorMessage>}
              </FormControl>

              <Link 
                alignSelf="flex-end" 
                color="blue.500" 
                fontSize="sm"
                onClick={onOpen}
                cursor="pointer"
              >
                Forgot Password?
              </Link>

              <Button 
                type="submit" 
                colorScheme="blue" 
                width="full"
                isLoading={isSubmitting}
                data-loading-text="Logging in..."
              >
                Log In
              </Button>
            </VStack>
          </form>

          <VStack width="100%" gap={4}>
            <Button 
              width="full" 
              onClick={handleGoogleSignIn}
              isLoading={isSubmitting}
              data-loading-text="Signing in..."
              leftIcon={<img src="/googleauth.png" alt="Google" style={{ width: '20px', height: '20px' }} />}
            >
              Sign in with Google
            </Button>
            
   
          </VStack>

          <Text>
            Don't have an account?{" "}
            <Link as={RouterLink} to="/register" color="blue.500">
              Sign up
            </Link>
          </Text>

          <Modal isOpen={isOpen} onClose={handleResetModalClose}>
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>Reset Password</ModalHeader>
              <ModalBody>
                {error && (
                  <Alert status="error">
                    <AlertIcon />
                    {error}
                  </Alert>
                )}

                {resetSuccess ? (
                  <Alert status="success">
                    <AlertIcon />
                    Password reset instructions have been sent to your email.
                  </Alert>
                ) : (
                  <FormControl isInvalid={!!resetEmailError}>
                    <FormLabel>Email Address</FormLabel>
                    <Input 
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                    />
                    {resetEmailError && <FormErrorMessage>{resetEmailError}</FormErrorMessage>}
                  </FormControl>
                )}
              </ModalBody>

              <ModalFooter>
                <Button onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  colorScheme="blue"
                  onClick={handleResetPassword}
                  isLoading={isResetting}
                  data-loading-text="Sending..."
                  disabled={resetSuccess}
                >
                  {resetSuccess ? 'Done' : 'Reset Password'}
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </VStack>
      </Box>
    </Box>
  );
};

export default Login; 