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
  Link,
  useToast
} from '@chakra-ui/react';
import { useAuth } from '../../contexts/AuthContext';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const { register, googleSignIn } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  // Validation states
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const validateForm = () => {
    let isValid = true;
    
    // Reset errors
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    
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
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }
    
    // Confirm password validation
    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
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
      
      // Register the user
      await register(email, password);
      
      // Registration successful, verification email sent
      setVerificationSent(true);
      toast({
        title: "Account created successfully",
        description: "Please check your email to verify your account.",
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
      setIsSubmitting(false);
    }
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
  
  if (verificationSent) {
    return (
      <Box maxW="md" mx="auto" p={6} borderWidth={1} borderRadius="lg">
        <VStack gap={4}>
          <Heading size="lg">Verification Email Sent</Heading>
          <Alert status="success">
            <AlertIcon />
            A verification email has been sent to {email}. Please check your inbox and follow the instructions to verify your email.
          </Alert>
          <Text>
            Once verified, you can{' '}
            <Link as={RouterLink} to="/login" color="blue.500">
              log in
            </Link>
            {' '}to your account.
          </Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box maxW="md" mx="auto" p={6} borderWidth={1} borderRadius="lg">
      <VStack gap={6}>
        <Heading size="lg">Create an Account</Heading>
        
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

            <FormControl isInvalid={!!confirmPasswordError}>
              <FormLabel>Confirm Password</FormLabel>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {confirmPasswordError && <FormErrorMessage>{confirmPasswordError}</FormErrorMessage>}
            </FormControl>

            <Button 
              type="submit" 
              colorScheme="blue" 
              width="full"
              isLoading={isSubmitting}
              data-loading-text="Creating Account..."
            >
              Create Account
            </Button>
          </VStack>
        </form>

        <VStack width="100%" gap={4}>
          <Button 
            width="full" 
            onClick={handleGoogleSignIn}
            isLoading={isSubmitting}
            data-loading-text="Signing in..."
            leftIcon={<img src="/googleauth.png" alt="Google" style={{ width: '30px', height: '30px' }} />}
          >
            Sign up with Google
          </Button>
          
 
        </VStack>

        <Text>
          Already have an account?{" "}
          <Link as={RouterLink} to="/login" color="blue.500">
            Log in
          </Link>
        </Text>
      </VStack>
    </Box>
  );
};

export default Register; 