import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  VStack,
  HStack,
  Grid,
  Card,
  CardBody,
  CardHeader,
  Text,
  Badge,
  IconButton,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useColorModeValue,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  Flex,
  Avatar,
  AvatarGroup,
  Tooltip,
  useToast,
  useDisclosure,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Divider
} from '@chakra-ui/react';
import { 
  FaUsers, 
  FaShare, 
  FaEye,
  FaEdit,
  FaEllipsisV,
  FaCalendarAlt
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Task, 
  SharedTask, 
  PermissionLevel,
  Category 
} from '../../types/task';
import { 
  subscribeToUserTasks,
  updateTask,
  getTaskPermissions
} from '../../services/taskService';
import { subscribeToCategories } from '../../services/categoryService';
import TaskDetailModal from '../tasks/TaskDetailModal';
import TaskForm from '../tasks/TaskForm';
import { Timestamp } from 'firebase/firestore';

const SharedTasks: React.FC = () => {
  const { currentUser } = useAuth();
  const [sharedTasks, setSharedTasks] = useState<SharedTask[]>([]);
  const [mySharedTasks, setMySharedTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  
  const { isOpen: isTaskDetailOpen, onOpen: onTaskDetailOpen, onClose: onTaskDetailClose } = useDisclosure();
  const { isOpen: isTaskFormOpen, onOpen: onTaskFormOpen, onClose: onTaskFormClose } = useDisclosure();
  const toast = useToast();
  
  // Color mode values
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  useEffect(() => {
    if (!currentUser) return;

    let unsubscribeTasks: (() => void) | undefined;
    let unsubscribeCategories: (() => void) | undefined;

    const setupSubscriptions = async () => {
      try {
        console.log(`Setting up shared tasks subscriptions for user: ${currentUser.uid}`);
        
        // Subscribe to categories
        unsubscribeCategories = subscribeToCategories(currentUser.uid, (userCategories) => {
          console.log(`Received ${userCategories.length} categories`);
          setCategories(userCategories);
        });
        
        // Subscribe to tasks (both owned and shared)
        unsubscribeTasks = subscribeToUserTasks(
          currentUser.uid,
          (userTasks, userSharedTasks) => {
            console.log(`Received ${userTasks.length} user tasks and ${userSharedTasks.length} shared tasks`);
            setMySharedTasks(userTasks.filter(t => t.isShared));
            setSharedTasks(userSharedTasks);
            setIsLoading(false);
          }
        );

      } catch (error) {
        console.error('Error setting up subscriptions:', error);
        setIsLoading(false);
        toast({
          title: 'Connection Error',
          description: 'Failed to connect to real-time updates. Please refresh the page.',
          status: 'error',
          duration: 5000,
          isClosable: true
        });
      }
    };

    setupSubscriptions();

    return () => {
      console.log('Cleaning up subscriptions');
      unsubscribeTasks?.();
      unsubscribeCategories?.();
    };
  }, [currentUser, toast]);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    onTaskDetailOpen();
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    onTaskFormOpen();
  };

  const handleUpdateTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'userId'>) => {
    if (!currentUser || !editingTask) return;

    try {
      await updateTask(
        editingTask.userId, 
        editingTask.id, 
        taskData,
        currentUser.displayName || currentUser.email || 'Unknown User'
      );
      
      toast({
        title: 'Task Updated',
        description: 'Task has been updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
      
      setEditingTask(null);
      onTaskFormClose();
    } catch (error: any) {
      console.error('Error updating task:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update task',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  const getPermissionColor = (permission: PermissionLevel) => {
    switch (permission) {
      case 'read': return 'gray';
      case 'comment': return 'blue';
      case 'edit': return 'green';
      case 'admin': return 'purple';
      default: return 'gray';
    }
  };

  const getDueDateColor = (dueDate: Timestamp | undefined) => {
    if (!dueDate) return 'gray';
    
    const now = new Date();
    const due = dueDate.toDate();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 3600 * 24));
    
    if (diffDays < 0) return 'red'; // Overdue
    if (diffDays === 0) return 'orange'; // Due today
    if (diffDays === 1) return 'yellow'; // Due tomorrow
    return 'green'; // Future
  };

  const getDueDateText = (dueDate: Timestamp | undefined) => {
    if (!dueDate) return '';
    
    const now = new Date();
    const due = dueDate.toDate();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 3600 * 24));
    
    if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} day(s)`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    return `Due in ${diffDays} day(s)`;
  };

  if (!currentUser) {
    return (
      <Container maxW="container.xl" py={8}>
        <Alert status="warning" maxW="md" mx="auto">
          <AlertIcon />
          Please log in to view shared tasks.
        </Alert>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Center h="400px">
          <VStack spacing={4}>
            <Spinner size="xl" color="blue.500" />
            <Text color="gray.600">Loading shared tasks...</Text>
          </VStack>
        </Center>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <Box>
          <Heading size="lg" mb={2}>Shared Tasks</Heading>
          <Text color="gray.600">
            Manage tasks shared with you and tasks you've shared with others
          </Text>
        </Box>

        <Tabs index={activeTab} onChange={setActiveTab} colorScheme="blue">
          <TabList>
            <Tab>Shared with Me ({sharedTasks.length})</Tab>
            <Tab>Shared by Me ({mySharedTasks.length})</Tab>
          </TabList>

          <TabPanels>
            {/* Tasks Shared with Me */}
            <TabPanel px={0}>
              {sharedTasks.length === 0 ? (
                <Card bg={cardBg}>
                  <CardBody>
                    <Center py={8}>
                      <VStack spacing={4}>
                        <Box as={FaShare} size="48px" color="gray.400" />
                        <Text color="gray.600">No tasks shared with you yet</Text>
                        <Text fontSize="sm" color="gray.500">
                          When someone shares a task with you, it will appear here
                        </Text>
                      </VStack>
                    </Center>
                  </CardBody>
                </Card>
              ) : (
                <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={4}>
                  {sharedTasks.map((sharedTask) => (
                    <Card 
                      key={sharedTask.id} 
                      bg={cardBg} 
                      borderColor={borderColor} 
                      _hover={{ shadow: "md", transform: "translateY(-2px)" }}
                      transition="all 0.2s"
                      cursor="pointer"
                    >
                      <CardHeader pb={3}>
                        <Flex justify="space-between" align="center">
                          <VStack align="start" spacing={1} flex={1}>
                            <Text 
                              fontWeight="semibold" 
                              fontSize="md" 
                              noOfLines={2}
                              onClick={() => handleTaskClick(sharedTask.taskData)}
                            >
                              {sharedTask.taskData.title}
                            </Text>
                            <HStack spacing={2}>
                              <Badge 
                                colorScheme={getPermissionColor(sharedTask.permissionLevel)} 
                                size="sm" 
                                textTransform="capitalize"
                              >
                                {sharedTask.permissionLevel}
                              </Badge>
                              <Badge colorScheme="blue" size="sm">
                                {sharedTask.taskData.status.replace('_', ' ')}
                              </Badge>
                              <Badge colorScheme="orange" size="sm">
                                {sharedTask.taskData.priority}
                              </Badge>
                            </HStack>
                          </VStack>
                          <Menu>
                            <MenuButton
                              as={IconButton}
                              aria-label="Options"
                              icon={<FaEllipsisV />}
                              variant="ghost"
                              size="sm"
                            />
                            <MenuList>
                              <MenuItem 
                                icon={<FaEye />} 
                                onClick={() => handleTaskClick(sharedTask.taskData)}
                              >
                                View Details
                              </MenuItem>
                              {getTaskPermissions(sharedTask.taskData, currentUser.uid).canEdit && (
                                <MenuItem 
                                  icon={<FaEdit />} 
                                  onClick={() => handleEditTask(sharedTask.taskData)}
                                >
                                  Edit Task
                                </MenuItem>
                              )}
                            </MenuList>
                          </Menu>
                        </Flex>
                      </CardHeader>
                      
                      <CardBody pt={0}>
                        <VStack align="start" spacing={3}>
                          <Text fontSize="sm" color="gray.600" noOfLines={3}>
                            {sharedTask.taskData.description || 'No description provided'}
                          </Text>
                          
                          <Divider />
                          
                          <VStack align="start" spacing={2} w="100%">
                            <HStack justify="space-between" w="100%">
                              <Text fontSize="xs" color="gray.500">
                                Shared by {sharedTask.ownerDisplayName}
                              </Text>
                              <Text fontSize="xs" color="gray.500">
                                {sharedTask.sharedAt.toDate().toLocaleDateString()}
                              </Text>
                            </HStack>
                            
                            {sharedTask.taskData.dueDate && (
                              <HStack spacing={1}>
                                <FaCalendarAlt size="12px" />
                                <Badge 
                                  colorScheme={getDueDateColor(sharedTask.taskData.dueDate)} 
                                  size="xs"
                                >
                                  {getDueDateText(sharedTask.taskData.dueDate)}
                                </Badge>
                              </HStack>
                            )}
                            
                            {sharedTask.taskData.collaborators && sharedTask.taskData.collaborators.length > 0 && (
                              <HStack>
                                <Text fontSize="xs" color="gray.500">Team:</Text>
                                <AvatarGroup size="xs" max={3}>
                                  {sharedTask.taskData.collaborators.map((collaborator) => (
                                    <Tooltip 
                                      key={collaborator.userId} 
                                      label={collaborator.userDisplayName}
                                    >
                                      <Avatar 
                                        name={collaborator.userDisplayName} 
                                        size="xs"
                                      />
                                    </Tooltip>
                                  ))}
                                </AvatarGroup>
                              </HStack>
                            )}
                          </VStack>
                        </VStack>
                      </CardBody>
                    </Card>
                  ))}
                </Grid>
              )}
            </TabPanel>

            {/* Tasks Shared by Me */}
            <TabPanel px={0}>
              {mySharedTasks.length === 0 ? (
                <Card bg={cardBg}>
                  <CardBody>
                    <Center py={8}>
                      <VStack spacing={4}>
                        <Box as={FaUsers} size="48px" color="gray.400" />
                        <Text color="gray.600">You haven't shared any tasks yet</Text>
                        <Text fontSize="sm" color="gray.500">
                          Share tasks with your team to collaborate effectively
                        </Text>
                      </VStack>
                    </Center>
                  </CardBody>
                </Card>
              ) : (
                <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={4}>
                  {mySharedTasks.map((task) => (
                    <Card 
                      key={task.id} 
                      bg={cardBg} 
                      borderColor={borderColor} 
                      _hover={{ shadow: "md", transform: "translateY(-2px)" }}
                      transition="all 0.2s"
                      cursor="pointer"
                    >
                      <CardHeader pb={3}>
                        <Flex justify="space-between" align="center">
                          <VStack align="start" spacing={1} flex={1}>
                            <Text 
                              fontWeight="semibold" 
                              fontSize="md" 
                              noOfLines={2}
                              onClick={() => handleTaskClick(task)}
                            >
                              {task.title}
                            </Text>
                            <HStack spacing={2}>
                              <Badge colorScheme="blue" size="sm">
                                {task.status.replace('_', ' ')}
                              </Badge>
                              <Badge colorScheme="orange" size="sm">
                                {task.priority}
                              </Badge>
                              <Badge colorScheme="purple" size="sm">
                                <HStack spacing={1}>
                                  <FaShare />
                                  <Text>Shared</Text>
                                </HStack>
                              </Badge>
                            </HStack>
                          </VStack>
                          <Menu>
                            <MenuButton
                              as={IconButton}
                              aria-label="Options"
                              icon={<FaEllipsisV />}
                              variant="ghost"
                              size="sm"
                            />
                            <MenuList>
                              <MenuItem 
                                icon={<FaEye />} 
                                onClick={() => handleTaskClick(task)}
                              >
                                View Details
                              </MenuItem>
                              <MenuItem 
                                icon={<FaEdit />} 
                                onClick={() => handleEditTask(task)}
                              >
                                Edit Task
                              </MenuItem>
                              <MenuItem 
                                icon={<FaUsers />} 
                                onClick={() => handleTaskClick(task)}
                              >
                                Manage Sharing
                              </MenuItem>
                            </MenuList>
                          </Menu>
                        </Flex>
                      </CardHeader>
                      
                      <CardBody pt={0}>
                        <VStack align="start" spacing={3}>
                          <Text fontSize="sm" color="gray.600" noOfLines={3}>
                            {task.description || 'No description provided'}
                          </Text>
                          
                          <Divider />
                          
                          <VStack align="start" spacing={2} w="100%">
                            {task.dueDate && (
                              <HStack spacing={1}>
                                <FaCalendarAlt size="12px" />
                                <Badge 
                                  colorScheme={getDueDateColor(task.dueDate)} 
                                  size="xs"
                                >
                                  {getDueDateText(task.dueDate)}
                                </Badge>
                              </HStack>
                            )}
                            
                            {task.collaborators && task.collaborators.length > 0 && (
                              <HStack>
                                <Text fontSize="xs" color="gray.500">
                                  Shared with {task.collaborators.length} user(s):
                                </Text>
                                <AvatarGroup size="xs" max={3}>
                                  {task.collaborators.map((collaborator) => (
                                    <Tooltip 
                                      key={collaborator.userId} 
                                      label={`${collaborator.userDisplayName} (${collaborator.permissionLevel})`}
                                    >
                                      <Avatar 
                                        name={collaborator.userDisplayName} 
                                        size="xs"
                                      />
                                    </Tooltip>
                                  ))}
                                </AvatarGroup>
                              </HStack>
                            )}
                          </VStack>
                        </VStack>
                      </CardBody>
                    </Card>
                  ))}
                </Grid>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          isOpen={isTaskDetailOpen}
          onClose={onTaskDetailClose}
          task={selectedTask}
          onEdit={() => handleEditTask(selectedTask)}
          onDelete={() => {}}
          onShare={() => {}}
          onStatusChange={() => {}}
        />
      )}

      {/* Task Edit Form */}
      {editingTask && (
        <TaskForm
          isOpen={isTaskFormOpen}
          onClose={onTaskFormClose}
          onSubmit={handleUpdateTask}
          categories={categories}
          initialData={editingTask}
          isEditing={true}
        />
      )}
    </Container>
  );
};

export default SharedTasks; 