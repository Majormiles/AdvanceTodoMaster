import React, { useState } from 'react';
import { Box, Container } from '@chakra-ui/react';
import Header from './layout/Header';
import Sidebar from './layout/Sidebar';
import TwoFactorBanner from './auth/TwoFactorBanner';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { currentUser } = useAuth();

  const handleToggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <Box minH="100vh" bg="gray.50">
      <TwoFactorBanner />
      {/* Add top padding to account for fixed banner */}
      <Box pt="60px">
        <Header toggleSidebar={handleToggleSidebar} />
        
        {/* Render sidebar only for authenticated users */}
        {currentUser && (
          <Sidebar isOpen={isSidebarOpen} />
        )}
        
        {/* Main content area with conditional left margin for sidebar */}
        <Box
          ml={currentUser && isSidebarOpen ? { base: 0, md: '250px' } : 0}
          transition="margin-left 0.3s ease"
        >
          <Container maxW="container.xl" py={8}>
            {children}
          </Container>
        </Box>
        
        {/* Overlay for mobile sidebar */}
        {currentUser && isSidebarOpen && (
          <Box
            position="fixed"
            top="60px"
            left={0}
            w="100vw"
            h="calc(100vh - 60px)"
            bg="blackAlpha.600"
            zIndex={4}
            display={{ base: 'block', md: 'none' }}
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </Box>
    </Box>
  );
};

export default Layout; 