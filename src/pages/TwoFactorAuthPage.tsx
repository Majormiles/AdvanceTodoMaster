import React from 'react';
import { Box, Container } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import TwoFactorSetup from '../components/auth/TwoFactorSetup';

const TwoFactorAuthPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSetupComplete = () => {
    navigate('/settings');
  };

  return (
    <Container maxW="container.md" py={8}>
      <Box 
        bg="white" 
        borderRadius="lg" 
        boxShadow="md"
        p={6}
      >
        <TwoFactorSetup onComplete={handleSetupComplete} />
      </Box>
    </Container>
  );
};

export default TwoFactorAuthPage; 