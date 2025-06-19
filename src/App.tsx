import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, Flex, ChakraProvider } from '@chakra-ui/react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Provider } from './components/ui/provider';

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
  const { currentUser } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <Flex direction="column" minH="100vh">
      {currentUser && <TwoFactorBanner />}
      <Header toggleSidebar={toggleSidebar} />
      <Box flex="1" mt={currentUser ? '72px' : 0}>
        <Routes>
          <Route path="/login" element={!currentUser ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="/register" element={!currentUser ? <Register /> : <Navigate to="/dashboard" />} />
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
          <Route path="/" element={<Navigate to={currentUser ? "/dashboard" : "/login"} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Box>
      <Footer />
    </Flex>
  );
};

export default App;
