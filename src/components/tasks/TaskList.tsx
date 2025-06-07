import React, { useState, useEffect } from 'react';
import {
  Heading,
  Text,
  Button,
  Box,
  Flex,
  HStack,
  VStack,
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
  Center,
  Card,
  CardBody,
  CardHeader,
  Grid,
  GridItem,
  Icon,
  Stat,
  StatLabel,
  StatNumber,
  ButtonGroup,
  Tooltip,
  IconButton,
  Tabs,
  TabList,
  TabPanels,
  TabPanel,
  Tab,
} from '@chakra-ui/react';
import { 
  FaPlus, 
  FaSearch, 
  FaTasks, 
  FaFilter, 
  FaCalendar,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaTimes
} from 'react-icons/fa';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip as ChartTooltip, 
  Legend,
  Colors
} from 'chart.js';
import { Pie } from 'react-chartjs-2';
import TaskItem from './TaskItem';
import TaskForm from './TaskForm';
import CategorySelector from './CategorySelector';
import { Task, TaskStatus, TaskPriority, Category, TaskFilter } from '../../types/task';
import { useAuth } from '../../contexts/AuthContext';
import { getUserTasks, createTask, deleteTask } from '../../services/taskService';
import { subscribeToCategories } from '../../services/categoryService';
import { shareTaskWithUser } from '../../services/taskService';
import { Timestamp } from 'firebase/firestore';

ChartJS.register(ArcElement, ChartTooltip, Legend, Colors);

interface ChartData {
  labels: string[];
  datasets: {
    data: number[];
    backgroundColor: string[];
    borderColor: string[];
    borderWidth: number;
  }[];
}

