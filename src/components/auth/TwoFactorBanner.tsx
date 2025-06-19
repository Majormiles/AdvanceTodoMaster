import React, { useState, useEffect } from 'react';
import {
  Box,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  CloseButton,
  useDisclosure,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { get2FASettings } from '../../services/twoFactorService';

const TwoFactorBanner: React.FC = () => {
  const { currentUser } = useAuth();
  const { isOpen, onClose } = useDisclosure({ defaultIsOpen: true });
  const [show2FABanner, setShow2FABanner] = useState<boolean>(false);
  
  useEffect(() => {
    checkTwoFactorStatus();
  }, [currentUser]);
  
  const checkTwoFactorStatus = async () => {
    if (!currentUser?.uid) {
      setShow2FABanner(false);
      return;
    }
    
    try {
      const settings = await get2FASettings(currentUser.uid);
      setShow2FABanner(!settings.twofa_enabled);
    } catch (error) {
      console.error('Error checking 2FA status:', error);
      setShow2FABanner(false);
    }
  };
  
  if (!isOpen || !show2FABanner || !currentUser) {
    return null;
  }
  
  return (
    <Alert
      status="warning"
      variant="subtle"
      flexDirection="row"
      alignItems="center"
      justifyContent="space-between"
      textAlign="left"
      px={4}
      py={2}
      position="relative"
      width="100%"
      size="sm"
      fontSize="sm"
      bg="yellow.100"
      color="yellow.800"
    >
      <Box flex="1" display="flex" alignItems="center">
        <AlertIcon boxSize={4} />
        <AlertDescription display="inline" ml={2}>
          Two-factor authentication is not enabled. 
          <Button
            as={RouterLink}
            to="/settings"
            variant="link"
            colorScheme="yellow"
            size="sm"
            ml={2}
            fontWeight="bold"
          >
            Enable now
          </Button>
        </AlertDescription>
      </Box>
      <CloseButton size="sm" onClick={onClose} />
    </Alert>
  );
};

export default TwoFactorBanner; 