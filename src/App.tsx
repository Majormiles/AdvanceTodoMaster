import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, Flex } from '@chakra-ui/react';
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
import PrivateRoute from './components/PrivateRoute';
import Profile from './components/auth/Profile';
import Settings from './components/auth/Settings';

function App() {
  return (
    <Provider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </Provider>
  );
}

const AppContent = () => {
  const { currentUser } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <Header toggleSidebar={toggleSidebar} />
      <Flex flex="1">
        {/* Sidebar will be implemented later */}
        <Box
          flex="1"
          ml={0}
          transition="margin-left 0.3s"
          p={4}
        >
          <Routes>
            <Route path="/login" element={currentUser ? <Navigate to="/tasks" /> : <Login />} />
            <Route path="/register" element={currentUser ? <Navigate to="/tasks" /> : <Register />} />
            <Route path="/" element={<Navigate to={currentUser ? "/tasks" : "/login"} />} />
            
            {/* Protected Routes */}
            <Route path="/tasks" element={
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
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Box>
      </Flex>
      <Footer />
    </Box>
  );
};

export default App;
