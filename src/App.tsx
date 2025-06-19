import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, Flex, ChakraProvider, Spinner, Center } from '@chakra-ui/react';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Components
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
// Components to be implemented
import TaskList from './components/tasks/TaskList';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import NotFound from './components/NotFound';
import Profile from './components/auth/Profile';
import Settings from './components/auth/Settings';
import TwoFactorBanner from './components/auth/TwoFactorBanner';
import TwoFactorAuthPage from './pages/TwoFactorAuthPage';
import TwoFactorVerify from './components/auth/TwoFactorVerify';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <ChakraProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ChakraProvider>
  );
}

const AppContent = () => {
  const { currentUser, isLoading, requires2FA, pendingUser } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (isLoading) {
    return (
      <Center h="100vh">
        <Spinner
          thickness="4px"
          speed="0.65s"
          emptyColor="gray.200"
          color="blue.500"
          size="xl"
        />
      </Center>
    );
  }

  return (
    <Flex direction="column" minH="100vh">
      {currentUser && <TwoFactorBanner />}
      <Header toggleSidebar={toggleSidebar} />
      <Box flex="1" mt={currentUser ? '72px' : 0}>
        <Routes>
          {/* Public routes */}
          <Route 
            path="/login" 
            element={
              !currentUser && !requires2FA ? (
                <Login />
              ) : (
                <Navigate to={requires2FA ? "/2fa-verify" : "/dashboard"} replace />
              )
            } 
          />
          <Route 
            path="/register" 
            element={
              !currentUser && !requires2FA ? (
                <Register />
              ) : (
                <Navigate to={requires2FA ? "/2fa-verify" : "/dashboard"} replace />
              )
            } 
          />
          
          {/* 2FA verification route */}
          <Route 
            path="/2fa-verify" 
            element={
              requires2FA && pendingUser ? (
                <TwoFactorVerify />
              ) : currentUser ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={
            <PrivateRoute>
              <TaskList />
            </PrivateRoute>
          } />
          <Route path="/profile" element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          } />
          <Route path="/settings" element={
            <PrivateRoute>
              <Settings />
            </PrivateRoute>
          } />
          <Route path="/2fa-setup" element={
            <PrivateRoute>
              <TwoFactorAuthPage />
            </PrivateRoute>
          } />
          
          {/* Default redirects */}
          <Route 
            path="/" 
            element={
              <Navigate 
                to={
                  requires2FA 
                    ? "/2fa-verify" 
                    : currentUser 
                    ? "/dashboard" 
                    : "/login"
                } 
                replace 
              />
            } 
          />
          
          {/* 404 route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Box>
      <Footer />
    </Flex>
  );
};

export default App;
