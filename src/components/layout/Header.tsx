import React from 'react';
import { 
  Box, 
  Flex, 
  IconButton, 
  Heading, 
  Spacer,
  Button,
  Avatar,
  useColorModeValue,
  useColorMode,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import { 
  FaBars, 
  FaUser, 
  FaSignOutAlt, 
  FaCog,
  FaMoon,
  FaSun
} from 'react-icons/fa';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const { colorMode, toggleColorMode } = useColorMode();
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };
  
  return (
    <Box 
      as="header" 
      position="sticky" 
      top={0} 
      zIndex={10}
      bg={bgColor}
      borderBottom="1px"
      borderColor={borderColor}
      boxShadow="sm"
      width="100%"
    >
      <Flex 
        maxW="1200px"
        mx="auto"
        px={4}
        py={2}
        align="center"
        justify="space-between"
        width="100%"
      >
        {currentUser && (
          <IconButton
            aria-label="Menu"
            icon={<FaBars />}
            variant="ghost"
            onClick={toggleSidebar}
            mr={2}
          />
        )}
        
        <Heading size="md" as={RouterLink} to="/" _hover={{ textDecoration: 'none' }}>
          Task Master
        </Heading>
        
        <Spacer />
        
        <IconButton
          aria-label={colorMode === 'light' ? 'Dark Mode' : 'Light Mode'}
          icon={colorMode === 'light' ? <FaMoon /> : <FaSun />}
          variant="ghost"
          onClick={toggleColorMode}
          mr={2}
        />
        
        {currentUser ? (
          <Menu>
            <MenuButton 
              as={Button} 
              rounded="full" 
              variant="link" 
              cursor="pointer" 
              minW={0}
            >
              <Avatar 
                size="sm" 
                name={currentUser.displayName || undefined} 
                src={currentUser.photoURL || undefined} 
              />
            </MenuButton>
            <MenuList>
              <MenuItem 
                icon={<FaUser />} 
                as={RouterLink} 
                to="/profile"
              >
                Profile
              </MenuItem>
              <MenuItem 
                icon={<FaCog />} 
                as={RouterLink} 
                to="/settings"
              >
                Settings
              </MenuItem>
              <MenuItem 
                icon={<FaSignOutAlt />} 
                onClick={handleLogout}
              >
                Logout
              </MenuItem>
            </MenuList>
          </Menu>
        ) : (
          <Flex>
            <Button 
              as={RouterLink} 
              to="/login" 
              variant="ghost" 
              mr={2}
            >
              Login
            </Button>
            <Button 
              as={RouterLink} 
              to="/register" 
              colorScheme="blue"
            >
              Register
            </Button>
          </Flex>
        )}
      </Flex>
    </Box>
  );
};

export default Header; 