import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  VStack,
  FormErrorMessage,
  Alert,
  AlertIcon,
  Text
} from '@chakra-ui/react';

interface ShareTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: (email: string, permission: string) => Promise<void>;
  taskTitle: string;
}

const ShareTaskModal: React.FC<ShareTaskModalProps> = ({
  isOpen,
  onClose,
  onShare,
  taskTitle
}) => {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<string>('view');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Email validation
  const [emailError, setEmailError] = useState('');
  
  const validateEmail = () => {
    if (!email) {
      setEmailError('Email is required');
      return false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Email address is invalid');
      return false;
    }
    
    setEmailError('');
    return true;
  };
  
  const handleSubmit = async () => {
    if (!validateEmail()) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      await onShare(email, permission);
      
      // Show success state and reset form
      setSuccess(true);
      setEmail('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleClose = () => {
    onClose();
    // Reset form and state when modal closes
    setEmail('');
    setPermission('view');
    setError(null);
    setSuccess(false);
    setEmailError('');
  };
  
  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Share Task</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {success ? (
            <Alert status="success" mb={4}>
              <AlertIcon />
              Task successfully shared with {email}
            </Alert>
          ) : (
            <VStack spacing={4}>
              <Text>
                Share "{taskTitle}" with another user.
              </Text>
              
              {error && (
                <Alert status="error" mb={4}>
                  <AlertIcon />
                  {error}
                </Alert>
              )}
              
              <FormControl isInvalid={!!emailError}>
                <FormLabel>Email Address</FormLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter recipient's email"
                />
                {emailError && <FormErrorMessage>{emailError}</FormErrorMessage>}
              </FormControl>
              
              <FormControl>
                <FormLabel>Permission Level</FormLabel>
                <Select
                  value={permission}
                  onChange={(e) => setPermission(e.target.value)}
                >
                  <option value="view">View only</option>
                  <option value="edit">Can edit</option>
                  <option value="admin">Admin (full access)</option>
                </Select>
              </FormControl>
            </VStack>
          )}
        </ModalBody>

        <ModalFooter>
          {success ? (
            <Button colorScheme="blue" onClick={handleClose}>
              Close
            </Button>
          ) : (
            <>
              <Button
                colorScheme="blue"
                mr={3}
                onClick={handleSubmit}
                isLoading={isSubmitting}
              >
                Share
              </Button>
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ShareTaskModal; 