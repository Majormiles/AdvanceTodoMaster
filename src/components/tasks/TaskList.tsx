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
  IconButton,
  Tabs,
  TabList,
  TabPanels,
  TabPanel,
  Tab,
  Checkbox,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useColorModeValue,
  Tooltip,
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
  FaTimes,
  FaEdit,
  FaTrash,
  FaShare,
  FaChartPie,
  FaTags,
} from 'react-icons/fa';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
  Colors,
  TooltipItem
} from 'chart.js';
import { Pie } from 'react-chartjs-2';
import TaskForm from './TaskForm';
import CategorySelector from './CategorySelector';
import ShareTaskModal from './ShareTaskModal';
import { Task, TaskStatus, TaskPriority, Category, TaskFilter, PermissionLevel } from '../../types/task';
import { useAuth } from '../../contexts/AuthContext';
import { getUserTasks, createTask, deleteTask, updateTask } from '../../services/taskService';
import { subscribeToCategories, initializeDefaultCategories } from '../../services/categoryService';
import { addCollaborators } from '../../services/collaborationService';

import { Timestamp } from 'firebase/firestore';
import Carousel from '../ui/Carousel';
import TaskListDrawer from './TaskListDrawer';

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
  const [isVisible, setIsVisible] = useState(false);
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const gradientBg = useColorModeValue(
    'linear(to-br, blue.50, purple.50, pink.50)',
    'linear(to-br, gray.900, blue.900, purple.900)'
  );

  React.useEffect(() => {
    setIsVisible(true);
  }, []);

  const getChartData = (): ChartData => {
    switch (chartType) {
      case 'status': {
        const statusCounts = tasks.reduce((acc, task) => {
          acc[task.status] = (acc[task.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const statusOrder = ['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
        const statusLabels = ['To Do', 'In Progress', 'Completed', 'Cancelled'];
        const statusColors = [
          'rgba(99, 102, 241, 0.8)',   // TODO - Indigo
          'rgba(59, 130, 246, 0.8)',   // IN_PROGRESS - Blue
          'rgba(34, 197, 94, 0.8)',    // COMPLETED - Green
          'rgba(239, 68, 68, 0.8)',    // CANCELLED - Red
        ];
        const statusBorderColors = [
          'rgba(99, 102, 241, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(239, 68, 68, 1)',
        ];

        const orderedData = statusOrder.map(status => statusCounts[status] || 0).filter(count => count > 0);
        const orderedLabels = statusOrder.filter(status => statusCounts[status] > 0).map((status, index) => statusLabels[statusOrder.indexOf(status)]);
        const orderedColors = statusOrder.filter(status => statusCounts[status] > 0).map((status, index) => statusColors[statusOrder.indexOf(status)]);
        const orderedBorderColors = statusOrder.filter(status => statusCounts[status] > 0).map((status, index) => statusBorderColors[statusOrder.indexOf(status)]);

        return {
          labels: orderedLabels,
          datasets: [{
            data: orderedData,
            backgroundColor: orderedColors,
            borderColor: orderedBorderColors,
            borderWidth: 2,
          }],
        };
      }
      case 'priority': {
        const priorityCounts = tasks.reduce((acc, task) => {
          acc[task.priority] = (acc[task.priority] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const priorityOrder = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];
        const priorityColors = [
          'rgba(239, 68, 68, 0.8)',    // URGENT - Red
          'rgba(245, 158, 11, 0.8)',   // HIGH - Amber
          'rgba(59, 130, 246, 0.8)',   // MEDIUM - Blue
          'rgba(34, 197, 94, 0.8)',    // LOW - Green
        ];
        const priorityBorderColors = [
          'rgba(239, 68, 68, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(34, 197, 94, 1)',
        ];

        const orderedData = priorityOrder.map(priority => priorityCounts[priority] || 0).filter(count => count > 0);
        const orderedLabels = priorityOrder.filter(priority => priorityCounts[priority] > 0);
        const orderedColors = priorityOrder.filter(priority => priorityCounts[priority] > 0).map((priority, index) => priorityColors[priorityOrder.indexOf(priority)]);
        const orderedBorderColors = priorityOrder.filter(priority => priorityCounts[priority] > 0).map((priority, index) => priorityBorderColors[priorityOrder.indexOf(priority)]);

        return {
          labels: orderedLabels,
          datasets: [{
            data: orderedData,
            backgroundColor: orderedColors,
            borderColor: orderedBorderColors,
            borderWidth: 2,
          }],
        };
      }
      case 'category': {
        const categoryCounts = tasks.reduce((acc, task) => {
          const category = categories.find(c => c.id === task.categoryId)?.name || 'Uncategorized';
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const colors = [
          'rgba(99, 102, 241, 0.8)',   // Indigo
          'rgba(236, 72, 153, 0.8)',   // Pink
          'rgba(34, 197, 94, 0.8)',    // Green
          'rgba(245, 158, 11, 0.8)',   // Amber
          'rgba(139, 92, 246, 0.8)',   // Violet
          'rgba(6, 182, 212, 0.8)',    // Cyan
          'rgba(239, 68, 68, 0.8)',    // Red
          'rgba(168, 85, 247, 0.8)',   // Purple
        ];

        const labels = Object.keys(categoryCounts);
        const data = Object.values(categoryCounts);
        const backgroundColor = colors.slice(0, labels.length);
        const borderColor = backgroundColor.map(color => color.replace('0.8', '1'));

        return {
          labels,
          datasets: [{
            data,
            backgroundColor,
            borderColor,
            borderWidth: 2,
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

  const getStatsCards = () => {
    const data = getChartData();
    return data.labels.map((label, index) => ({
      label,
      value: data.datasets[0].data[index] as number,
      color: data.datasets[0].backgroundColor[index],
      percentage: ((data.datasets[0].data[index] as number) / data.datasets[0].data.reduce((a, b) => a + b, 0) * 100).toFixed(1)
    }));
  };

  const chartOptions = {
    maintainAspectRatio: true,
    aspectRatio: 1,
    responsive: true,
    layout: {
      padding: 5
    },
    plugins: {
      legend: {
        display: false, // We'll use custom cards instead
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        borderColor: 'rgba(148, 163, 184, 0.3)',
        borderWidth: 2,
        cornerRadius: 16,
        displayColors: true,
        padding: 16,
        titleFont: { size: 14, weight: 'bold' as const },
        bodyFont: { size: 13 },
        callbacks: {
          label: function (context: TooltipItem<"pie">) {
            const label = context.label || '';
            const value = context.raw as number;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} tasks (${percentage}%)`;
          }
        }
      }
    },
    hover: {
      mode: 'nearest' as const,
      intersect: true,
    },
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1500,
      easing: 'easeInOutQuart' as const,
    },
    elements: {
      arc: {
        borderWidth: 1,
        hoverBorderWidth: 2,
        spacing: 0,
      }
    },
    interaction: {
      intersect: false,
      mode: 'point' as const
    }
  };

  return (
    <Card 
      mb={4} 
      bg={cardBg} 
      borderColor={borderColor}
      shadow="md"
      borderRadius="lg"
      overflow="hidden"
      transform={isVisible ? "translateY(0)" : "translateY(20px)"}
      opacity={isVisible ? 1 : 0}
      transition="all 0.6s ease-out"
    >
      <Box bgGradient={gradientBg} p={1}>
        <Box bg={cardBg} borderRadius="lg">
          <CardHeader pb={2}>
            <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
              <VStack align="start" spacing={1}>
                <HStack>
                  <Box 
                    w={3} 
                    h={3} 
                    bg="linear-gradient(45deg, #667eea 0%, #764ba2 100%)" 
                    borderRadius="md"
                    transform={isVisible ? "rotate(0deg)" : "rotate(-180deg)"}
                    transition="transform 0.8s ease-out"
                  />
                  <Heading 
                    size="md" 
                    bgGradient="linear(to-r, blue.600, purple.600)" 
                    bgClip="text"
                    fontWeight="bold"
                  >
                    Task Analytics
                  </Heading>
                </HStack>
                <Text fontSize="xs" color="gray.600">
                  Visual insights into your task distribution
                </Text>
              </VStack>
              
              <ButtonGroup 
                size="sm" 
                isAttached 
                variant="outline"
                transform={isVisible ? "scale(1)" : "scale(0.8)"}
                transition="transform 0.5s ease-out 0.3s"
              >
                <Button
                  onClick={() => setChartType('status')}
                  colorScheme={chartType === 'status' ? 'blue' : 'gray'}
                  variant={chartType === 'status' ? 'solid' : 'outline'}
                  leftIcon={<FaChartPie />}
                  _hover={{ transform: "translateY(-1px)" }}
                  transition="all 0.2s"
                >
                  Status
                </Button>
                <Button
                  onClick={() => setChartType('priority')}
                  colorScheme={chartType === 'priority' ? 'orange' : 'gray'}
                  variant={chartType === 'priority' ? 'solid' : 'outline'}
                  leftIcon={<FaExclamationTriangle />}
                  _hover={{ transform: "translateY(-1px)" }}
                  transition="all 0.2s"
                >
                  Priority
                </Button>
                <Button
                  onClick={() => setChartType('category')}
                  colorScheme={chartType === 'category' ? 'purple' : 'gray'}
                  variant={chartType === 'category' ? 'solid' : 'outline'}
                  leftIcon={<FaTags />}
                  _hover={{ transform: "translateY(-1px)" }}
                  transition="all 0.2s"
                >
                  Category
                </Button>
              </ButtonGroup>
            </Flex>
          </CardHeader>
          
          <CardBody pt={0} px={3}>
            {tasks.length > 0 ? (
              <Grid 
                templateColumns={{ base: "1fr", lg: "280px 1fr" }} 
                gap={{ base: 4, lg: 3 }} 
                alignItems="start"
                minH={{ base: "auto", lg: "280px" }}
              >
                {/* Chart Section */}
                <Box 
                  position="relative"
                  transform={isVisible ? "scale(1)" : "scale(0.9)"}
                  transition="transform 0.6s ease-out 0.2s"
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Box 
                    width={{ base: "220px", lg: "260px" }}
                    height={{ base: "220px", lg: "260px" }}
                    position="relative"
                    borderRadius="lg"
                    bg={useColorModeValue('gray.50', 'gray.750')}
                    p={2}
                    _hover={{ shadow: "md" }}
                    transition="box-shadow 0.3s ease"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    mx="auto"
                  >
                    <Box width={{ base: "200px", lg: "240px" }} height={{ base: "200px", lg: "240px" }}>
                      <Pie data={getChartData()} options={chartOptions} />
                    </Box>
                  </Box>
                </Box>

                {/* Stats Cards */}
                <VStack spacing={2} align="stretch" pl={{ base: 0, lg: 2 }}>
                  <Text 
                    fontWeight="bold" 
                    fontSize="sm" 
                    color="gray.700"
                    mb={1}
                    textAlign="left"
                  >
                    Distribution
                  </Text>
                  {getStatsCards().map((stat, index) => (
                    <Box
                      key={stat.label}
                      p={2}
                      borderRadius="md"
                      bg={useColorModeValue('white', 'gray.700')}
                      border="1px solid"
                      borderColor={useColorModeValue('gray.200', 'gray.600')}
                      _hover={{ 
                        transform: "translateY(-1px)", 
                        shadow: "md",
                        borderColor: stat.color.replace('0.8', '1')
                      }}
                      transition="all 0.3s ease"
                      cursor="pointer"
                      transform={isVisible ? "translateX(0)" : "translateX(20px)"}
                      opacity={isVisible ? 1 : 0}
                      style={{
                        transitionDelay: `${0.4 + index * 0.1}s`
                      }}
                    >
                      <Flex align="center" justify="space-between">
                        <HStack spacing={2}>
                          <Box
                            w={2}
                            h={2}
                            borderRadius="full"
                            bg={stat.color}
                            boxShadow="sm"
                          />
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="semibold" fontSize="xs">
                              {stat.label}
                            </Text>
                            <Text fontSize="2xs" color="gray.500">
                              {stat.percentage}% of total
                            </Text>
                          </VStack>
                        </HStack>
                        <VStack align="end" spacing={0}>
                          <Text 
                            fontWeight="bold" 
                            fontSize="sm"
                            color={stat.color.replace('0.8', '1').replace('rgba', '').replace(')', '').split(',').slice(0,3).join(',').replace('(', 'rgb(')}
                          >
                            {stat.value}
                          </Text>
                          <Text fontSize="2xs" color="gray.500">
                            task{stat.value !== 1 ? 's' : ''}
                          </Text>
                        </VStack>
                      </Flex>
                    </Box>
                  ))}
                  
                  {/* Summary Card */}
                  <Box
                    mt={2}
                    p={3}
                    borderRadius="md"
                    bgGradient="linear(to-r, blue.500, purple.600)"
                    color="white"
                    _hover={{ transform: "translateY(-1px)", shadow: "md" }}
                    transition="all 0.3s ease"
                    transform={isVisible ? "scale(1)" : "scale(0.95)"}
                    style={{
                      transitionDelay: `${0.4 + getStatsCards().length * 0.1 + 0.2}s`
                    }}
                  >
                    <VStack spacing={1}>
                      <HStack>
                        <Box as={FaTasks} boxSize={3} />
                        <Text fontWeight="bold" fontSize="xs">Total Tasks</Text>
                      </HStack>
                      <Text fontSize="lg" fontWeight="bold">
                        {tasks.length}
                      </Text>
                      <Text fontSize="2xs" opacity={0.9}>
                        {tasks.filter(t => t.status === 'COMPLETED').length} completed
                      </Text>
                    </VStack>
                  </Box>
                </VStack>
              </Grid>
            ) : (
              <Center py={12}>
                <VStack spacing={4}>
                  <Box as={FaChartPie} size="48px" color="gray.400" />
                  <Text color="gray.500" textAlign="center" fontSize="lg">
                    No tasks to display
                  </Text>
                  <Text color="gray.400" textAlign="center" fontSize="sm">
                    Create your first task to see analytics
                  </Text>
                </VStack>
              </Center>
            )}
          </CardBody>
        </Box>
      </Box>
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

  // Color mode values
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'whiteAlpha.900');
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const secondaryTextColor = useColorModeValue('gray.600', 'gray.400');
  const tableBg = useColorModeValue('white', 'gray.800');

  // New state for TaskListDrawer
  const [selectedCardType, setSelectedCardType] = useState<'total' | 'inProgress' | 'completed' | 'urgent' | null>(null);

  // Sharing state
  const [sharingTask, setSharingTask] = useState<Task | null>(null);
  const { isOpen: isShareModalOpen, onOpen: onShareModalOpen, onClose: onShareModalClose } = useDisclosure();

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
        const unsubscribe = subscribeToCategories(currentUser.uid, async (updatedCategories) => {
          console.log('📂 Categories loaded:', updatedCategories.length);
          
          // If no categories exist, initialize default categories
          if (updatedCategories.length === 0) {
            console.log('📂 No categories found, initializing default categories...');
            try {
              await initializeDefaultCategories(currentUser.uid);
              console.log('📂 Default categories initialized successfully');
            } catch (err) {
              console.error('📂 Error initializing default categories:', err);
            }
          } else {
            setCategories(updatedCategories);
            setIsLoading(false);
          }
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

    // Store original task state for rollback
    const originalTask = editingTask;

    try {
      const updatedTaskData: any = {
        ...taskData,
        status: taskData.status,
        updatedAt: Timestamp.fromDate(new Date())
      };

      // Only add completedAt if status is COMPLETED
      if (taskData.status === 'COMPLETED') {
        updatedTaskData.completedAt = Timestamp.fromDate(new Date());
      }

      // Optimistic update - update UI immediately
      const optimisticTasks = tasks.map(t => ({
        ...t,
        ...(t.id === editingTask.id ? { ...t, ...updatedTaskData } : {})
      }));
      setTasks(optimisticTasks);

      // Persist to database
      await updateTask(currentUser.uid, editingTask.id, updatedTaskData);
      
      setEditingTask(null);
    } catch (err: any) {
      // Rollback on error - revert to original state
      const rollbackTasks = tasks.map(t => t.id === editingTask.id ? originalTask : t);
      setTasks(rollbackTasks);
      
      console.error('Error updating task:', err);
      setError('Failed to update task. Changes have been reverted.');
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

    // Store original task state for rollback
    const originalTask = tasks.find(t => t.id === taskId);
    if (!originalTask) return;

    try {
      // Prepare update data
      const updateData: any = {
        status,
        updatedAt: Timestamp.fromDate(new Date())
      };

      // Only add completedAt if status is COMPLETED
      if (status === 'COMPLETED') {
        updateData.completedAt = Timestamp.fromDate(new Date());
      }

      // Optimistic update - update UI immediately
      const updatedTask = {
        ...originalTask,
        ...updateData
      };

      const optimisticTasks = tasks.map(t => t.id === taskId ? updatedTask : t);
      setTasks(optimisticTasks);

      // Persist to database
      await updateTask(currentUser.uid, taskId, updateData);
      
    } catch (err: any) {
      // Rollback on error - revert to original state
      const rollbackTasks = tasks.map(t => t.id === taskId ? originalTask : t);
      setTasks(rollbackTasks);
      
      console.error('Error updating task status:', err);
      setError('Failed to update task status. Changes have been reverted.');
    }
  };

  const handleShareTask = async (users: { email: string; permissionLevel: PermissionLevel }[], message?: string) => {
    if (!currentUser || !sharingTask) return;

    try {
      await addCollaborators(
        currentUser.uid,
        sharingTask.id,
        users,
        currentUser.displayName || currentUser.email || 'Unknown User',
        message
      );

      // Update the task in local state to mark it as shared
      const updatedTasks = tasks.map(task => 
        task.id === sharingTask.id 
          ? { ...task, isShared: true, updatedAt: Timestamp.fromDate(new Date()) }
          : task
      );
      setTasks(updatedTasks);

      setSharingTask(null);
    } catch (err: any) {
      console.error('Error sharing task:', err);
      setError('Failed to share task. Please try again.');
      throw err;
    }
  };

  const openShareModal = (task: Task) => {
    setSharingTask(task);
    onShareModalOpen();
  };

  const closeShareModal = () => {
    setSharingTask(null);
    onShareModalClose();
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
    <Box maxW="7xl" mx="auto" p={{ base: 4, md: 6 }} color={textColor}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Box>
          <Flex justify="space-between" align="center" mb={1} flexDirection={{ base: "column", md: "row" }} gap={4}>
            <Box textAlign={{ base: "center", md: "left" }}>
              <Heading size={{ base: "lg", md: "xl" }} mb={2}>Task Management</Heading>
              <Text color={secondaryTextColor}>Organize and track your tasks efficiently</Text>
            </Box>
            <ButtonGroup
              spacing={3}
              flexDirection={{ base: "column", sm: "row" }}
              width={{ base: "100%", md: "auto" }}
              alignItems="center"
            >
              <IconButton
                aria-label="Toggle filters"
                icon={<Icon as={FaFilter} />}
                variant={showFilters ? "solid" : "outline"}
                colorScheme="gray"
                onClick={() => setShowFilters(!showFilters)}
                width={{ base: "100%", sm: "auto" }}
              />
              <Button
                leftIcon={<Icon as={FaPlus} />}
                colorScheme="blue"
                onClick={handleOpenNewTaskModal}
                size={{ base: "md", md: "lg" }}
                width={{ base: "100%", sm: "auto" }}
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

        {/* Banner Carousel */}
        <Card overflow="hidden" bg={cardBg}>
          <CardBody p={0}>
            <Carousel
              images={[
                "/banner/baner1.jpg",
                "/banner/banner2.jpg",
                "/banner/banner3.jpg",
                "/banner/banner4.jpg",
                "/banner/banner5.jpg"
              ]}
              height="110px"
            />
          </CardBody>
        </Card>

        {/* Statistics Dashboard and Analytics - Responsive Grid */}
        <Grid templateColumns={{ base: "1fr", lg: "3fr 2fr" }} gap={4}>
          {/* Left side - Statistics Cards */}
          <Grid templateColumns={{ base: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }} gap={{ base: 2, md: 3 }}>
            <Card 
              size="sm"
              bg={cardBg}
              onClick={() => setSelectedCardType('total')}
              cursor="pointer"
              transition="all 0.3s ease"
              _hover={{ 
                transform: 'translateY(-2px)', 
                shadow: 'md',
                borderColor: 'blue.400'
              }}
              role="button"
              aria-label="View all tasks"
              borderRadius="lg"
              borderWidth="1px"
              borderColor="transparent"
              position="relative"
              overflow="hidden"
              height="120px"
            >
              <Box
                position="absolute"
                top="0"
                left="0"
                right="0"
                height="3px"
                bgGradient="linear(to-r, blue.400, blue.600)"
              />
              <CardBody textAlign="center" py={3} px={3} display="flex" alignItems="center" justifyContent="center" height="100%">
                <VStack spacing={2}>
                  <Box
                    p={2}
                    borderRadius="full"
                    bg={useColorModeValue('blue.50', 'blue.900')}
                  >
                    <Icon as={FaTasks} boxSize={5} color="blue.500" />
                  </Box>
                  <Stat textAlign="center">
                    <StatNumber 
                      fontSize="xl" 
                      fontWeight="bold"
                      color="blue.600"
                      mb={0}
                    >
                      {taskStats.total}
                    </StatNumber>
                    <StatLabel 
                      fontSize="xs"
                      color={useColorModeValue('gray.600', 'gray.400')}
                      fontWeight="medium"
                    >
                      Total Tasks
                    </StatLabel>
                  </Stat>
                </VStack>
              </CardBody>
            </Card>

            <Card 
              size="sm"
              bg={cardBg}
              onClick={() => setSelectedCardType('inProgress')}
              cursor="pointer"
              transition="all 0.3s ease"
              _hover={{ 
                transform: 'translateY(-2px)', 
                shadow: 'md',
                borderColor: 'orange.400'
              }}
              role="button"
              aria-label="View in-progress tasks"
              borderRadius="lg"
              borderWidth="1px"
              borderColor="transparent"
              position="relative"
              overflow="hidden"
              height="120px"
            >
              <Box
                position="absolute"
                top="0"
                left="0"
                right="0"
                height="3px"
                bgGradient="linear(to-r, orange.400, orange.600)"
              />
              <CardBody textAlign="center" py={3} px={3} display="flex" alignItems="center" justifyContent="center" height="100%">
                <VStack spacing={2}>
                  <Box
                    p={2}
                    borderRadius="full"
                    bg={useColorModeValue('orange.50', 'orange.900')}
                  >
                    <Icon as={FaClock} boxSize={5} color="orange.500" />
                  </Box>
                  <Stat textAlign="center">
                    <StatNumber 
                      fontSize="xl" 
                      fontWeight="bold"
                      color="orange.600"
                      mb={0}
                    >
                      {taskStats.inProgress}
                    </StatNumber>
                    <StatLabel 
                      fontSize="xs"
                      color={useColorModeValue('gray.600', 'gray.400')}
                      fontWeight="medium"
                    >
                      In Progress
                    </StatLabel>
                  </Stat>
                </VStack>
              </CardBody>
            </Card>

            <Card 
              size="sm"
              bg={cardBg}
              onClick={() => setSelectedCardType('completed')}
              cursor="pointer"
              transition="all 0.3s ease"
              _hover={{ 
                transform: 'translateY(-2px)', 
                shadow: 'md',
                borderColor: 'green.400'
              }}
              role="button"
              aria-label="View completed tasks"
              borderRadius="lg"
              borderWidth="1px"
              borderColor="transparent"
              position="relative"
              overflow="hidden"
              height="120px"
            >
              <Box
                position="absolute"
                top="0"
                left="0"
                right="0"
                height="3px"
                bgGradient="linear(to-r, green.400, green.600)"
              />
              <CardBody textAlign="center" py={3} px={3} display="flex" alignItems="center" justifyContent="center" height="100%">
                <VStack spacing={2}>
                  <Box
                    p={2}
                    borderRadius="full"
                    bg={useColorModeValue('green.50', 'green.900')}
                  >
                    <Icon as={FaCheckCircle} boxSize={5} color="green.500" />
                  </Box>
                  <Stat textAlign="center">
                    <StatNumber 
                      fontSize="xl" 
                      fontWeight="bold"
                      color="green.600"
                      mb={0}
                    >
                      {completionRate}%
                    </StatNumber>
                    <StatLabel 
                      fontSize="xs"
                      color={useColorModeValue('gray.600', 'gray.400')}
                      fontWeight="medium"
                    >
                      Completion Rate
                    </StatLabel>
                  </Stat>
                </VStack>
              </CardBody>
            </Card>

            <Card 
              size="sm"
              bg={cardBg}
              onClick={() => setSelectedCardType('urgent')}
              cursor="pointer"
              transition="all 0.3s ease"
              _hover={{ 
                transform: 'translateY(-2px)', 
                shadow: 'md',
                borderColor: 'red.400'
              }}
              role="button"
              aria-label="View urgent tasks"
              borderRadius="lg"
              borderWidth="1px"
              borderColor="transparent"
              position="relative"
              overflow="hidden"
              height="120px"
            >
              <Box
                position="absolute"
                top="0"
                left="0"
                right="0"
                height="3px"
                bgGradient="linear(to-r, red.400, red.600)"
              />
              <CardBody textAlign="center" py={3} px={3} display="flex" alignItems="center" justifyContent="center" height="100%">
                <VStack spacing={2}>
                  <Box
                    p={2}
                    borderRadius="full"
                    bg={useColorModeValue('red.50', 'red.900')}
                  >
                    <Icon as={FaExclamationTriangle} boxSize={5} color="red.500" />
                  </Box>
                  <Stat textAlign="center">
                    <StatNumber 
                      fontSize="xl" 
                      fontWeight="bold"
                      color="red.600"
                      mb={0}
                    >
                      {taskStats.urgent}
                    </StatNumber>
                    <StatLabel 
                      fontSize="xs"
                      color={useColorModeValue('gray.600', 'gray.400')}
                      fontWeight="medium"
                    >
                      Urgent Tasks
                    </StatLabel>
                  </Stat>
                </VStack>
              </CardBody>
            </Card>
          </Grid>

          {/* Right side - Task Analytics */}
          <TaskChart tasks={tasks} categories={categories} />
        </Grid>

        {/* Filters */}
        {showFilters && (
          <Card bg={bgColor}>
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
        <Card bg={cardBg}>
          <CardBody>
            <Flex justify="space-between" align="center" flexWrap="wrap" gap={4} flexDirection={{ base: "column", md: "row" }}>
              <Box textAlign={{ base: "center", md: "left" }}>
                <Text fontWeight="semibold" mb={1}>
                  Showing {filteredTasks.length} of {tasks.length} tasks
                </Text>
                {hasActiveFilters() && (
                  <Text fontSize="sm" color={secondaryTextColor}>
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

        {/* Task List */}
        {filteredTasks.length === 0 ? (
          <Card bg={cardBg} borderRadius="xl" shadow="lg">
            <CardBody textAlign="center" py={16}>
              <VStack spacing={6}>
                <Box
                  p={6}
                  borderRadius="full"
                  bg={useColorModeValue('gray.100', 'gray.700')}
                >
                  <Icon as={FaTasks} boxSize={12} color={secondaryTextColor} />
                </Box>
                <VStack spacing={3}>
                  <Heading size="lg" color={secondaryTextColor}>No tasks found</Heading>
                  <Text color={secondaryTextColor} fontSize="md" maxW="md" textAlign="center">
                    {tasks.length === 0
                      ? 'Get started by creating your first task and begin organizing your workflow'
                      : 'Try adjusting your filters to see more tasks or create a new one'}
                  </Text>
                </VStack>
                {tasks.length === 0 && (
                  <Button
                    leftIcon={<Icon as={FaPlus} />}
                    colorScheme="blue"
                    size="lg"
                    onClick={handleOpenNewTaskModal}
                    borderRadius="xl"
                    px={8}
                  >
                    Create Your First Task
                  </Button>
                )}
              </VStack>
            </CardBody>
          </Card>
        ) : (
          <Card bg={cardBg} borderRadius="xl" shadow="lg" overflow="hidden">
            <Box>
              <Table variant="simple">
                <Thead bg={useColorModeValue('gray.50', 'gray.700')} display={{ base: 'none', md: 'table-header-group' }}>
                  <Tr>
                    <Th width="60px" px={6} py={4} fontSize="sm" fontWeight="bold" color={useColorModeValue('gray.700', 'gray.300')}>
                      <Icon as={FaCheckCircle} boxSize={4} />
                    </Th>
                    <Th px={6} py={4} fontSize="sm" fontWeight="bold" color={useColorModeValue('gray.700', 'gray.300')}>
                      Task Details
                    </Th>
                    <Th width="140px" display={{ base: 'none', md: 'table-cell' }} px={6} py={4} fontSize="sm" fontWeight="bold" color={useColorModeValue('gray.700', 'gray.300')}>
                      Priority
                    </Th>
                    <Th width="140px" display={{ base: 'none', md: 'table-cell' }} px={6} py={4} fontSize="sm" fontWeight="bold" color={useColorModeValue('gray.700', 'gray.300')}>
                      Status
                    </Th>
                    <Th width="180px" textAlign="right" px={6} py={4} fontSize="sm" fontWeight="bold" color={useColorModeValue('gray.700', 'gray.300')}>
                      Actions
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredTasks.map((task, index) => (
                    <Tr key={task.id}
                      display={{ base: 'flex', md: 'table-row' }}
                      flexDirection={{ base: 'column', md: 'inherit' }}
                      p={{ base: 6, md: 0 }}
                      gap={{ base: 4, md: 0 }}
                      borderBottom="1px solid"
                      borderColor={borderColor}
                      _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}
                      transition="all 0.2s ease"
                      bg={index % 2 === 0 ? useColorModeValue('white', 'gray.800') : useColorModeValue('gray.50', 'gray.750')}
                    >
                      <Td width={{ base: '100%', md: '60px' }}
                        px={{ base: 0, md: 6 }}
                        py={{ base: 0, md: 5 }}
                        display="flex"
                        alignItems="center"
                        justifyContent={{ base: 'space-between', md: 'center' }}
                        border="none"
                      >
                        <Checkbox
                          isChecked={task.status === 'COMPLETED'}
                          onChange={(e) => handleStatusChange(task.id, e.target.checked ? 'COMPLETED' : 'TODO')}
                          colorScheme="green"
                          size="lg"
                        />
                        <Box display={{ base: 'flex', md: 'none' }}>
                          <ButtonGroup size="sm" spacing={1}>
                            <IconButton
                              aria-label="Edit task"
                              icon={<Icon as={FaEdit} />}
                              onClick={() => openEditTaskModal(task)}
                              variant="ghost"
                              colorScheme="blue"
                              borderRadius="lg"
                              _hover={{ bg: 'blue.50', transform: 'scale(1.05)' }}
                              transition="all 0.2s ease"
                            />
                            <IconButton
                              aria-label="Share task"
                              icon={<Icon as={FaShare} />}
                              onClick={() => openShareModal(task)}
                              colorScheme="purple"
                              variant="ghost"
                              borderRadius="lg"
                              _hover={{ bg: 'purple.50', transform: 'scale(1.05)' }}
                              transition="all 0.2s ease"
                            />
                            <IconButton
                              aria-label="Delete task"
                              icon={<Icon as={FaTrash} />}
                              onClick={() => handleDeleteTask(task.id)}
                              colorScheme="red"
                              variant="ghost"
                              borderRadius="lg"
                              _hover={{ bg: 'red.50', transform: 'scale(1.05)' }}
                              transition="all 0.2s ease"
                            />
                          </ButtonGroup>
                        </Box>
                      </Td>
                      <Td border="none" px={{ base: 0, md: 6 }} py={{ base: 0, md: 5 }}>
                        <HStack spacing={3} align="start">
                          <VStack spacing={1} align="center" mt={1}>
                            <Tooltip label={`Priority: ${task.priority}`} placement="left">
                              <Box
                                w={3}
                                h={3}
                                borderRadius="full"
                                bg={
                                  task.priority === 'URGENT' ? 'red.500' :
                                  task.priority === 'HIGH' ? 'orange.500' :
                                  task.priority === 'MEDIUM' ? 'yellow.500' : 'green.500'
                                }
                                border="2px solid"
                                borderColor={
                                  task.priority === 'URGENT' ? 'red.200' :
                                  task.priority === 'HIGH' ? 'orange.200' :
                                  task.priority === 'MEDIUM' ? 'yellow.200' : 'green.200'
                                }
                                cursor="pointer"
                                _hover={{ transform: 'scale(1.2)' }}
                                transition="transform 0.2s ease"
                              />
                            </Tooltip>
                            <Tooltip label={`Status: ${task.status.replace('_', ' ')}`} placement="left">
                              <Box
                                w={3}
                                h={3}
                                borderRadius="full"
                                bg={
                                  task.status === 'COMPLETED' ? 'green.500' :
                                  task.status === 'IN_PROGRESS' ? 'blue.500' : 'gray.400'
                                }
                                border="2px solid"
                                borderColor={
                                  task.status === 'COMPLETED' ? 'green.200' :
                                  task.status === 'IN_PROGRESS' ? 'blue.200' : 'gray.200'
                                }
                                cursor="pointer"
                                _hover={{ transform: 'scale(1.2)' }}
                                transition="transform 0.2s ease"
                              />
                            </Tooltip>
                          </VStack>
                          <VStack align="start" spacing={2} flex={1}>
                            <Text
                              fontWeight="semibold"
                              fontSize="md"
                              textDecoration={task.status === 'COMPLETED' ? 'line-through' : 'none'}
                              color={task.status === 'COMPLETED' ? secondaryTextColor : useColorModeValue('gray.800', 'white')}
                              noOfLines={1}
                            >
                              {task.title}
                            </Text>
                            {task.description && (
                              <Text fontSize="sm" color={secondaryTextColor} noOfLines={2} lineHeight="1.4">
                                {task.description}
                              </Text>
                            )}
                            <HStack spacing={3} mt={2} display={{ base: 'flex', md: 'none' }}>
                              <HStack spacing={1}>
                                <Box
                                  w={2}
                                  h={2}
                                  borderRadius="full"
                                  bg={
                                    task.priority === 'URGENT' ? 'red.500' :
                                    task.priority === 'HIGH' ? 'orange.500' :
                                    task.priority === 'MEDIUM' ? 'yellow.500' : 'green.500'
                                  }
                                />
                                <Text fontSize="xs" color={secondaryTextColor} fontWeight="medium">
                                  {task.priority}
                                </Text>
                              </HStack>
                              <HStack spacing={1}>
                                <Box
                                  w={2}
                                  h={2}
                                  borderRadius="full"
                                  bg={
                                    task.status === 'COMPLETED' ? 'green.500' :
                                    task.status === 'IN_PROGRESS' ? 'blue.500' : 'gray.400'
                                  }
                                />
                                <Text fontSize="xs" color={secondaryTextColor} fontWeight="medium">
                                  {task.status.replace('_', ' ')}
                                </Text>
                              </HStack>
                            </HStack>
                          </VStack>
                        </HStack>
                      </Td>
                      <Td display={{ base: 'none', md: 'table-cell' }} border="none" px={6} py={5}>
                        <HStack spacing={2} align="center">
                          <Tooltip label={`Priority: ${task.priority}`} placement="top">
                            <Box
                              w={3}
                              h={3}
                              borderRadius="full"
                              bg={
                                task.priority === 'URGENT' ? 'red.500' :
                                task.priority === 'HIGH' ? 'orange.500' :
                                task.priority === 'MEDIUM' ? 'yellow.500' : 'green.500'
                              }
                              border="2px solid"
                              borderColor={
                                task.priority === 'URGENT' ? 'red.200' :
                                task.priority === 'HIGH' ? 'orange.200' :
                                task.priority === 'MEDIUM' ? 'yellow.200' : 'green.200'
                              }
                              cursor="pointer"
                              _hover={{ transform: 'scale(1.2)' }}
                              transition="transform 0.2s ease"
                            />
                          </Tooltip>
                          <Text fontSize="sm" fontWeight="medium" color={useColorModeValue('gray.700', 'gray.300')}>
                            {task.priority.toLowerCase()}
                          </Text>
                        </HStack>
                      </Td>
                      <Td display={{ base: 'none', md: 'table-cell' }} border="none" px={6} py={5}>
                        <HStack spacing={2} align="center">
                          <Tooltip label={`Status: ${task.status.replace('_', ' ')}`} placement="top">
                            <Box
                              w={3}
                              h={3}
                              borderRadius="full"
                              bg={
                                task.status === 'COMPLETED' ? 'green.500' :
                                task.status === 'IN_PROGRESS' ? 'blue.500' : 'gray.400'
                              }
                              border="2px solid"
                              borderColor={
                                task.status === 'COMPLETED' ? 'green.200' :
                                task.status === 'IN_PROGRESS' ? 'blue.200' : 'gray.200'
                              }
                              cursor="pointer"
                              _hover={{ transform: 'scale(1.2)' }}
                              transition="transform 0.2s ease"
                            />
                          </Tooltip>
                          <Text fontSize="sm" fontWeight="medium" color={useColorModeValue('gray.700', 'gray.300')}>
                            {task.status.replace('_', ' ').toLowerCase()}
                          </Text>
                        </HStack>
                      </Td>
                      <Td textAlign="right" display={{ base: 'none', md: 'table-cell' }} border="none" px={6} py={5}>
                        <ButtonGroup size="sm" spacing={2}>
                          <IconButton
                            aria-label="Edit task"
                            icon={<Icon as={FaEdit} />}
                            onClick={() => openEditTaskModal(task)}
                            variant="ghost"
                            colorScheme="blue"
                            borderRadius="lg"
                            _hover={{ bg: 'blue.50', transform: 'scale(1.05)' }}
                            transition="all 0.2s ease"
                          />
                          <IconButton
                            aria-label="Share task"
                            icon={<Icon as={FaShare} />}
                            onClick={() => openShareModal(task)}
                            colorScheme="purple"
                            variant="ghost"
                            borderRadius="lg"
                            _hover={{ bg: 'purple.50', transform: 'scale(1.05)' }}
                            transition="all 0.2s ease"
                          />
                          <IconButton
                            aria-label="Delete task"
                            icon={<Icon as={FaTrash} />}
                            onClick={() => handleDeleteTask(task.id)}
                            colorScheme="red"
                            variant="ghost"
                            borderRadius="lg"
                            _hover={{ bg: 'red.50', transform: 'scale(1.05)' }}
                            transition="all 0.2s ease"
                          />
                        </ButtonGroup>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          </Card>
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

      {/* Task List Drawer */}
      <TaskListDrawer
        isOpen={selectedCardType !== null}
        onClose={() => setSelectedCardType(null)}
        tasks={tasks}
        filterType={selectedCardType || 'total'}
        onEditTask={openEditTaskModal}
        onDeleteTask={handleDeleteTask}
        onStatusChange={handleStatusChange}
        onShareTask={openShareModal}
      />

      {/* Share Task Modal */}
      {sharingTask && (
        <ShareTaskModal
          isOpen={isShareModalOpen}
          onClose={closeShareModal}
          task={sharingTask}
          onShare={handleShareTask}
        />
      )}
    </Box>
  );
};

export default TaskList;