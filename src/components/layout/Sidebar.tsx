import React from 'react';
import {
  Box,
  VStack,
  List,
  ListItem,
  Link,
  Text,
  Divider,
  Icon,
  useColorModeValue
} from '@chakra-ui/react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  FaHome,
  FaTasks,
  FaUser,
  FaCog,
  FaShare
} from 'react-icons/fa';

interface SidebarProps {
  isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const location = useLocation();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  const menuItems = [
    { name: 'Dashboard', icon: FaHome, path: '/dashboard' },
    { name: 'Tasks', icon: FaTasks, path: '/tasks' },
    { name: 'Shared Tasks', icon: FaShare, path: '/shared-tasks' },
    { name: 'Profile', icon: FaUser, path: '/profile' },
    { name: 'Settings', icon: FaCog, path: '/settings' }
  ];
  
  return (
    <Box
      position="fixed"
      left={isOpen ? 0 : { base: '-100%', md: '-250px' }}
      top="60px"
      h="calc(100vh - 60px)"
      w={{ base: '280px', md: '250px' }}
      bg={bgColor}
      borderRight="1px"
      borderRightColor={borderColor}
      pt={5}
      pb={10}
      overflowY="auto"
      zIndex={5}
      transition="left 0.3s ease"
      boxShadow={isOpen ? 'xl' : 'none'}
    >
      <VStack spacing={4}>
        <Text fontSize="xl" fontWeight="bold" mb={2}>
          Task Master
        </Text>
        <Divider />
        <List spacing={2} width="100%" px={4}>
          {menuItems.map((item) => (
            <ListItem key={item.name}>
              <Link
                as={RouterLink}
                to={item.path}
                display="flex"
                alignItems="center"
                p={3}
                borderRadius="md"
                fontWeight="medium"
                bg={location.pathname === item.path ? 'blue.500' : 'transparent'}
                color={location.pathname === item.path ? 'white' : 'inherit'}
                _hover={{
                  textDecoration: 'none',
                  bg: location.pathname === item.path ? 'blue.600' : 'gray.100',
                }}
              >
                <Icon as={item.icon} mr={3} />
                <Text>{item.name}</Text>
              </Link>
            </ListItem>
          ))}
        </List>
      </VStack>
    </Box>
  );
};

export default Sidebar; 