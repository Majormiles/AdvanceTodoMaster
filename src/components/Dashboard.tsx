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
  Button,
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
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverCloseButton,
  PopoverArrow,
  Divider
} from '@chakra-ui/react';
import { 
  FaTasks, 
  FaUsers, 
  FaShare, 
  FaBell, 
  FaComment,
  FaClock,
  FaExclamationTriangle,
  FaCheckCircle,
  FaEye,
  FaEdit,
  FaCheck
} from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { 
  Task, 
  SharedTask, 
  TaskNotification, 
  TaskPresence,
  TaskStats 
} from '../types/task';
import { 
  subscribeToUserTasks
} from '../services/taskService';
import { 
  subscribeToNotifications, 
  markNotificationAsRead,
  updateUserPresence,
  markAllNotificationsAsRead
} from '../services/collaborationService';
import TaskList from './tasks/TaskList';
import TaskDetailModal from './tasks/TaskDetailModal';

interface DashboardSection {
  title: string;
  count: number;
  color: string;
  icon: React.ElementType;
}

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sharedTasks, setSharedTasks] = useState<SharedTask[]>([]);
  const [notifications, setNotifications] = useState<TaskNotification[]>([]);
  const [activePresence] = useState<Record<string, TaskPresence[]>>({});
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  
  const { isOpen: isTaskDetailOpen, onOpen: onTaskDetailOpen, onClose: onTaskDetailClose } = useDisclosure();
  const toast = useToast();
  
  // Color mode values
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  useEffect(() => {
    if (!currentUser) return;

    let unsubscribeTasks: (() => void) | undefined;
    let unsubscribeNotifications: (() => void) | undefined;

    const setupSubscriptions = async () => {
      try {
        console.log(`Setting up subscriptions for user: ${currentUser.uid}`);
        
        // Subscribe to tasks (both owned and shared)
        unsubscribeTasks = subscribeToUserTasks(
          currentUser.uid,
          (userTasks, userSharedTasks) => {
            console.log(`Received ${userTasks.length} user tasks and ${userSharedTasks.length} shared tasks`);
            setTasks(userTasks);
            setSharedTasks(userSharedTasks);
            setIsLoading(false);
          }
        );

        // Subscribe to notifications
        unsubscribeNotifications = subscribeToNotifications(
          currentUser.uid,
          (userNotifications) => {
            console.log(`Received ${userNotifications.length} notifications`);
            setNotifications(userNotifications);
          }
        );

        // Update user presence for active tasks
        if (selectedTask) {
          await updateUserPresence(
            currentUser.uid,
            selectedTask.id,
            currentUser.displayName || 'Anonymous User',
            true,
            false
          );
        }
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
      unsubscribeNotifications?.();
    };
  }, [currentUser, selectedTask, toast]);

  // Calculate task statistics
  const calculateStats = (): TaskStats => {
    const allTasks = [...tasks, ...sharedTasks.map(st => st.taskData)];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      total: allTasks.length,
      completed: allTasks.filter(t => t.status === 'COMPLETED').length,
      inProgress: allTasks.filter(t => t.status === 'IN_PROGRESS').length,
      todo: allTasks.filter(t => t.status === 'TODO').length,
      cancelled: allTasks.filter(t => t.status === 'CANCELLED').length,
      overdue: allTasks.filter(t => 
        t.dueDate && 
        t.dueDate.toDate() < now && 
        t.status !== 'COMPLETED' && 
        t.status !== 'CANCELLED'
      ).length,
      dueToday: allTasks.filter(t => 
        t.dueDate && 
        t.dueDate.toDate() >= today && 
        t.dueDate.toDate() < tomorrow
      ).length,
      dueTomorrow: allTasks.filter(t => 
        t.dueDate && 
        t.dueDate.toDate() >= tomorrow && 
        t.dueDate.toDate() < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)
      ).length,
      shared: tasks.filter(t => t.isShared).length,
      sharedWithMe: sharedTasks.length
    };
  };

  const stats = calculateStats();
  const unreadNotifications = notifications.filter(n => !n.readAt);

  const handleNotificationClick = async (notification: TaskNotification) => {
    try {
      // Mark as read
      await markNotificationAsRead(currentUser!.uid, notification.id);
      
      // Navigate to the task (implementation depends on your routing)
      const task = tasks.find(t => t.id === notification.taskId) || 
                   sharedTasks.find(st => st.taskData.id === notification.taskId)?.taskData;
      
      if (task) {
        setSelectedTask(task);
        onTaskDetailOpen();
      }
      
      // Close notification dropdown
      setIsNotificationOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to open notification',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      const markedCount = await markAllNotificationsAsRead(currentUser!.uid);
      
      if (markedCount > 0) {
        toast({
          title: 'Success',
          description: `${markedCount} notifications marked as read`,
          status: 'success',
          duration: 2000,
          isClosable: true
        });
      } else {
        toast({
          title: 'Info',
          description: 'No unread notifications to mark',
          status: 'info',
          duration: 2000,
          isClosable: true
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to mark notifications as read',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  const getNotificationIcon = (type: TaskNotification['type']) => {
    switch (type) {
      case 'task_shared':
        return FaShare;
      case 'comment_added':
        return FaComment;
      case 'status_changed':
        return FaCheckCircle;
      case 'permission_changed':
        return FaEdit;
      default:
        return FaBell;
    }
  };

  const getNotificationColor = (type: TaskNotification['type']) => {
    switch (type) {
      case 'task_shared':
        return 'purple.500';
      case 'comment_added':
        return 'blue.500';
      case 'status_changed':
        return 'green.500';
      case 'permission_changed':
        return 'orange.500';
      default:
        return 'gray.500';
    }
  };

  const dashboardSections: DashboardSection[] = [
    { title: 'Total Tasks', count: stats.total, color: 'blue', icon: FaTasks },
    { title: 'Completed', count: stats.completed, color: 'green', icon: FaCheckCircle },
    { title: 'In Progress', count: stats.inProgress, color: 'yellow', icon: FaClock },
    { title: 'Overdue', count: stats.overdue, color: 'red', icon: FaExclamationTriangle },
    { title: 'Shared Tasks', count: stats.shared, color: 'purple', icon: FaShare },
    { title: 'Shared with Me', count: stats.sharedWithMe, color: 'cyan', icon: FaUsers },
  ];

  const getRecentActivity = () => {
    const recentNotifications = notifications.slice(0, 5);
    return recentNotifications;
  };

  if (!currentUser) {
    return (
      <Center h="400px">
        <Alert status="warning" maxW="md">
          <AlertIcon />
          Please log in to view your dashboard.
        </Alert>
      </Center>
    );
  }

  if (isLoading) {
    return (
      <Center h="400px">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text>Loading your dashboard...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box bg={bgColor} minH="100vh" py={8}>
      <Container maxW="7xl">
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
            <Box>
              <Heading size="xl" mb={2}>
                Welcome back, {currentUser.displayName || 'User'}!
              </Heading>
              <Text color="gray.600">
                Here's what's happening with your tasks today.
              </Text>
            </Box>
            
            {/* Notifications */}
            <HStack spacing={4}>
              <Popover isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} placement="bottom-end">
                <PopoverTrigger>
                  <Box position="relative">
                    <IconButton
                      aria-label="Notifications"
                      icon={<FaBell />}
                      variant="outline"
                      colorScheme="blue"
                      onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                    />
                    {unreadNotifications.length > 0 && (
                      <Badge
                        position="absolute"
                        top="-1"
                        right="-1"
                        colorScheme="red"
                        borderRadius="full"
                        px={2}
                        fontSize="xs"
                        minW="20px"
                        h="20px"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        {unreadNotifications.length > 99 ? '99+' : unreadNotifications.length}
                      </Badge>
                    )}
                  </Box>
                </PopoverTrigger>
                <PopoverContent w="400px" maxH="500px">
                  <PopoverArrow />
                  <PopoverCloseButton />
                  <PopoverHeader>
                    <Flex justify="space-between" align="center">
                      <Text fontWeight="semibold">Notifications ({unreadNotifications.length})</Text>
                      {unreadNotifications.length > 0 && (
                        <Button
                          size="xs"
                          variant="ghost"
                          colorScheme="blue"
                          onClick={handleMarkAllNotificationsRead}
                          leftIcon={<FaCheck />}
                        >
                          Mark all read
                        </Button>
                      )}
                    </Flex>
                  </PopoverHeader>
                  <PopoverBody p={0} overflowY="auto" maxH="400px">
                    {notifications.length === 0 ? (
                      <Center py={8}>
                        <VStack spacing={2}>
                          <FaBell size={24} color="gray" />
                          <Text color="gray.500" fontSize="sm">No notifications yet</Text>
                        </VStack>
                      </Center>
                    ) : (
                      <VStack spacing={0} align="stretch">
                        {notifications.slice(0, 10).map((notification, index) => {
                          const IconComponent = getNotificationIcon(notification.type);
                          const iconColor = getNotificationColor(notification.type);
                          
                          return (
                            <Box key={notification.id}>
                              <Box
                                p={3}
                                bg={notification.readAt ? "transparent" : "blue.50"}
                                cursor="pointer"
                                onClick={() => handleNotificationClick(notification)}
                                _hover={{ bg: "gray.50" }}
                                borderLeft={notification.readAt ? "none" : "3px solid"}
                                borderLeftColor="blue.400"
                              >
                                <HStack spacing={3} align="start">
                                  <Box as={IconComponent} color={iconColor} mt={1} flexShrink={0} />
                                  <VStack align="start" spacing={1} flex={1} minW={0}>
                                    <Text fontWeight={notification.readAt ? "normal" : "semibold"} fontSize="sm" noOfLines={2}>
                                      {notification.title}
                                    </Text>
                                    <Text fontSize="xs" color="gray.600" noOfLines={2}>
                                      {notification.message}
                                    </Text>
                                    <Text fontSize="xs" color="gray.500">
                                      {notification.createdAt.toDate().toLocaleDateString()} at{' '}
                                      {notification.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                  </VStack>
                                  {!notification.readAt && (
                                    <Badge colorScheme="blue" size="sm" flexShrink={0}>New</Badge>
                                  )}
                                </HStack>
                              </Box>
                              {index < notifications.length - 1 && <Divider />}
                            </Box>
                          );
                        })}
                        
                        {notifications.length > 10 && (
                          <Box p={3} borderTop="1px solid" borderTopColor={borderColor}>
                            <Text fontSize="sm" color="blue.500" textAlign="center" cursor="pointer">
                              View all notifications
                            </Text>
                          </Box>
                        )}
                      </VStack>
                    )}
                  </PopoverBody>
                </PopoverContent>
              </Popover>
            </HStack>
          </Flex>

          {/* Statistics Grid */}
          <Grid templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(6, 1fr)" }} gap={6}>
            {dashboardSections.map((section, index) => (
              <Card key={index} bg={cardBg} borderColor={borderColor}>
                <CardBody>
                  <VStack spacing={3}>
                    <HStack>
                      <Box as={section.icon} color={`${section.color}.500`} size="24px" />
                      <Text fontSize="sm" fontWeight="medium" color="gray.600">
                        {section.title}
                      </Text>
                    </HStack>
                    <Text fontSize="2xl" fontWeight="bold" color={`${section.color}.500`}>
                      {section.count}
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </Grid>

          {/* Main Content Tabs */}
          <Tabs index={activeTab} onChange={setActiveTab} colorScheme="blue">
            <TabList>
              <Tab>My Tasks ({tasks.length})</Tab>
              <Tab>Shared with Me ({sharedTasks.length})</Tab>
              <Tab>Shared by Me ({stats.shared})</Tab>
              <Tab>Team Activity</Tab>
            </TabList>

            <TabPanels>
              {/* My Tasks */}
              <TabPanel px={0}>
                <TaskList />
              </TabPanel>

              {/* Shared with Me */}
              <TabPanel px={0}>
                <VStack spacing={4} align="stretch">
                  {isLoading ? (
                    <Center py={8}>
                      <Spinner size="lg" color="blue.500" />
                    </Center>
                  ) : sharedTasks.length === 0 ? (
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
                    sharedTasks.map((sharedTask) => (
                      <Card key={sharedTask.id} bg={cardBg} borderColor={borderColor} _hover={{ shadow: "md" }}>
                        <CardBody>
                          <Flex justify="space-between" align="center">
                            <VStack align="start" spacing={2}>
                              <HStack>
                                <Text fontWeight="semibold" fontSize="lg">{sharedTask.taskData.title}</Text>
                                <Badge colorScheme="purple" size="sm" textTransform="capitalize">
                                  {sharedTask.permissionLevel}
                                </Badge>
                                {sharedTask.taskData.dueDate && (
                                  <Badge 
                                    colorScheme={
                                      sharedTask.taskData.dueDate.toDate() < new Date() ? "red" :
                                      sharedTask.taskData.dueDate.toDate() < new Date(Date.now() + 24 * 60 * 60 * 1000) ? "yellow" : "green"
                                    } 
                                    size="sm"
                                  >
                                    Due {sharedTask.taskData.dueDate.toDate().toLocaleDateString()}
                                  </Badge>
                                )}
                              </HStack>
                              <Text fontSize="sm" color="gray.600">
                                Shared by {sharedTask.ownerDisplayName} • {sharedTask.sharedAt.toDate().toLocaleDateString()}
                              </Text>
                              {sharedTask.taskData.description && (
                                <Text fontSize="sm" color="gray.700" noOfLines={2}>
                                  {sharedTask.taskData.description}
                                </Text>
                              )}
                              <HStack>
                                <Badge colorScheme="blue">
                                  {sharedTask.taskData.status.replace('_', ' ')}
                                </Badge>
                                <Badge colorScheme="orange">
                                  {sharedTask.taskData.priority}
                                </Badge>
                                {sharedTask.taskData.collaborators && sharedTask.taskData.collaborators.length > 1 && (
                                  <Badge colorScheme="green">
                                    {sharedTask.taskData.collaborators.length} collaborators
                                  </Badge>
                                )}
                              </HStack>
                            </VStack>
                            
                            <VStack align="end" spacing={2}>
                              <Button
                                size="sm"
                                colorScheme="blue"
                                variant="outline"
                                onClick={() => {
                                  setSelectedTask(sharedTask.taskData);
                                  onTaskDetailOpen();
                                }}
                                leftIcon={<FaEye />}
                              >
                                View Details
                              </Button>
                              {sharedTask.taskData.collaborators && sharedTask.taskData.collaborators.length > 0 && (
                                <AvatarGroup size="sm" max={3}>
                                  {sharedTask.taskData.collaborators.map((collaborator) => (
                                    <Tooltip key={collaborator.userId} label={collaborator.userDisplayName}>
                                      <Avatar
                                        name={collaborator.userDisplayName}
                                        src={collaborator.userPhotoURL}
                                        size="sm"
                                      />
                                    </Tooltip>
                                  ))}
                                </AvatarGroup>
                              )}
                            </VStack>
                          </Flex>
                        </CardBody>
                      </Card>
                    ))
                  )}
                </VStack>
              </TabPanel>

              {/* Shared by Me */}
              <TabPanel px={0}>
                <VStack spacing={4} align="stretch">
                  {isLoading ? (
                    <Center py={8}>
                      <Spinner size="lg" color="blue.500" />
                    </Center>
                  ) : tasks.filter(t => t.isShared).length === 0 ? (
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
                    tasks.filter(t => t.isShared).map((task) => (
                      <Card key={task.id} bg={cardBg} borderColor={borderColor} _hover={{ shadow: "md" }}>
                        <CardBody>
                          <Flex justify="space-between" align="center">
                            <VStack align="start" spacing={2}>
                              <HStack>
                                <Text fontWeight="semibold" fontSize="lg">{task.title}</Text>
                                <Badge colorScheme="green" size="sm">Owner</Badge>
                                {task.dueDate && (
                                  <Badge 
                                    colorScheme={
                                      task.dueDate.toDate() < new Date() ? "red" :
                                      task.dueDate.toDate() < new Date(Date.now() + 24 * 60 * 60 * 1000) ? "yellow" : "green"
                                    } 
                                    size="sm"
                                  >
                                    Due {task.dueDate.toDate().toLocaleDateString()}
                                  </Badge>
                                )}
                              </HStack>
                              <Text fontSize="sm" color="gray.600">
                                Shared with {task.sharing?.length || 0} collaborator(s) • 
                                {task.collaborators && task.collaborators.length > 0 && (
                                  <> {task.collaborators.length} active collaborators</>
                                )}
                              </Text>
                              {task.description && (
                                <Text fontSize="sm" color="gray.700" noOfLines={2}>
                                  {task.description}
                                </Text>
                              )}
                              <HStack>
                                <Badge colorScheme="blue">{task.status.replace('_', ' ')}</Badge>
                                <Badge colorScheme="orange">{task.priority}</Badge>
                                <Badge colorScheme="purple">
                                  <HStack spacing={1}>
                                    <FaShare />
                                    <Text>Shared</Text>
                                  </HStack>
                                </Badge>
                              </HStack>
                            </VStack>
                            
                            <VStack align="end" spacing={2}>
                              <Button
                                size="sm"
                                colorScheme="blue"
                                variant="outline"
                                onClick={() => {
                                  setSelectedTask(task);
                                  onTaskDetailOpen();
                                }}
                                leftIcon={<FaEdit />}
                              >
                                Manage
                              </Button>
                              {task.collaborators && task.collaborators.length > 0 && (
                                <AvatarGroup size="sm" max={3}>
                                  {task.collaborators.map((collaborator) => (
                                    <Tooltip key={collaborator.userId} label={collaborator.userDisplayName}>
                                      <Avatar
                                        name={collaborator.userDisplayName}
                                        src={collaborator.userPhotoURL}
                                        size="sm"
                                      />
                                    </Tooltip>
                                  ))}
                                </AvatarGroup>
                              )}
                            </VStack>
                          </Flex>
                        </CardBody>
                      </Card>
                    ))
                  )}
                </VStack>
              </TabPanel>

              {/* Team Activity */}
              <TabPanel px={0}>
                <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={6}>
                  {/* Recent Activity */}
                  <Card bg={cardBg}>
                    <CardHeader>
                      <Heading size="md">Recent Activity</Heading>
                    </CardHeader>
                    <CardBody>
                      <VStack spacing={4} align="stretch">
                        {getRecentActivity().length === 0 ? (
                          <Text color="gray.600" textAlign="center" py={4}>
                            No recent activity
                          </Text>
                        ) : (
                          getRecentActivity().map((notification) => (
                            <Box
                              key={notification.id}
                              p={3}
                              borderRadius="md"
                              bg={notification.readAt ? "gray.50" : "blue.50"}
                              cursor="pointer"
                              onClick={() => handleNotificationClick(notification)}
                              _hover={{ bg: "blue.100" }}
                            >
                              <HStack spacing={3}>
                                <Box as={FaComment} color="blue.500" />
                                <VStack align="start" spacing={1} flex={1}>
                                  <Text fontWeight="semibold" fontSize="sm">
                                    {notification.title}
                                  </Text>
                                  <Text fontSize="sm" color="gray.600">
                                    {notification.message}
                                  </Text>
                                  <Text fontSize="xs" color="gray.500">
                                    {notification.createdAt.toDate().toLocaleDateString()}
                                  </Text>
                                </VStack>
                                {!notification.readAt && (
                                  <Badge colorScheme="blue" size="sm">New</Badge>
                                )}
                              </HStack>
                            </Box>
                          ))
                        )}
                      </VStack>
                    </CardBody>
                  </Card>

                  {/* Active Collaborators */}
                  <Card bg={cardBg}>
                    <CardHeader>
                      <Heading size="md">Active Collaborators</Heading>
                    </CardHeader>
                    <CardBody>
                      <VStack spacing={4} align="stretch">
                        {Object.entries(activePresence).length === 0 ? (
                          <Text color="gray.600" textAlign="center" py={4}>
                            No active collaborators
                          </Text>
                        ) : (
                          Object.entries(activePresence).map(([taskId, presence]) => (
                            <Box key={taskId}>
                              <Text fontWeight="semibold" fontSize="sm" mb={2}>
                                Task: {tasks.find(t => t.id === taskId)?.title || 'Unknown'}
                              </Text>
                              {presence.map((p) => (
                                <HStack key={p.userId} spacing={3} py={2}>
                                  <Avatar size="sm" name={p.userDisplayName} />
                                  <VStack align="start" spacing={0}>
                                    <Text fontSize="sm" fontWeight="medium">
                                      {p.userDisplayName}
                                    </Text>
                                    <HStack spacing={2}>
                                      {p.isViewing && (
                                        <Badge colorScheme="green" size="sm">
                                          <HStack spacing={1}>
                                            <Box as={FaEye} />
                                            <Text>Viewing</Text>
                                          </HStack>
                                        </Badge>
                                      )}
                                      {p.isEditing && (
                                        <Badge colorScheme="orange" size="sm">
                                          <HStack spacing={1}>
                                            <Box as={FaEdit} />
                                            <Text>Editing</Text>
                                          </HStack>
                                        </Badge>
                                      )}
                                    </HStack>
                                  </VStack>
                                </HStack>
                              ))}
                            </Box>
                          ))
                        )}
                      </VStack>
                    </CardBody>
                  </Card>
                </Grid>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </Container>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          isOpen={isTaskDetailOpen}
          onClose={onTaskDetailClose}
          task={selectedTask}
          category={undefined}
          onEdit={() => {}}
          onDelete={() => {}}
          onShare={() => Promise.resolve()}
          onStatusChange={() => {}}
        />
      )}
    </Box>
  );
};

export default Dashboard; 