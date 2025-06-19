import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Spinner, Center, VStack, Text } from '@chakra-ui/react';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { currentUser, loading, requires2FA, pendingUser } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return (
      <Center h="100vh">
        <VStack spacing={4}>
          <Spinner 
            thickness="4px"
            speed="0.65s"
            emptyColor="gray.200"
            color="blue.500"
            size="xl"
          />
          <Text color="gray.600">Loading...</Text>
        </VStack>
      </Center>
    );
  }
  
  // If user needs 2FA verification
  if (requires2FA && pendingUser) {
    return <Navigate to="/2fa-verify" state={{ from: location }} replace />;
  }
  
  // If no user is logged in and no pending 2FA
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // User is fully authenticated, render protected content
  return <>{children}</>;
};

export default PrivateRoute; 