const TaskChart: React.FC<{ tasks: Task[], categories: Category[] }> = ({ tasks, categories }) => {
  const [chartType, setChartType] = useState<'status' | 'priority' | 'category'>('status');

  const getChartData = (): ChartData => {
    switch (chartType) {
      case 'status': {
        const statusCounts = tasks.reduce((acc, task) => {
          acc[task.status] = (acc[task.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        return {
          labels: Object.keys(statusCounts),
          datasets: [{
            data: Object.values(statusCounts),
            backgroundColor: [
              'rgba(54, 162, 235, 0.6)',  // TODO
              'rgba(75, 192, 192, 0.6)',  // IN_PROGRESS
              'rgba(255, 99, 132, 0.6)',  // COMPLETED
            ],
            borderColor: [
              'rgba(54, 162, 235, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(255, 99, 132, 1)',
            ],
            borderWidth: 1,
          }],
        };
      }
      case 'priority': {
        const priorityCounts = tasks.reduce((acc, task) => {
          acc[task.priority] = (acc[task.priority] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        return {
          labels: Object.keys(priorityCounts),
          datasets: [{
            data: Object.values(priorityCounts),
            backgroundColor: [
              'rgba(255, 99, 132, 0.6)',  // HIGH
              'rgba(255, 159, 64, 0.6)',  // MEDIUM
              'rgba(75, 192, 192, 0.6)',  // LOW
            ],
            borderColor: [
              'rgba(255, 99, 132, 1)',
              'rgba(255, 159, 64, 1)',
              'rgba(75, 192, 192, 1)',
            ],
            borderWidth: 1,
          }],
        };
      }
      case 'category': {
        const categoryCounts = tasks.reduce((acc, task) => {
          const category = categories.find(c => c.id === task.categoryId)?.name || 'Uncategorized';
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        return {
          labels: Object.keys(categoryCounts),
          datasets: [{
            data: Object.values(categoryCounts),
            backgroundColor: Array(Object.keys(categoryCounts).length)
              .fill('')
              .map((_, i) => `hsla(${(i * 360) / Object.keys(categoryCounts).length}, 70%, 50%, 0.6)`),
            borderColor: Array(Object.keys(categoryCounts).length)
              .fill('')
              .map((_, i) => `hsla(${(i * 360) / Object.keys(categoryCounts).length}, 70%, 50%, 1)`),
            borderWidth: 1,
          }],
        };
      }
      default:
        return {
          labels: [],
          datasets: [{
            data: [],
            backgroundColor: [],
            borderColor: [],
            borderWidth: 1,
          }],
        };
    }
  };

  return (
    <Card mb={6}>
      <CardHeader>
        <Heading size="md">Task Analytics</Heading>
      </CardHeader>
      <CardBody>
        <Tabs onChange={(index) => setChartType((['status', 'priority', 'category'][index] as 'status' | 'priority' | 'category'))}>
          <TabList>
            <Tab>By Status</Tab>
            <Tab>By Priority</Tab>
            <Tab>By Category</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <Box height="300px">
                <Pie data={getChartData()} options={{ maintainAspectRatio: false }} />
              </Box>
            </TabPanel>
            <TabPanel>
              <Box height="300px">
                <Pie data={getChartData()} options={{ maintainAspectRatio: false }} />
              </Box>
            </TabPanel>
            <TabPanel>
              <Box height="300px">
                <Pie data={getChartData()} options={{ maintainAspectRatio: false }} />
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </CardBody>
    </Card>
  );
};

const TaskList: React.FC = () => {
  const { currentUser } = useAuth();
  const { isOpen: isTaskFormOpen, onOpen: onTaskFormOpen, onClose: onTaskFormClose } = useDisclosure();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
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

  const clearFilters = () => {
    setFilter({
      status: [],
      priority: [],
      categories: [],
      search: '',
    });
  };

  const hasActiveFilters = () => {
    return filter.search || 
           (filter.status && filter.status.length > 0) || 
           (filter.priority && filter.priority.length > 0) || 
           (filter.categories && filter.categories.length > 0);
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

  // Calculate task statistics
  const taskStats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'TODO').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
    urgent: tasks.filter(t => t.priority === 'URGENT').length,
  };

  const completionRate = taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0;
  
  if (!currentUser) {
    return (
      <Box p={8} display="flex" justifyContent="center">
        <Alert status="warning" maxW="md">
          <AlertIcon />
          Please log in to view and manage your tasks.
        </Alert>
      </Box>
    );
  }
  
  if (isLoading) {
    return (
      <Center h="400px">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text color="gray.600">Loading your tasks...</Text>
        </VStack>
      </Center>
    );
  }
  
  return (
    <Box maxW="7xl" mx="auto" p={{ base: 4, md: 6 }}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Box>
          <Flex justify="space-between" align="center" mb={4} flexDirection={{ base: "column", md: "row" }} gap={4}>
            <Box textAlign={{ base: "center", md: "left" }}>
              <Heading size={{ base: "lg", md: "xl" }} mb={2}>Task Management</Heading>
              <Text color="gray.600">Organize and track your tasks efficiently</Text>
            </Box>
            <ButtonGroup spacing={3} flexDirection={{ base: "column", sm: "row" }} width={{ base: "full", md: "auto" }}>
              <Tooltip label="Toggle Filters">
                <IconButton
                  aria-label="Toggle filters"
                  icon={<Icon as={FaFilter} />}
                  variant={showFilters ? "solid" : "outline"}
                  colorScheme="gray"
                  onClick={() => setShowFilters(!showFilters)}
                  width={{ base: "full", sm: "auto" }}
                />
              </Tooltip>
              <Button
                leftIcon={<Icon as={FaPlus} />}
                colorScheme="blue"
                onClick={handleOpenNewTaskModal}
                size={{ base: "md", md: "lg" }}
                width={{ base: "full", sm: "auto" }}
              >
                Add Task
              </Button>
            </ButtonGroup>
          </Flex>

          {error && (
            <Alert status="error" mb={6}>
              <AlertIcon />
              {error}
            </Alert>
          )}
        </Box>

        {/* Statistics Dashboard and Analytics - Responsive Grid */}
        <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={6}>
          {/* Left side - Statistics Cards */}
          <Grid templateColumns={{ base: "repeat(2, 1fr)", lg: "repeat(2, 1fr)" }} gap={{ base: 3, md: 6 }}>
            <Card size={{ base: "sm", md: "md" }}>
              <CardBody textAlign="center" py={{ base: 3, md: 6 }}>
                <Icon as={FaTasks} boxSize={{ base: 6, md: 8 }} color="blue.500" mb={{ base: 2, md: 3 }} />
                <Stat>
                  <StatNumber fontSize={{ base: "lg", md: "2xl" }}>{taskStats.total}</StatNumber>
                  <StatLabel fontSize={{ base: "xs", md: "sm" }}>Total Tasks</StatLabel>
                </Stat>
              </CardBody>
            </Card>

            <Card size={{ base: "sm", md: "md" }}>
              <CardBody textAlign="center" py={{ base: 3, md: 6 }}>
                <Icon as={FaClock} boxSize={{ base: 6, md: 8 }} color="orange.500" mb={{ base: 2, md: 3 }} />
                <Stat>
                  <StatNumber fontSize={{ base: "lg", md: "2xl" }}>{taskStats.inProgress}</StatNumber>
                  <StatLabel fontSize={{ base: "xs", md: "sm" }}>In Progress</StatLabel>
                </Stat>
              </CardBody>
            </Card>

            <Card size={{ base: "sm", md: "md" }}>
              <CardBody textAlign="center" py={{ base: 3, md: 6 }}>
                <Icon as={FaCheckCircle} boxSize={{ base: 6, md: 8 }} color="green.500" mb={{ base: 2, md: 3 }} />
                <Stat>
                  <StatNumber fontSize={{ base: "lg", md: "2xl" }}>{completionRate}%</StatNumber>
                  <StatLabel fontSize={{ base: "xs", md: "sm" }}>Completion Rate</StatLabel>
                </Stat>
              </CardBody>
            </Card>

            <Card size={{ base: "sm", md: "md" }}>
              <CardBody textAlign="center" py={{ base: 3, md: 6 }}>
                <Icon as={FaExclamationTriangle} boxSize={{ base: 6, md: 8 }} color="red.500" mb={{ base: 2, md: 3 }} />
                <Stat>
                  <StatNumber fontSize={{ base: "lg", md: "2xl" }}>{taskStats.urgent}</StatNumber>
                  <StatLabel fontSize={{ base: "xs", md: "sm" }}>Urgent Tasks</StatLabel>
                </Stat>
              </CardBody>
            </Card>
          </Grid>

          {/* Right side - Task Analytics */}
          <TaskChart tasks={tasks} categories={categories} />
        </Grid>

        {/* Filters */}
        {showFilters && (
          <Card>
            <CardHeader>
              <Flex justify="space-between" align="center" flexDirection={{ base: "column", sm: "row" }} gap={3}>
                <HStack spacing={3}>
                  <Icon as={FaFilter} color="gray.600" />
                  <Heading size="md">Filters</Heading>
                  {hasActiveFilters() && (
                    <Badge colorScheme="blue" variant="subtle">Active</Badge>
                  )}
                </HStack>
                {hasActiveFilters() && (
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={<Icon as={FaTimes} />}
                    onClick={clearFilters}
                  >
                    Clear All
                  </Button>
                )}
              </Flex>
            </CardHeader>
            <CardBody>
              <Grid templateColumns={{ base: "1fr", md: "2fr 1fr 1fr 1fr" }} gap={4} alignItems="end">
                <GridItem>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>Search Tasks</Text>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <Icon as={FaSearch} color="gray.400" />
                    </InputLeftElement>
                    <Input 
                      placeholder="Search by title, description, or tags" 
                      value={filter.search || ''} 
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                    />
                  </InputGroup>
                </GridItem>
                
                <GridItem>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>Status</Text>
                  <Select 
                    placeholder="All Statuses"
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
                </GridItem>
                
                <GridItem>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>Priority</Text>
                  <Select 
                    placeholder="All Priorities"
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
                </GridItem>
                
                <GridItem>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>Category</Text>
                  <CategorySelector 
                    categories={categories}
                    onSelect={(categoryId) => {
                      const value = categoryId ? [categoryId] : [];
                      handleFilterChange('categories', value);
                    }}
                  />
                </GridItem>
              </Grid>
            </CardBody>
          </Card>
        )}

        {/* Task Summary */}
        <Card bg="gray.50">
          <CardBody>
            <Flex justify="space-between" align="center" flexWrap="wrap" gap={4} flexDirection={{ base: "column", md: "row" }}>
              <Box textAlign={{ base: "center", md: "left" }}>
                <Text fontWeight="semibold" mb={1}>
                  Showing {filteredTasks.length} of {tasks.length} tasks
                </Text>
                {hasActiveFilters() && (
                  <Text fontSize="sm" color="gray.600">
                    Filters are active
                  </Text>
                )}
              </Box>
              
              <HStack spacing={3} flexWrap="wrap" justify={{ base: "center", md: "flex-end" }}>
                <Badge colorScheme="gray" px={3} py={1} borderRadius="full" fontSize={{ base: "xs", md: "sm" }}>
                  <HStack spacing={1}>
                    <Icon as={FaCalendar} boxSize={3} />
                    <Text>To Do: {taskStats.todo}</Text>
                  </HStack>
                </Badge>
                <Badge colorScheme="blue" px={3} py={1} borderRadius="full" fontSize={{ base: "xs", md: "sm" }}>
                  <HStack spacing={1}>
                    <Icon as={FaClock} boxSize={3} />
                    <Text>In Progress: {taskStats.inProgress}</Text>
                  </HStack>
                </Badge>
                <Badge colorScheme="green" px={3} py={1} borderRadius="full" fontSize={{ base: "xs", md: "sm" }}>
                  <HStack spacing={1}>
                    <Icon as={FaCheckCircle} boxSize={3} />
                    <Text>Completed: {taskStats.completed}</Text>
                  </HStack>
                </Badge>
              </HStack>
            </Flex>
          </CardBody>
        </Card>

        {/* Task Grid */}
        {filteredTasks.length === 0 ? (
          <Card>
            <CardBody textAlign="center" py={12}>
              <Icon as={FaTasks} boxSize={16} color="gray.300" mb={4} />
              <Heading size="md" mb={2} color="gray.600">No tasks found</Heading>
              <Text color="gray.500" mb={6}>
                {tasks.length === 0 
                  ? 'Get started by creating your first task' 
                  : 'Try adjusting your filters to see more tasks'}
              </Text>
              {tasks.length === 0 && (
                <Button
                  leftIcon={<Icon as={FaPlus} />}
                  colorScheme="blue"
                  onClick={handleOpenNewTaskModal}
                >
                  Create Your First Task
                </Button>
              )}
            </CardBody>
          </Card>
        ) : (
          <SimpleGrid columns={{ base: 1, lg: 2, xl: 3 }} spacing={6}>
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
      </VStack>

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