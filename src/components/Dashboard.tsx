import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  VStack,
  HStack,
  Text,
  Badge,
  Flex,
  Spinner,
  Alert,
  AlertIcon,
  Button,
  useDisclosure
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUpcomingTasks, getOverdueTasks, getUserTasks } from '../services/taskService';
import { getUserCategories } from '../services/categoryService';
import { Task, Category } from '../types/task';
import TaskItem from './tasks/TaskItem';
import TaskForm from './tasks/TaskForm';

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { isOpen: isTaskFormOpen, onOpen: onTaskFormOpen, onClose: onTaskFormClose } = useDisclosure();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch all required data
        const [allTasks, upcoming, overdue, allCategories] = await Promise.all([
          getUserTasks(currentUser.uid),
          getUpcomingTasks(currentUser.uid),
          getOverdueTasks(currentUser.uid),
          getUserCategories(currentUser.uid)
        ]);
        
        setTasks(allTasks);
        setUpcomingTasks(upcoming);
        setOverdueTasks(overdue);
        setCategories(allCategories);
      } catch (err: any) {
        console.error('Error loading dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [currentUser]);
  
  // Calculate statistics
  const todoCount = tasks.filter(t => t.status === 'TODO').length;
  const inProgressCount = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const completedCount = tasks.filter(t => t.status === 'COMPLETED').length;
  const totalCount = tasks.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  
  const handleViewAllTasks = () => {
    navigate('/tasks');
  };
  
  // Implement onShare function
  const handleShare = async (taskId: string, email: string, permission: string) => {
    // Implement sharing logic here
    console.log('Sharing task:', taskId, 'with:', email, 'permission:', permission);
  };
  
  if (isLoading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" />
      </Box>
    );
  }
  
  return (
    <Box p={4}>
      <Heading size="lg" mb={6}>Dashboard</Heading>
      
      {error && (
        <Alert status="error" mb={6}>
          <AlertIcon />
          {error}
        </Alert>
      )}
      
      {/* Task Statistics */}
      <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} spacing={4} mb={8}>
        <Stat p={4} shadow="md" border="1px" borderColor="gray.200" borderRadius="md">
          <StatLabel>Total Tasks</StatLabel>
          <StatNumber>{totalCount}</StatNumber>
        </Stat>
        
        <Stat p={4} shadow="md" border="1px" borderColor="gray.200" borderRadius="md">
          <StatLabel>To Do</StatLabel>
          <StatNumber>{todoCount}</StatNumber>
          <StatHelpText>{totalCount > 0 ? Math.round((todoCount / totalCount) * 100) : 0}%</StatHelpText>
        </Stat>
        
        <Stat p={4} shadow="md" border="1px" borderColor="gray.200" borderRadius="md">
          <StatLabel>In Progress</StatLabel>
          <StatNumber>{inProgressCount}</StatNumber>
          <StatHelpText>{totalCount > 0 ? Math.round((inProgressCount / totalCount) * 100) : 0}%</StatHelpText>
        </Stat>
        
        <Stat p={4} shadow="md" border="1px" borderColor="gray.200" borderRadius="md">
          <StatLabel>Completed</StatLabel>
          <StatNumber>{completedCount}</StatNumber>
          <StatHelpText>{completionRate}%</StatHelpText>
        </Stat>
      </SimpleGrid>
      
      {/* Overdue Tasks */}
      <Box mb={8}>
        <Flex justify="space-between" align="center" mb={4}>
          <Heading size="md">
            <HStack spacing={2}>
              <Text>Overdue Tasks</Text>
              {overdueTasks.length > 0 && (
                <Badge colorScheme="red" fontSize="0.8em" borderRadius="full" px={2}>
                  {overdueTasks.length}
                </Badge>
              )}
            </HStack>
          </Heading>
        </Flex>
        
        {overdueTasks.length === 0 ? (
          <Alert status="success" borderRadius="md">
            <AlertIcon />
            No overdue tasks. Great job!
          </Alert>
        ) : (
          <VStack spacing={4} align="stretch">
            {overdueTasks.slice(0, 3).map(task => (
              <TaskItem
                key={task.id}
                task={task}
                categories={categories}
                onEdit={(task) => {
                  setEditingTask(task);
                  onTaskFormOpen();
                }}
                onDelete={async () => {}} // Will be implemented in TaskList component
                onStatusChange={async () => {}} // Will be implemented in TaskList component
                onShare={handleShare}
              />
            ))}
            
            {overdueTasks.length > 3 && (
              <Button variant="outline" onClick={handleViewAllTasks}>
                View All ({overdueTasks.length})
              </Button>
            )}
          </VStack>
        )}
      </Box>
      
      {/* Upcoming Tasks */}
      <Box mb={8}>
        <Flex justify="space-between" align="center" mb={4}>
          <Heading size="md">
            <HStack spacing={2}>
              <Text>Upcoming Tasks</Text>
              {upcomingTasks.length > 0 && (
                <Badge colorScheme="blue" fontSize="0.8em" borderRadius="full" px={2}>
                  {upcomingTasks.length}
                </Badge>
              )}
            </HStack>
          </Heading>
        </Flex>
        
        {upcomingTasks.length === 0 ? (
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            No upcoming tasks due soon.
          </Alert>
        ) : (
          <VStack spacing={4} align="stretch">
            {upcomingTasks.slice(0, 3).map(task => (
              <TaskItem
                key={task.id}
                task={task}
                categories={categories}
                onEdit={(task) => {
                  setEditingTask(task);
                  onTaskFormOpen();
                }}
                onDelete={async () => {}} // Will be implemented in TaskList component
                onStatusChange={async () => {}} // Will be implemented in TaskList component
                onShare={handleShare}
              />
            ))}
            
            {upcomingTasks.length > 3 && (
              <Button variant="outline" onClick={handleViewAllTasks}>
                View All ({upcomingTasks.length})
              </Button>
            )}
          </VStack>
        )}
      </Box>
      
      {/* Task Form Modal for editing */}
      {editingTask && (
        <TaskForm
          isOpen={isTaskFormOpen}
          onClose={onTaskFormClose}
          onSubmit={async () => {}} // Will be implemented in TaskList component
          categories={categories}
          initialData={editingTask}
          isEditing={true}
        />
      )}
    </Box>
  );
};

export default Dashboard; 