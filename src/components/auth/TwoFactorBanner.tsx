import React, { useState, useEffect } from 'react';
import {
  Box,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  useDisclosure,
  HStack,
  Icon,
  Text,
  VStack,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FaShieldAlt, FaEnvelope, FaTimes } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { get2FASettings } from '../../services/twoFactorService';

const TwoFactorBanner: React.FC = () => {
  const { currentUser } = useAuth();
  const { isOpen, onClose } = useDisclosure({ defaultIsOpen: true });
  const [show2FABanner, setShow2FABanner] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  
  useEffect(() => {
    console.log('🔧 TwoFactorBanner: Effect triggered, current user:', currentUser?.uid);
    checkTwoFactorStatus();
    
    // Check if user has dismissed the banner in this session
    const dismissed = sessionStorage.getItem('2fa_banner_dismissed');
    if (dismissed) {
      console.log('🔧 TwoFactorBanner: Banner was previously dismissed in this session');
      setIsDismissed(true);
    } else {
      console.log('🔧 TwoFactorBanner: No previous dismissal found');
      setIsDismissed(false);
    }
  }, [currentUser]);

  // Add an interval to periodically check 2FA status
  useEffect(() => {
    if (!currentUser?.uid) return;

    // Check every 10 seconds for 2FA status changes (more frequent for immediate response)
    const interval = setInterval(() => {
      console.log('🔧 TwoFactorBanner: Periodic 2FA status check');
      checkTwoFactorStatus();
    }, 10000);

    return () => clearInterval(interval);
  }, [currentUser]);

  // Listen for custom events that indicate 2FA status changed
  useEffect(() => {
    const handle2FAEnabled = () => {
      console.log('🔧 TwoFactorBanner: 2FA enabled event received - hiding banner immediately');
      setShow2FABanner(false);
      setIsDismissed(false);
      sessionStorage.removeItem('2fa_banner_dismissed');
    };

    const handle2FADisabled = () => {
      console.log('🔧 TwoFactorBanner: 2FA disabled event received - showing banner');
      setShow2FABanner(true);
      setIsDismissed(false);
      sessionStorage.removeItem('2fa_banner_dismissed');
    };

    // Also listen for a more immediate trigger
    const handle2FAStatusChange = () => {
      console.log('🔧 TwoFactorBanner: 2FA status change event - rechecking immediately');
      checkTwoFactorStatus();
    };

    window.addEventListener('2fa-enabled', handle2FAEnabled);
    window.addEventListener('2fa-disabled', handle2FADisabled);
    window.addEventListener('2fa-status-changed', handle2FAStatusChange);

    return () => {
      window.removeEventListener('2fa-enabled', handle2FAEnabled);
      window.removeEventListener('2fa-disabled', handle2FADisabled);
      window.removeEventListener('2fa-status-changed', handle2FAStatusChange);
    };
  }, []);
  
  const checkTwoFactorStatus = async () => {
    if (!currentUser?.uid) {
      console.log('🔧 TwoFactorBanner: No current user, hiding banner');
      setShow2FABanner(false);
      return;
    }
    
    try {
      console.log('🔧 TwoFactorBanner: Fetching 2FA settings for user:', currentUser.uid);
      const settings = await get2FASettings(currentUser.uid);
      const shouldShow = !settings.twofa_enabled;
      
      console.log('🔧 TwoFactorBanner: Complete 2FA Status Check:', {
        user: currentUser.uid,
        fullSettings: settings,
        twofa_enabled: settings.twofa_enabled,
        twofa_method: settings.twofa_method,
        shouldShowBanner: shouldShow,
        timestamp: new Date().toISOString()
      });
      
      setShow2FABanner(shouldShow);
      
      // If 2FA is enabled, ensure banner is dismissed
      if (settings.twofa_enabled) {
        console.log('🔧 TwoFactorBanner: 2FA is enabled, ensuring banner is hidden');
        setIsDismissed(false); // Don't auto-dismiss, just hide based on 2FA status
      }
    } catch (error) {
      console.error('❌ TwoFactorBanner: Error checking 2FA status:', error);
      // Show banner by default if we can't check status
      console.log('🔧 TwoFactorBanner: Error checking status, showing banner by default');
      setShow2FABanner(true);
    }
  };

  const handleDismiss = () => {
    console.log('🔧 TwoFactorBanner: Banner dismissed by user');
    setIsDismissed(true);
    sessionStorage.setItem('2fa_banner_dismissed', 'true');
    onClose();
  };


  
  // Debug logging
  console.log('🔧 TwoFactorBanner: Render conditions:', {
    isOpen,
    show2FABanner,
    currentUser: !!currentUser,
    isDismissed,
    finalDecision: isOpen && show2FABanner && currentUser && !isDismissed
  });
  
  if (!isOpen || !show2FABanner || !currentUser || isDismissed) {
    return null;
  }

  return (
    <Box 
      position="fixed" 
      top="0" 
      left="0" 
      right="0" 
      zIndex="1000" 
      bg="orange.400"
      boxShadow="sm"
    >
      <Alert 
        status="warning" 
        bg="orange.400" 
        color="white" 
        borderRadius="none" 
        py={{ base: 2, md: 3 }}
        px={{ base: 3, md: 4 }}
        minH="60px"
      >
        <AlertIcon color="white" boxSize={{ base: 4, md: 5 }} />
        <Box flex="1" overflow="hidden">
          <HStack 
            spacing={{ base: 2, md: 4 }} 
            align="center" 
            wrap={{ base: "wrap", lg: "nowrap" }}
            justify="space-between"
          >
            <VStack 
              align="start" 
              spacing={0} 
              flex="1" 
              minW={{ base: "200px", md: "250px" }}
            >
              <AlertTitle 
                fontSize={{ base: "sm", md: "md" }} 
                color="white"
                mb={1}
              >
                <HStack spacing={2}>
                  <Icon as={FaShieldAlt} boxSize={{ base: 3, md: 4 }} />
                  <Text>Secure Your Account</Text>
                </HStack>
              </AlertTitle>
              <AlertDescription 
                fontSize={{ base: "xs", md: "sm" }} 
                color="orange.50"
                lineHeight="tight"
                display={{ base: "none", md: "block" }}
              >
                Enable email-based two-factor authentication to protect your account.
              </AlertDescription>
              <AlertDescription 
                fontSize="xs" 
                color="orange.50"
                lineHeight="tight"
                display={{ base: "block", md: "none" }}
              >
                Enable 2FA to secure your account
              </AlertDescription>
            </VStack>
            
            <HStack 
              spacing={{ base: 2, md: 3 }}
              flexShrink={0}
            >
              <Button
                as={RouterLink}
                to="/2fa-setup"
                size={{ base: "xs", md: "sm" }}
                colorScheme="orange"
                variant="solid"
                bg="orange.600"
                _hover={{ bg: "orange.700" }}
                leftIcon={<FaEnvelope />}
                fontWeight="medium"
                fontSize={{ base: "xs", md: "sm" }}
              >
                <Text display={{ base: "none", sm: "block" }}>Set Up Email 2FA</Text>
                <Text display={{ base: "block", sm: "none" }}>Setup</Text>
              </Button>
              
              <Button
                size={{ base: "xs", md: "sm" }}
                variant="ghost"
                color="white"
                _hover={{ bg: "orange.500" }}
                onClick={handleDismiss}
                fontSize={{ base: "xs", md: "sm" }}
                px={{ base: 2, md: 4 }}
              >
                <Icon as={FaTimes} />
                <Text ml={1} display={{ base: "none", md: "inline" }}>Dismiss</Text>
              </Button>
            </HStack>
          </HStack>
        </Box>
      </Alert>
    </Box>
  );
};

export default TwoFactorBanner; 