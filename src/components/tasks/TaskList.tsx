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
import { Task, TaskStatus, TaskPriority, Category, TaskFilter } from '../../types/task';
import { useAuth } from '../../contexts/AuthContext';
import { getUserTasks, createTask, deleteTask } from '../../services/taskService';
import { subscribeToCategories } from '../../services/categoryService';
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
                <Pie
                  data={getChartData()}
                  options={{
                    maintainAspectRatio: false,
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          padding: 20,
                          usePointStyle: true,
                          font: {
                            size: 12
                          }
                        }
                      },
                      tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        titleColor: '#f8fafc',
                        bodyColor: '#e2e8f0',
                        borderColor: 'rgba(148, 163, 184, 0.2)',
                        borderWidth: 1,
                        cornerRadius: 12,
                        displayColors: true,
                        padding: 12,
                        titleFont: { size: 14 },
                        bodyFont: { size: 13 },
                        callbacks: {
                          label: function (context: TooltipItem<"pie">) {
                            const label = context.label || '';
                            const value = context.raw as number;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                          }
                        }
                      }
                    },
                    hover: {
                      mode: 'nearest',
                      intersect: true,
                    },
                    animation: {
                      animateRotate: true,
                      animateScale: true,
                      duration: 1200
                    },
                    elements: {
                      arc: {
                        borderWidth: 0,
                        hoverBorderWidth: 0,
                        spacing: 2,
                      }
                    },
                    interaction: {
                      intersect: false,
                      mode: 'point'
                    }
                  }}
                />
              </Box>
            </TabPanel>
            <TabPanel>
              <Box height="300px">
                <Pie
                  data={getChartData()}
                  options={{
                    maintainAspectRatio: false,
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          padding: 20,
                          usePointStyle: true,
                        }
                      },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#333',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true,
                        padding: 12,
                        titleFont: { size: 14 },
                        bodyFont: { size: 13 },
                        callbacks: {
                          label: function (context: TooltipItem<"pie">) {
                            const label = context.label || '';
                            const value = context.raw as number;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                          }
                        }
                      }
                    },
                    hover: {
                      mode: 'nearest',
                      intersect: true,
                    },
                    animation: {
                      animateRotate: true,
                      animateScale: true,
                      duration: 1000,
                    },
                    elements: {
                      arc: {
                        borderWidth: 2,
                        borderColor: '#fff',
                        hoverBorderWidth: 5,
                        hoverBorderColor: '#333',
                      }
                    },
                    interaction: {
                      intersect: false,
                      mode: 'index'
                    }
                  }}
                />
              </Box>
            </TabPanel>
            <TabPanel>
              <Box height="300px">
                <Pie
                  data={getChartData()}
                  options={{
                    maintainAspectRatio: false,
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          padding: 20,
                          usePointStyle: true,
                        }
                      },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#333',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true,
                        padding: 12,
                        titleFont: { size: 14 },
                        bodyFont: { size: 13 },
                        callbacks: {
                          label: function (context: TooltipItem<"pie">) {
                            const label = context.label || '';
                            const value = context.raw as number;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                          }
                        }
                      }
                    },
                    hover: {
                      mode: 'nearest',
                      intersect: true,
                    },
                    animation: {
                      animateRotate: true,
                      animateScale: true,
                      duration: 1000,
                    },
                    elements: {
                      arc: {
                        borderWidth: 2,
                        borderColor: '#fff',
                        hoverBorderWidth: 5,
                        hoverBorderColor: '#333',
                      }
                    },
                    interaction: {
                      intersect: false,
                      mode: 'index'
                    }
                  }}
                />
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

  // Color mode values
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'whiteAlpha.900');
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const secondaryTextColor = useColorModeValue('gray.600', 'gray.400');
  const tableBg = useColorModeValue('white', 'gray.800');

  // New state for TaskListDrawer
  const [selectedCardType, setSelectedCardType] = useState<'total' | 'inProgress' | 'completed' | 'urgent' | null>(null);

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
        <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={6}>
          {/* Left side - Statistics Cards */}
          <Grid templateColumns={{ base: "repeat(2, 1fr)", lg: "repeat(2, 1fr)" }} gap={{ base: 3, md: 6 }}>
            <Card 
              size={{ base: "sm", md: "md" }} 
              bg={bgColor}
              onClick={() => setSelectedCardType('total')}
              cursor="pointer"
              transition="all 0.2s"
              _hover={{ transform: 'translateY(-2px)', shadow: 'md' }}
              role="button"
              aria-label="View all tasks"
            >
              <CardBody textAlign="center" py={{ base: 3, md: 6 }}>
                <Icon as={FaTasks} boxSize={{ base: 6, md: 8 }} color="blue.500" mb={{ base: 2, md: 3 }} />
                <Stat>
                  <StatNumber fontSize={{ base: "lg", md: "2xl" }}>{taskStats.total}</StatNumber>
                  <StatLabel fontSize={{ base: "xs", md: "sm" }}>Total Tasks</StatLabel>
                </Stat>
              </CardBody>
            </Card>

            <Card 
              size={{ base: "sm", md: "md" }} 
              bg={bgColor}
              onClick={() => setSelectedCardType('inProgress')}
              cursor="pointer"
              transition="all 0.2s"
              _hover={{ transform: 'translateY(-2px)', shadow: 'md' }}
              role="button"
              aria-label="View in-progress tasks"
            >
              <CardBody textAlign="center" py={{ base: 3, md: 6 }}>
                <Icon as={FaClock} boxSize={{ base: 6, md: 8 }} color="orange.500" mb={{ base: 2, md: 3 }} />
                <Stat>
                  <StatNumber fontSize={{ base: "lg", md: "2xl" }}>{taskStats.inProgress}</StatNumber>
                  <StatLabel fontSize={{ base: "xs", md: "sm" }}>In Progress</StatLabel>
                </Stat>
              </CardBody>
            </Card>

            <Card 
              size={{ base: "sm", md: "md" }} 
              bg={bgColor}
              onClick={() => setSelectedCardType('completed')}
              cursor="pointer"
              transition="all 0.2s"
              _hover={{ transform: 'translateY(-2px)', shadow: 'md' }}
              role="button"
              aria-label="View completed tasks"
            >
              <CardBody textAlign="center" py={{ base: 3, md: 6 }}>
                <Icon as={FaCheckCircle} boxSize={{ base: 6, md: 8 }} color="green.500" mb={{ base: 2, md: 3 }} />
                <Stat>
                  <StatNumber fontSize={{ base: "lg", md: "2xl" }}>{completionRate}%</StatNumber>
                  <StatLabel fontSize={{ base: "xs", md: "sm" }}>Completion Rate</StatLabel>
                </Stat>
              </CardBody>
            </Card>

            <Card 
              size={{ base: "sm", md: "md" }} 
              bg={bgColor}
              onClick={() => setSelectedCardType('urgent')}
              cursor="pointer"
              transition="all 0.2s"
              _hover={{ transform: 'translateY(-2px)', shadow: 'md' }}
              role="button"
              aria-label="View urgent tasks"
            >
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
          <Box textAlign="center" py={12} bg={bgColor} rounded="md" shadow="sm">
            <Icon as={FaTasks} boxSize={16} color={secondaryTextColor} mb={4} />
            <Heading size="md" mb={2} color={secondaryTextColor}>No tasks found</Heading>
            <Text color={secondaryTextColor} mb={6}>
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
          </Box>
        ) : (
          <Box bg={tableBg} rounded="md" shadow="sm">
            <Table variant="simple">
              <Thead display={{ base: 'none', md: 'table-header-group' }}>
                <Tr>
                  <Th width="40px" px={4}></Th>
                  <Th>Task</Th>
                  <Th width={{ md: '120px' }} display={{ base: 'none', md: 'table-cell' }}>Priority</Th>
                  <Th width={{ md: '120px' }} display={{ base: 'none', md: 'table-cell' }}>Status</Th>
                  <Th width={{ md: '150px' }} textAlign="right">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredTasks.map((task) => (
                  <Tr key={task.id}
                    display={{ base: 'flex', md: 'table-row' }}
                    flexDirection={{ base: 'column', md: 'inherit' }}
                    p={{ base: 4, md: 0 }}
                    gap={{ base: 3, md: 0 }}
                    borderBottom="1px solid"
                    borderColor={borderColor}
                  >
                    <Td width={{ base: '100%', md: '40px' }}
                      px={{ base: 0, md: 4 }}
                      py={{ base: 0, md: 4 }}
                      display="flex"
                      alignItems="center"
                      border="none"
                    >
                      <Checkbox
                        isChecked={task.status === 'COMPLETED'}
                        onChange={(e) => handleStatusChange(task.id, e.target.checked ? 'COMPLETED' : 'TODO')}
                        colorScheme="green"
                      />
                      <Box display={{ base: 'flex', md: 'none' }} ml={3}>
                        <ButtonGroup size="sm" spacing={2}>
                          <IconButton
                            aria-label="Edit task"
                            icon={<Icon as={FaEdit} />}
                            onClick={() => openEditTaskModal(task)}
                            variant="ghost"
                          />
                          <IconButton
                            aria-label="Delete task"
                            icon={<Icon as={FaTrash} />}
                            onClick={() => handleDeleteTask(task.id)}
                            colorScheme="red"
                            variant="ghost"
                          />
                        </ButtonGroup>
                      </Box>
                    </Td>
                    <Td border="none" px={{ base: 0, md: 4 }} py={{ base: 0, md: 4 }}>
                      <Text
                        fontWeight="medium"
                        textDecoration={task.status === 'COMPLETED' ? 'line-through' : 'none'}
                        color={task.status === 'COMPLETED' ? secondaryTextColor : 'inherit'}
                      >
                        {task.title}
                      </Text>
                      {task.description && (
                        <Text fontSize="sm" color={secondaryTextColor} noOfLines={2}>
                          {task.description}
                        </Text>
                      )}
                      <HStack spacing={2} mt={2} display={{ base: 'flex', md: 'none' }}>
                        <Badge colorScheme={
                          task.priority === 'URGENT' ? 'red' :
                            task.priority === 'HIGH' ? 'orange' :
                              task.priority === 'MEDIUM' ? 'yellow' : 'green'
                        }>
                          {task.priority}
                        </Badge>
                        <Badge colorScheme={
                          task.status === 'COMPLETED' ? 'green' :
                            task.status === 'IN_PROGRESS' ? 'blue' : 'gray'
                        }>
                          {task.status}
                        </Badge>
                      </HStack>
                    </Td>
                    <Td display={{ base: 'none', md: 'table-cell' }} border="none">
                      <Badge colorScheme={
                        task.priority === 'URGENT' ? 'red' :
                          task.priority === 'HIGH' ? 'orange' :
                            task.priority === 'MEDIUM' ? 'yellow' : 'green'
                      }>
                        {task.priority}
                      </Badge>
                    </Td>
                    <Td display={{ base: 'none', md: 'table-cell' }} border="none">
                      <Badge colorScheme={
                        task.status === 'COMPLETED' ? 'green' :
                          task.status === 'IN_PROGRESS' ? 'blue' : 'gray'
                      }>
                        {task.status}
                      </Badge>
                    </Td>
                    <Td textAlign="right" display={{ base: 'none', md: 'table-cell' }} border="none">
                      <ButtonGroup size="sm" spacing={2}>
                        <IconButton
                          aria-label="Edit task"
                          icon={<Icon as={FaEdit} />}
                          onClick={() => openEditTaskModal(task)}
                          variant="ghost"
                        />
                        <IconButton
                          aria-label="Delete task"
                          icon={<Icon as={FaTrash} />}
                          onClick={() => handleDeleteTask(task.id)}
                          colorScheme="red"
                          variant="ghost"
                        />
                      </ButtonGroup>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
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
      />
    </Box>
  );
};

export default TaskList;