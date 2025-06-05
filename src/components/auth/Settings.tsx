import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Grid,
  GridItem,
  Heading,
  Button,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  useToast,
  Alert,
  AlertIcon,
  Icon,
  Divider,
  Text,
  Card,
  CardBody,
  CardHeader,
} from '@chakra-ui/react';
import { FaGoogle, FaTrash, FaKey, FaShieldAlt, FaLink } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, deleteUser } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';

const Settings: React.FC = () => {
  const { currentUser, googleSignIn } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  
  // Modal controls
  const { isOpen: isPasswordOpen, onOpen: onPasswordOpen, onClose: onPasswordClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  
  // Form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');

  const handlePasswordChange = async () => {
    if (!currentUser || !currentUser.email) return;
    
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'New passwords do not match',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        currentPassword
      );
      
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      
      toast({
        title: 'Success',
        description: 'Your password has been updated',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      onPasswordClose();
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleAccountDeletion = async () => {
    if (!currentUser || !currentUser.email) return;

    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        deletePassword
      );
      
      await reauthenticateWithCredential(currentUser, credential);
      
      // Delete user data from Firestore
      await deleteDoc(doc(db, 'users', currentUser.uid));
      
      // Delete user account
      await deleteUser(currentUser);
      
      navigate('/');
      
      toast({
        title: 'Account Deleted',
        description: 'Your account has been permanently deleted',
        status: 'info',
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
    }
  };

  const handleConnectGoogle = async () => {
    try {
      await googleSignIn();
      
      toast({
        title: 'Account Connected',
        description: 'Successfully connected your Google account',
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
    }
  };

  if (!currentUser) {
    return (
      <Box p={8} display="flex" justifyContent="center">
        <Alert status="error" maxW="md">
          <AlertIcon />
          Please log in to view settings.
        </Alert>
      </Box>
    );
  }

  return (
    <Box maxW="6xl" mx="auto" p={6}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Box textAlign="center" py={4}>
          <Heading size="xl" mb={2}>Account Settings</Heading>
          <Text color="gray.600">Manage your account preferences and security settings</Text>
        </Box>

        {/* Main Grid Layout */}
        <Grid 
          templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} 
          gap={8}
          alignItems="start"
        >
          {/* Security Settings */}
          <GridItem>
            <Card h="full">
              <CardHeader>
                <HStack spacing={3}>
                  <Icon as={FaShieldAlt} color="blue.500" boxSize={5} />
                  <Heading size="md">Security</Heading>
                </HStack>
              </CardHeader>
              <CardBody>
                <VStack spacing={4} align="stretch">
                  <Box>
                    <Text fontSize="sm" color="gray.600" mb={3}>
                      Keep your account secure by regularly updating your password
                    </Text>
                    <Button 
                      onClick={onPasswordOpen} 
                      colorScheme="blue" 
                      variant="outline"
                      leftIcon={<Icon as={FaKey} />}
                      width="full"
                      justifyContent="flex-start"
                    >
                      Change Password
                    </Button>
                  </Box>
                </VStack>
              </CardBody>
            </Card>
          </GridItem>

          {/* Connected Accounts */}
          <GridItem>
            <Card h="full">
              <CardHeader>
                <HStack spacing={3}>
                  <Icon as={FaLink} color="green.500" boxSize={5} />
                  <Heading size="md">Connected Accounts</Heading>
                </HStack>
              </CardHeader>
              <CardBody>
                <VStack spacing={4} align="stretch">
                  <Box>
                    <Text fontSize="sm" color="gray.600" mb={3}>
                      Link your social accounts for easier sign-in
                    </Text>
                    <Button
                      leftIcon={<Icon as={FaGoogle} />}
                      onClick={handleConnectGoogle}
                      colorScheme="red"
                      variant="outline"
                      width="full"
                      justifyContent="flex-start"
                    >
                      Connect Google Account
                    </Button>
                  </Box>
                </VStack>
              </CardBody>
            </Card>
          </GridItem>
        </Grid>

        {/* Danger Zone - Full Width */}
        <Box mt={8}>
          <Card borderColor="red.200" borderWidth={1}>
            <CardHeader bg="red.50">
              <HStack spacing={3}>
                <Icon as={FaTrash} color="red.500" boxSize={5} />
                <Heading size="md" color="red.600">Danger Zone</Heading>
              </HStack>
            </CardHeader>
            <CardBody>
              <Grid templateColumns={{ base: "1fr", md: "2fr 1fr" }} gap={4} alignItems="center">
                <Box>
                  <Text fontWeight="semibold" mb={1}>Delete Account</Text>
                  <Text fontSize="sm" color="gray.600">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </Text>
                </Box>
                <Box display="flex" justifyContent={{ base: "stretch", md: "flex-end" }}>
                  <Button
                    leftIcon={<Icon as={FaTrash} />}
                    onClick={onDeleteOpen}
                    colorScheme="red"
                    variant="outline"
                    size="md"
                    width={{ base: "full", md: "auto" }}
                  >
                    Delete Account
                  </Button>
                </Box>
              </Grid>
            </CardBody>
          </Card>
        </Box>
      </VStack>

      {/* Password Change Modal */}
      <Modal isOpen={isPasswordOpen} onClose={onPasswordClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Change Password</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Current Password</FormLabel>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                />
              </FormControl>
              <FormControl>
                <FormLabel>New Password</FormLabel>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Confirm New Password</FormLabel>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onPasswordClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handlePasswordChange}>
              Change Password
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Account Deletion Modal */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete Account</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Alert status="warning" mb={4}>
              <AlertIcon />
              This action cannot be undone. All your data will be permanently deleted.
            </Alert>
            <FormControl>
              <FormLabel>Enter your password to confirm</FormLabel>
              <Input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your password"
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onDeleteClose}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={handleAccountDeletion}>
              Delete Account
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Settings;