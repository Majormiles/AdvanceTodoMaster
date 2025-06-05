import React, { useState, useEffect } from 'react';
import { 
  Box, 
  VStack, 
  HStack,
  Heading, 
  Button, 
  Text, 
  Center,
  Grid,
  GridItem,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Icon,
  Flex,
  Spacer,
} from '@chakra-ui/react';
import { FormControl, FormLabel } from '@chakra-ui/form-control';
import { Input } from '@chakra-ui/input';
import { Avatar } from '@chakra-ui/avatar';
import { useToast } from '@chakra-ui/toast';
import { Alert, AlertIcon } from '@chakra-ui/alert';
import { Divider } from '@chakra-ui/layout';
import { FaUser, FaEnvelope, FaCalendar, FaClock, FaEdit, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';

const Profile: React.FC = () => {
  const { currentUser, updateUserProfile, verifyEmail } = useAuth();
  const toast = useToast();
  
  const [displayName, setDisplayName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  
  // Load current user data
  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || '');
    }
  }, [currentUser]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) return;
    
    try {
      setIsUpdating(true);
      await updateUserProfile(displayName);
      
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
      <Box p={8} display="flex" justifyContent="center">
        <Alert status="error" maxW="md">
          <AlertIcon />
          Please log in to view your profile.
        </Alert>
      </Box>
    );
  }
  
  return (
    <Box maxW="6xl" mx="auto" p={6}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Box textAlign="center" py={4}>
          <Heading size="xl" mb={2}>My Profile</Heading>
          <Text color="gray.600">Manage your personal information and account details</Text>
        </Box>

        {/* Profile Overview Card */}
        <Card>
          <CardBody p={8}>
            <Grid templateColumns={{ base: "1fr", md: "auto 1fr" }} gap={8} alignItems="center">
              <GridItem>
                <Center>
                  <Avatar 
                    size="2xl" 
                    name={currentUser.displayName || undefined} 
                    src={currentUser.photoURL || undefined}
                    borderWidth={4}
                    borderColor="blue.100"
                  />
                </Center>
              </GridItem>
              
              <GridItem>
                <VStack align={{ base: "center", md: "start" }} spacing={3}>
                  <Flex align="center" gap={3} flexWrap="wrap">
                    <Heading size="lg" color="gray.800">
                      {currentUser.displayName || 'User'}
                    </Heading>
                    {currentUser.emailVerified ? (
                      <Badge colorScheme="green" variant="subtle" display="flex" alignItems="center" gap={1}>
                        <Icon as={FaCheckCircle} boxSize={3} />
                        Verified
                      </Badge>
                    ) : (
                      <Badge colorScheme="red" variant="subtle" display="flex" alignItems="center" gap={1}>
                        <Icon as={FaExclamationCircle} boxSize={3} />
                        Unverified
                      </Badge>
                    )}
                  </Flex>
                  
                  <HStack spacing={2} color="gray.600">
                    <Icon as={FaEnvelope} />
                    <Text>{currentUser.email}</Text>
                  </HStack>
                  
                  {!currentUser.emailVerified && (
                    <Button
                      onClick={handleSendVerificationEmail}
                      isLoading={isSendingVerification}
                      loadingText="Sending..."
                      colorScheme="blue"
                      variant="outline"
                      size="sm"
                      leftIcon={<Icon as={FaEnvelope} />}
                    >
                      Send Verification Email
                    </Button>
                  )}
                </VStack>
              </GridItem>
            </Grid>
          </CardBody>
        </Card>

        {/* Main Grid Layout */}
        <Grid 
          templateColumns={{ base: "1fr", lg: "1fr 1fr" }} 
          gap={8}
          alignItems="start"
        >
          {/* Account Statistics */}
          <GridItem>
            <Card h="full">
              <CardHeader>
                <HStack spacing={3}>
                  <Icon as={FaCalendar} color="purple.500" boxSize={5} />
                  <Heading size="md">Account Information</Heading>
                </HStack>
              </CardHeader>
              <CardBody>
                <Grid templateColumns="1fr" gap={6}>
                  <Box>
                    <Stat>
                      <StatLabel display="flex" alignItems="center" gap={2}>
                        <Icon as={FaCalendar} color="gray.500" boxSize={4} />
                        Account Created
                      </StatLabel>
                      <StatNumber fontSize="lg">
                        {currentUser.metadata.creationTime ? 
                          new Date(currentUser.metadata.creationTime).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) :
                          'N/A'
                        }
                      </StatNumber>
                      <StatHelpText>Member since</StatHelpText>
                    </Stat>
                  </Box>
                  
                  <Divider />
                  
                  <Box>
                    <Stat>
                      <StatLabel display="flex" alignItems="center" gap={2}>
                        <Icon as={FaClock} color="gray.500" boxSize={4} />
                        Last Sign In
                      </StatLabel>
                      <StatNumber fontSize="lg">
                        {currentUser.metadata.lastSignInTime ?
                          new Date(currentUser.metadata.lastSignInTime).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) :
                          'N/A'
                        }
                      </StatNumber>
                      <StatHelpText>Most recent activity</StatHelpText>
                    </Stat>
                  </Box>
                </Grid>
              </CardBody>
            </Card>
          </GridItem>

          {/* Edit Profile */}
          <GridItem>
            <Card h="full">
              <CardHeader>
                <HStack spacing={3}>
                  <Icon as={FaEdit} color="blue.500" boxSize={5} />
                  <Heading size="md">Edit Profile</Heading>
                </HStack>
              </CardHeader>
              <CardBody>
                <form onSubmit={handleSubmit}>
                  <VStack spacing={6} align="stretch">
                    <Box>
                      <Text fontSize="sm" color="gray.600" mb={4}>
                        Update your display name and other profile information
                      </Text>
                      
                      <FormControl>
                        <FormLabel display="flex" alignItems="center" gap={2}>
                          <Icon as={FaUser} color="gray.500" boxSize={4} />
                          Display Name
                        </FormLabel>
                        <Input
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Enter your display name"
                          focusBorderColor="blue.400"
                        />
                      </FormControl>
                    </Box>
                    
                    <Box pt={4}>
                      <Button 
                        type="submit" 
                        colorScheme="blue" 
                        isLoading={isUpdating}
                        loadingText="Updating..."
                        width="full"
                        leftIcon={<Icon as={FaEdit} />}
                      >
                        Update Profile
                      </Button>
                    </Box>
                  </VStack>
                </form>
              </CardBody>
            </Card>
          </GridItem>
        </Grid>

        {/* Additional Information */}
        <Card bg="gray.50" borderColor="gray.200">
          <CardBody>
            <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={6} textAlign="center">
              <Box>
                <Icon as={FaUser} boxSize={8} color="blue.500" mb={2} />
                <Text fontWeight="semibold" mb={1}>Profile Completion</Text>
                <Text fontSize="sm" color="gray.600">
                  {currentUser.displayName && currentUser.emailVerified ? 'Complete' : 'Incomplete'}
                </Text>
              </Box>
              
              <Box>
                <Icon as={FaCheckCircle} boxSize={8} color={currentUser.emailVerified ? "green.500" : "gray.400"} mb={2} />
                <Text fontWeight="semibold" mb={1}>Email Status</Text>
                <Text fontSize="sm" color="gray.600">
                  {currentUser.emailVerified ? 'Verified' : 'Needs verification'}
                </Text>
              </Box>
              
              <Box>
                <Icon as={FaCalendar} boxSize={8} color="purple.500" mb={2} />
                <Text fontWeight="semibold" mb={1}>Account Age</Text>
                <Text fontSize="sm" color="gray.600">
                  {currentUser.metadata.creationTime ? 
                    `${Math.floor((Date.now() - new Date(currentUser.metadata.creationTime).getTime()) / (1000 * 60 * 60 * 24))} days` :
                    'N/A'
                  }
                </Text>
              </Box>
            </Grid>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
};

export default Profile;