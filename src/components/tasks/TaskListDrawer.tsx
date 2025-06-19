import React, { useState, useEffect, useMemo } from 'react';
import {
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  Input,
  VStack,
  HStack,
  Text,
  Select,
  Box,
  Badge,
  IconButton,
  Button,
  useColorModeValue,
  InputGroup,
  InputLeftElement,
  Heading,
  Flex,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Spinner,
  Center,
} from '@chakra-ui/react';
import { FaSearch, FaEdit, FaTrash, FaCheck, FaChevronRight, FaShare } from 'react-icons/fa';
import { Task, TaskStatus } from '../../types/task';

// Custom debounce hook
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

type SortOption = 'date' | 'priority' | 'alphabetical';

interface TaskListDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  filterType: 'total' | 'inProgress' | 'completed' | 'urgent';
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onShareTask?: (task: Task) => void;
}

const TaskListDrawer: React.FC<TaskListDrawerProps> = ({
  isOpen,
  onClose,
  tasks,
  filterType,
  onEditTask,
  onDeleteTask,
  onStatusChange,
  onShareTask,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('date');
  const [isLoading, setIsLoading] = useState(false);

  // Use the debounced search value
  const searchQuery = useDebounce(searchInput, 300);

  // Color mode values
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  // Filter title and description based on type
  const filterConfig = {
    total: { title: 'All Tasks', description: 'View and manage all your tasks' },
    inProgress: { title: 'In Progress Tasks', description: 'Tasks currently being worked on' },
    completed: { title: 'Completed Tasks', description: 'Successfully completed tasks' },
    urgent: { title: 'Urgent Tasks', description: 'High priority tasks requiring immediate attention' },
  };

  // Memoized filtered and sorted tasks
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks;

    // Apply type filter
    switch (filterType) {
      case 'inProgress':
        filtered = tasks.filter(task => task.status === 'IN_PROGRESS');
        break;
      case 'completed':
        filtered = tasks.filter(task => task.status === 'COMPLETED');
        break;
      case 'urgent':
        filtered = tasks.filter(task => task.priority === 'URGENT');
        break;
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    return [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'date':
          return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
        case 'priority': {
          const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
          return (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
        }
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
  }, [tasks, filterType, searchQuery, sortOption]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    setIsLoading(true);
  };

  // Update loading state when search query changes
  useEffect(() => {
    setIsLoading(false);
  }, [searchQuery]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <Drawer
      isOpen={isOpen}
      placement="right"
      onClose={onClose}
      size="lg"
      closeOnEsc={true}
      closeOnOverlayClick={true}
    >
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px">
          <VStack align="stretch" spacing={2}>
            <Breadcrumb separator={<FaChevronRight />}>
              <BreadcrumbItem>
                <BreadcrumbLink onClick={onClose}>Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbItem isCurrentPage>
                <BreadcrumbLink>{filterConfig[filterType].title}</BreadcrumbLink>
              </BreadcrumbItem>
            </Breadcrumb>
            <Heading size="md">{filterConfig[filterType].title}</Heading>
            <Text color="gray.500" fontSize="sm">
              {filterConfig[filterType].description}
            </Text>
          </VStack>
        </DrawerHeader>

        <DrawerBody>
          <VStack spacing={4} align="stretch">
            {/* Search and Sort Controls */}
            <HStack spacing={4}>
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <FaSearch color="gray.300" />
                </InputLeftElement>
                <Input
                  placeholder="Search tasks..."
                  onChange={handleSearchChange}
                  value={searchInput}
                  aria-label="Search tasks"
                />
              </InputGroup>
              <Select
                width="200px"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                aria-label="Sort tasks"
              >
                <option value="date">Sort by Date</option>
                <option value="priority">Sort by Priority</option>
                <option value="alphabetical">Sort Alphabetically</option>
              </Select>
            </HStack>

            {/* Task Count */}
            <Text fontSize="sm" color="gray.500">
              Showing {filteredAndSortedTasks.length} tasks
            </Text>

            {/* Task List */}
            {isLoading ? (
              <Center py={8}>
                <Spinner />
              </Center>
            ) : filteredAndSortedTasks.length === 0 ? (
              <Center py={8}>
                <VStack spacing={3}>
                  <Text>No tasks found</Text>
                  <Button size="sm" onClick={onClose}>
                    Return to Dashboard
                  </Button>
                </VStack>
              </Center>
            ) : (
              <VStack spacing={3} align="stretch">
                {filteredAndSortedTasks.map((task) => (
                  <Box
                    key={task.id}
                    p={4}
                    borderWidth="1px"
                    borderRadius="lg"
                    borderColor={borderColor}
                    bg={bgColor}
                    _hover={{ bg: hoverBg }}
                    transition="background-color 0.2s"
                  >
                    <Flex justify="space-between" align="start">
                      <VStack align="start" spacing={2} flex={1}>
                        <Heading size="sm">{task.title}</Heading>
                        {task.description && (
                          <Text fontSize="sm" color="gray.500">
                            {task.description}
                          </Text>
                        )}
                        <HStack spacing={2}>
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
                      </VStack>
                      <HStack spacing={2}>
                        <IconButton
                          aria-label="Mark as complete"
                          icon={<FaCheck />}
                          size="sm"
                          colorScheme="green"
                          variant="ghost"
                          onClick={() => onStatusChange(task.id, 'COMPLETED')}
                          isDisabled={task.status === 'COMPLETED'}
                        />
                        <IconButton
                          aria-label="Edit task"
                          icon={<FaEdit />}
                          size="sm"
                          variant="ghost"
                          onClick={() => onEditTask(task)}
                        />
                        {onShareTask && (
                          <IconButton
                            aria-label="Share task"
                            icon={<FaShare />}
                            size="sm"
                            colorScheme="blue"
                            variant="ghost"
                            onClick={() => onShareTask(task)}
                          />
                        )}
                        <IconButton
                          aria-label="Delete task"
                          icon={<FaTrash />}
                          size="sm"
                          colorScheme="red"
                          variant="ghost"
                          onClick={() => onDeleteTask(task.id)}
                        />
                      </HStack>
                    </Flex>
                  </Box>
                ))}
              </VStack>
            )}
          </VStack>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
};

export default TaskListDrawer; 