import React, { useState, useEffect } from 'react';
import { Box, VStack, Heading, Button, Text, Center } from '@chakra-ui/react';
import { FormControl, FormLabel } from '@chakra-ui/form-control';
import { Input } from '@chakra-ui/input';
import { Avatar } from '@chakra-ui/avatar';
import { useToast } from '@chakra-ui/toast';
import { Alert, AlertIcon } from '@chakra-ui/alert';
import { Divider } from '@chakra-ui/layout';
import { useAuth } from '../../contexts/AuthContext';
import MFASetup from '../MFASetup';

const Profile: React.FC = () => {
  const { currentUser, updateUserProfile, verifyEmail } = useAuth();
  const toast = useToast();
  
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  
  // Load current user data
  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || '');
      setPhotoURL(currentUser.photoURL || '');
    }
  }, [currentUser]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) return;
    
    try {
      setIsUpdating(true);
      await updateUserProfile(displayName, photoURL);
      
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: 'Update Failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleSendVerificationEmail = async () => {
    try {
      setIsSendingVerification(true);
      await verifyEmail();
      
      toast({
        title: 'Verification Email Sent',
        description: 'Please check your email inbox to verify your email address.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSendingVerification(false);
    }
  };
  
  if (!currentUser) {
    return (
      <Box p={4}>
        <Alert status="error">
          <AlertIcon />
          Please log in to view your profile.
        </Alert>
      </Box>
    );
  }
  
  return (
    <Box p={4} maxW="md" mx="auto">
      <VStack gap={8} align="stretch">
        <Heading size="lg">Your Profile</Heading>
        
        <Center flexDirection="column">
          <Avatar 
            size="2xl" 
            name={currentUser.displayName || undefined} 
            src={currentUser.photoURL || undefined}
            mb={4}
          />
          <Text fontWeight="bold" fontSize="xl">
            {currentUser.displayName || 'User'}
          </Text>
          <Text color="gray.500">
            {currentUser.email}
            {' '}
            {currentUser.emailVerified ? (
              <Text as="span" color="green.500">(Verified)</Text>
            ) : (
              <Text as="span" color="red.500">(Not Verified)</Text>
            )}
          </Text>
        </Center>
        
        {!currentUser.emailVerified && (
          <Button
            onClick={handleSendVerificationEmail}
            disabled={isSendingVerification}
            colorScheme="blue"
          >
            {isSendingVerification ? 'Sending...' : 'Send Verification Email'}
          </Button>
        )}
        
        <Divider />
        
        <form onSubmit={handleSubmit}>
          <VStack gap={4} align="stretch">
            <FormControl>
              <FormLabel>Display Name</FormLabel>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>Profile Photo URL</FormLabel>
              <Input
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                placeholder="Enter URL for profile photo"
              />
            </FormControl>
            
            <Button 
              type="submit" 
              colorScheme="blue" 
              disabled={isUpdating}
            >
              {isUpdating ? 'Updating...' : 'Update Profile'}
            </Button>
          </VStack>
        </form>
        
        <Divider />
        
        <Box>
          <Heading size="md" mb={4}>Security</Heading>
          <MFASetup />
        </Box>
      </VStack>
    </Box>
  );
};

export default Profile; 