import React from 'react';
import { Box, Container } from '@chakra-ui/react';
import Header from './layout/Header';
import TwoFactorBanner from './auth/TwoFactorBanner';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const handleToggleSidebar = () => {
    // Sidebar toggle functionality can be implemented when needed
    console.log('Toggle sidebar');
  };

  return (
    <Box minH="100vh" bg="gray.50">
      <TwoFactorBanner />
      {/* Add top padding to account for fixed banner */}
      <Box pt="60px">
        <Header toggleSidebar={handleToggleSidebar} />
        <Container maxW="container.xl" py={8}>
          {children}
        </Container>
      </Box>
    </Box>
  );
};

export default Layout; 