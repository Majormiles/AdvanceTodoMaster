import React, { useState, useEffect } from 'react';
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
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  useToast,
  Alert,
  AlertIcon,
  Icon,
  Text,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Badge,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
} from '@chakra-ui/react';
import { FaTrash, FaKey, FaShieldAlt, FaLock, FaUnlock } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, deleteUser } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { get2FASettings, disable2FA } from '../../services/twoFactorService';

const Settings: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(false);
  const [backupCodesRemaining, setBackupCodesRemaining] = useState<number>(0);
  const [lastUsed, setLastUsed] = useState<string | null>(null);
  
  // Modal states
  const {
    isOpen: isPasswordModalOpen,
    onOpen: onPasswordModalOpen,
    onClose: onPasswordModalClose
  } = useDisclosure();
  
  const {
    isOpen: isDeleteModalOpen,
    onOpen: onDeleteModalOpen,
    onClose: onDeleteModalClose
  } = useDisclosure();
  
  // Form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  
  useEffect(() => {
    loadTwoFactorSettings();
  }, [currentUser]);
  
  const loadTwoFactorSettings = async () => {
    if (!currentUser?.uid) return;
    
    try {
      const settings = await get2FASettings(currentUser.uid);
      setTwoFactorEnabled(settings.twofa_enabled);
      setBackupCodesRemaining(settings.twofa_backup_codes.length);
      setLastUsed(settings.twofa_last_used);
    } catch (error) {
      console.error('Error loading 2FA settings:', error);
    }
  };
  
  const handlePasswordChange = async () => {
    if (!currentUser || !currentUser.email) return;
    
    try {
      setIsLoading(true);
      
      // Validate new password
      if (newPassword !== confirmPassword) {
        throw new Error('New passwords do not match');
      }
      
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        currentPassword
      );
      await reauthenticateWithCredential(currentUser, credential);
      
      // Update password
      await updatePassword(currentUser, newPassword);
      
      onPasswordModalClose();
      toast({
        title: 'Password Updated',
        description: 'Your password has been successfully changed',
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
      setIsLoading(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };
  
  const handleAccountDeletion = async () => {
    if (!currentUser || !currentUser.email) return;
    
    try {
      setIsLoading(true);
      
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
    } finally {
      setIsLoading(false);
      setDeletePassword('');
    }
  };
  
  const handleDisable2FA = async () => {
    if (!currentUser?.uid) return;
    
    try {
      setIsLoading(true);
      await disable2FA(currentUser.uid);
      
      setTwoFactorEnabled(false);
      setBackupCodesRemaining(0);
      setLastUsed(null);
      
      toast({
        title: '2FA Disabled',
        description: 'Two-factor authentication has been disabled for your account',
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
    } finally {
      setIsLoading(false);
    }
  };
  
  // Commented out unused functions to prevent TypeScript errors
  // const handle2FASetupComplete = () => {
  //   loadTwoFactorSettings();
  //   
  //   toast({
  //     title: '2FA Enabled',
  //     description: 'Two-factor authentication has been enabled for your account',
  //     status: 'success',
  //     duration: 5000,
  //     isClosable: true,
  //   });
  // };
  // 
  // const handleConnectGoogle = async () => {
  //   try {
  //     await googleSignIn();
  //     
  //     toast({
  //       title: 'Account Connected',
  //       description: 'Successfully connected your Google account',
  //       status: 'success',
  //       duration: 5000,
  //       isClosable: true,
  //     });
  //   } catch (error: any) {
  //     toast({
  //       title: 'Error',
  //       status: 'error',
  //       duration: 5000,
  //       isClosable: true,
  //     });
  //   }
  // };

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
        <Heading size="xl">Account Settings</Heading>
        
        {/* Security Section */}
        <Card>
          <CardHeader>
            <Heading size="md">Security Settings</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={6} align="stretch">
              {/* Two-Factor Authentication */}
              <Box>
                <HStack justify="space-between" mb={4}>
                  <VStack align="start" spacing={1}>
                    <HStack>
                      <Icon as={FaShieldAlt} />
                      <Text fontWeight="bold">Two-Factor Authentication</Text>
                    </HStack>
                    <Text color="gray.600" fontSize="sm">
                      Add an extra layer of security to your account
                    </Text>
                  </VStack>
                  <Badge
                    colorScheme={twoFactorEnabled ? 'green' : 'red'}
                    variant="subtle"
                    px={3}
                    py={1}
                    borderRadius="full"
                  >
                    {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </HStack>
                
                {twoFactorEnabled ? (
                  <VStack align="stretch" spacing={4}>
                    <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                      <GridItem>
                        <Stat>
                          <StatLabel>Backup Codes Remaining</StatLabel>
                          <StatNumber>{backupCodesRemaining}</StatNumber>
                          <StatHelpText>
                            {backupCodesRemaining <= 2 && (
                              <Text color="red.500">Running low on backup codes!</Text>
                            )}
                          </StatHelpText>
                        </Stat>
                      </GridItem>
                      <GridItem>
                        <Stat>
                          <StatLabel>Last Used</StatLabel>
                          <StatNumber>
                            {lastUsed
                              ? new Date(lastUsed).toLocaleDateString()
                              : 'Never'}
                          </StatNumber>
                        </Stat>
                      </GridItem>
                    </Grid>
                    
                    <HStack spacing={4}>
                      <Button
                        leftIcon={<Icon as={FaUnlock} />}
                        colorScheme="red"
                        variant="outline"
                        onClick={handleDisable2FA}
                        isLoading={isLoading}
                      >
                        Disable 2FA
                      </Button>
                      <Button
                        leftIcon={<Icon as={FaKey} />}
                        onClick={() => navigate('/2fa-setup')}
                        isLoading={isLoading}
                      >
                        Generate New Backup Codes
                      </Button>
                    </HStack>
                  </VStack>
                ) : (
                  <Button
                    leftIcon={<Icon as={FaLock} />}
                    colorScheme="blue"
                    onClick={() => navigate('/2fa-setup')}
                    isLoading={isLoading}
                  >
                    Enable Two-Factor Authentication
                  </Button>
                )}
              </Box>
              
              <Divider />
              
              {/* Password Change */}
              <Box>
                <HStack justify="space-between">
                  <VStack align="start" spacing={1}>
                    <HStack>
                      <Icon as={FaKey} />
                      <Text fontWeight="bold">Password</Text>
                    </HStack>
                    <Text color="gray.600" fontSize="sm">
                      Change your account password
                    </Text>
                  </VStack>
                  <Button
                    onClick={onPasswordModalOpen}
                    variant="outline"
                  >
                    Change Password
                  </Button>
                </HStack>
              </Box>
              
              <Divider />
              
              {/* Account Deletion */}
              <Box>
                <HStack justify="space-between">
                  <VStack align="start" spacing={1}>
                    <HStack>
                      <Icon as={FaTrash} />
                      <Text fontWeight="bold">Delete Account</Text>
                    </HStack>
                    <Text color="gray.600" fontSize="sm">
                      Permanently delete your account and all data
                    </Text>
                  </VStack>
                  <Button
                    colorScheme="red"
                    variant="outline"
                    onClick={onDeleteModalOpen}
                  >
                    Delete Account
                  </Button>
                </HStack>
              </Box>
            </VStack>
          </CardBody>
        </Card>
        
        {/* Password Change Modal */}
        <Modal isOpen={isPasswordModalOpen} onClose={onPasswordModalClose}>
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
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>New Password</FormLabel>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Confirm New Password</FormLabel>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onPasswordModalClose}>
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                onClick={handlePasswordChange}
                isLoading={isLoading}
              >
                Change Password
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
        
        {/* Account Deletion Modal */}
        <Modal isOpen={isDeleteModalOpen} onClose={onDeleteModalClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Delete Account</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Alert status="error" mb={4}>
                <AlertIcon />
                This action cannot be undone. All your data will be permanently deleted.
              </Alert>
              <FormControl>
                <FormLabel>Enter your password to confirm</FormLabel>
                <Input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                />
              </FormControl>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onDeleteModalClose}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleAccountDeletion}
                isLoading={isLoading}
              >
                Delete Account
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </VStack>
    </Box>
  );
};

export default Settings;