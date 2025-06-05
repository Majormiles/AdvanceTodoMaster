import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, Flex } from '@chakra-ui/react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Provider } from './components/ui/provider';

// Components
import Header from './components/layout/Header';
// Components to be implemented
import TaskList from './components/tasks/TaskList';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import NotFound from './components/NotFound';
import PrivateRoute from './components/PrivateRoute';

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
    <Box minH="100vh">
      <Header toggleSidebar={toggleSidebar} />
      <Flex>
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
            
            {/* Dashboard will be implemented later */}
            
            <Route path="/tasks" element={
              <PrivateRoute>
                <TaskList />
              </PrivateRoute>
            } />
            
            {/* Profile will be implemented later */}
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Box>
      </Flex>
    </Box>
  );
};

export default App;
