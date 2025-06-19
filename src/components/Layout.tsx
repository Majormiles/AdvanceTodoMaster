import React from 'react';
import { Box, Container } from '@chakra-ui/react';
import Navbar from './Navbar';
import TwoFactorBanner from './auth/TwoFactorBanner';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <Box minH="100vh" bg="gray.50">
      <TwoFactorBanner />
      <Navbar />
      <Container maxW="container.xl" py={8}>
        {children}
      </Container>
    </Box>
  );
};

export default Layout; 