import { ChakraProvider, Spinner, Center } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Components
import TaskList from './components/tasks/TaskList';
import SharedTasks from './components/pages/SharedTasks';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import NotFound from './components/NotFound';
import Profile from './components/auth/Profile';
import Settings from './components/auth/Settings';
import TwoFactorAuthPage from './pages/TwoFactorAuthPage';
import TwoFactorVerify from './components/auth/TwoFactorVerify';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';

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
    <Layout>
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
        <Route path="/tasks" element={
          <PrivateRoute>
            <TaskList />
          </PrivateRoute>
        } />
        <Route path="/shared-tasks" element={
          <PrivateRoute>
            <SharedTasks />
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
    </Layout>
  );
};

export default App;
