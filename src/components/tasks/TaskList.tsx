import React, { useState, useEffect } from 'react';
import {
  Heading,
  Text,
  Button,
  Box,
  Flex,
  HStack,
  Select,
  Input,
  InputGroup,
  InputLeftElement,
  useDisclosure,
  Badge,
  SimpleGrid,
  Alert,
  AlertIcon,
  Spinner,
  Center
} from '@chakra-ui/react';
import { FaPlus, FaSearch } from 'react-icons/fa';
import TaskItem from './TaskItem';
import TaskForm from './TaskForm';
import CategorySelector from './CategorySelector';
import { Task, TaskStatus, TaskPriority, Category, TaskFilter } from '../../types/task';
import { useAuth } from '../../contexts/AuthContext';
import { getUserTasks, createTask, deleteTask } from '../../services/taskService';
import { getUserCategories, subscribeToCategories } from '../../services/categoryService';
import { shareTaskWithUser } from '../../services/taskService';
import { Timestamp } from 'firebase/firestore';

const TaskList: React.FC = () => {
  const { currentUser } = useAuth();
  const { isOpen: isTaskFormOpen, onOpen: onTaskFormOpen, onClose: onTaskFormClose } = useDisclosure();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Filter states
  const [filter, setFilter] = useState<TaskFilter>({
    status: [],
    priority: [],
    categories: [],
    search: '',
  });
  
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch tasks
        const fetchedTasks = await getUserTasks(currentUser.uid);
        setTasks(fetchedTasks);
        
        // Subscribe to real-time category updates
        const unsubscribe = subscribeToCategories(currentUser.uid, (updatedCategories) => {
          setCategories(updatedCategories);
          setIsLoading(false);
        });
        
        // Return cleanup function
        return () => {
          unsubscribe();
        };
      } catch (err: any) {
        console.error('Error loading data:', err);
        setError('Failed to load tasks. Please try again.');
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [currentUser]);
  
  const handleCreateTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'userId'>) => {
    if (!currentUser) return;
    
    try {
      const newTask = await createTask(currentUser.uid, { ...taskData, userId: currentUser.uid });
      setTasks([newTask, ...tasks]);
    } catch (err: any) {
      console.error('Error creating task:', err);
      setError('Failed to create task. Please try again.');
      throw err;
    }
  };
  
  const handleUpdateTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'userId'>) => {
    if (!currentUser || !editingTask) return;
    
    try {
      const updatedTask = {
        ...taskData,
        status: taskData.status,
        completedAt: taskData.status === 'COMPLETED' ? Timestamp.fromDate(new Date()) : undefined
      };
      const updatedTasks = tasks.map(t => ({
        ...t,
        ...(t.id === editingTask.id ? updatedTask : {})
      }));
      setTasks(updatedTasks);
      setEditingTask(null);
    } catch (err: any) {
      console.error('Error updating task:', err);
      setError('Failed to update task. Please try again.');
      throw err;
    }
  };
  
  const handleDeleteTask = async (taskId: string) => {
    if (!currentUser) return;
    
    try {
      await deleteTask(currentUser.uid, taskId);
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (err: any) {
      console.error('Error deleting task:', err);
      setError('Failed to delete task. Please try again.');
    }
  };
  
  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    if (!currentUser) return;
    
    try {
      const taskToUpdate = tasks.find(t => t.id === taskId);
      if (!taskToUpdate) return;
      
      const updatedTask = {
        ...taskToUpdate,
        status,
        completedAt: status === 'COMPLETED' ? Timestamp.fromDate(new Date()) : undefined
      };
      
      const updatedTasks = tasks.map(t => t.id === taskId ? updatedTask : t);
      setTasks(updatedTasks);
    } catch (err: any) {
      console.error('Error updating task status:', err);
      setError('Failed to update task status. Please try again.');
    }
  };
  
  const handleShareTask = async (taskId: string, email: string, permission: string) => {
    if (!currentUser) return;
    
    try {
      await shareTaskWithUser(
        currentUser.uid,
        taskId,
        email,
        permission as 'view' | 'edit' | 'admin'
      );
    } catch (err: any) {
      console.error('Error sharing task:', err);
      setError('Failed to share task. Please try again.');
      throw err;
    }
  };
  
  const openEditTaskModal = (task: Task) => {
    setEditingTask(task);
    onTaskFormOpen();
  };
  
  const handleOpenNewTaskModal = () => {
    setEditingTask(null);
    onTaskFormOpen();
  };
  
  const handleFilterChange = (key: keyof TaskFilter, value: any) => {
    setFilter({ ...filter, [key]: value });
  };
  
  // Apply filters to tasks
  const filteredTasks = tasks.filter(task => {
    // Status filter
    if (filter.status && filter.status.length > 0 && !filter.status.includes(task.status)) {
      return false;
    }
    
    // Priority filter
    if (filter.priority && filter.priority.length > 0 && !filter.priority.includes(task.priority)) {
      return false;
    }
    
    // Category filter
    if (filter.categories && filter.categories.length > 0) {
      if (!task.categoryId || !filter.categories.includes(task.categoryId)) {
        return false;
      }
    }
    
    // Search filter
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      const titleMatches = task.title.toLowerCase().includes(searchLower);
      const descriptionMatches = task.description?.toLowerCase().includes(searchLower) || false;
      const tagMatches = task.tags?.some(tag => tag.toLowerCase().includes(searchLower)) || false;
      
      if (!titleMatches && !descriptionMatches && !tagMatches) {
        return false;
      }
    }
    
    return true;
  });
  
  if (!currentUser) {
    return (
      <Box p={4}>
        <Alert status="warning">
          <AlertIcon />
          Please log in to view and manage your tasks.
        </Alert>
      </Box>
    );
  }
  
  if (isLoading) {
    return (
      <Center h="200px">
        <Spinner size="xl" />
      </Center>
    );
  }
  
  return (
    <Box p={4}>
      <Flex justifyContent="space-between" alignItems="center" mb={4}>
        <Heading size="lg">My Tasks</Heading>
        <Button
          leftIcon={<FaPlus />}
          colorScheme="blue"
          onClick={handleOpenNewTaskModal}
        >
          Add Task
        </Button>
      </Flex>
      
      {error && (
        <Alert status="error" mb={4}>
          <AlertIcon />
          {error}
        </Alert>
      )}
      
      {/* Filters */}
      <Box mb={6} p={4} borderWidth="1px" borderRadius="lg">
        <Flex 
          direction={{ base: 'column', md: 'row' }} 
          gap={4}
          alignItems={{ base: 'stretch', md: 'center' }}
        >
          <InputGroup>
            <InputLeftElement pointerEvents="none">
              <FaSearch color="gray.300" />
            </InputLeftElement>
            <Input 
              placeholder="Search tasks" 
              value={filter.search || ''} 
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </InputGroup>
          
          <HStack spacing={2} flexWrap="wrap">
            <Select 
              placeholder="Filter by status" 
              size="md"
              minW="150px"
              onChange={(e) => {
                const value = e.target.value ? [e.target.value as TaskStatus] : [];
                handleFilterChange('status', value);
              }}
            >
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </Select>
            
            <Select 
              placeholder="Filter by priority" 
              size="md"
              minW="150px"
              onChange={(e) => {
                const value = e.target.value ? [e.target.value as TaskPriority] : [];
                handleFilterChange('priority', value);
              }}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </Select>
            
            <CategorySelector 
              categories={categories}
              onSelect={(categoryId) => {
                const value = categoryId ? [categoryId] : [];
                handleFilterChange('categories', value);
              }}
            />
          </HStack>
        </Flex>
      </Box>
      
      {/* Task count */}
      <Flex justifyContent="space-between" alignItems="center" mb={4}>
        <Text>Showing {filteredTasks.length} of {tasks.length} tasks</Text>
        <HStack spacing={2}>
          <Badge colorScheme="gray" px={2} py={1}>
            To Do: {tasks.filter(t => t.status === 'TODO').length}
          </Badge>
          <Badge colorScheme="blue" px={2} py={1}>
            In Progress: {tasks.filter(t => t.status === 'IN_PROGRESS').length}
          </Badge>
          <Badge colorScheme="green" px={2} py={1}>
            Completed: {tasks.filter(t => t.status === 'COMPLETED').length}
          </Badge>
        </HStack>
      </Flex>
      
      {/* Task list */}
      {filteredTasks.length === 0 ? (
        <Box textAlign="center" py={10}>
          <Heading size="md" mb={2}>No tasks found</Heading>
          <Text>
            {tasks.length === 0 
              ? 'Get started by adding your first task' 
              : 'Try changing your filters'}
          </Text>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          {filteredTasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              categories={categories}
              onEdit={openEditTaskModal}
              onDelete={handleDeleteTask}
              onStatusChange={handleStatusChange}
              onShare={handleShareTask}
            />
          ))}
        </SimpleGrid>
      )}
      
      {/* Task Form Modal */}
      <TaskForm
        isOpen={isTaskFormOpen}
        onClose={onTaskFormClose}
        onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
        categories={categories}
        initialData={editingTask || undefined}
        isEditing={!!editingTask}
      />
    </Box>
  );
};

export default TaskList; 