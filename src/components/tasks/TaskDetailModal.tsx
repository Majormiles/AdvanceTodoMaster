import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  Text,
  Box,
  Divider,
  Badge,
  Tag,
  TagLabel,
  Flex,
  useColorModeValue,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Textarea,
  useToast,
  Select,
  FormControl
} from '@chakra-ui/react';
import { Task, Category, TaskStatus, TaskComment } from '../../types/task';
import { 
  FaCalendarAlt, 
  FaTag, 
  FaEllipsisV, 
  FaEdit, 
  FaTrash, 
  FaShare,
  FaComments,
  FaPaperPlane
} from 'react-icons/fa';
import { format } from 'date-fns';
import { addTaskComment, subscribeToTaskComments, getTaskPermissions } from '../../services/taskService';
import { notifyCollaborators } from '../../services/collaborationService';
import { useAuth } from '../../contexts/AuthContext';

const STATUS_COLOR_MAP = {
  'TODO': 'gray',
  'IN_PROGRESS': 'blue',
  'COMPLETED': 'green',
  'CANCELLED': 'red'
};

const PRIORITY_COLOR_MAP = {
  'LOW': 'gray',
  'MEDIUM': 'blue',
  'HIGH': 'orange',
  'URGENT': 'red'
};

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  category?: Category;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
  onStatusChange: (status: TaskStatus) => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  task,
  category,
  onEdit,
  onDelete,
  onShare,
  onStatusChange
}) => {
  const { currentUser } = useAuth();
  const toast = useToast();
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  
  // Background colors
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const commentBg = useColorModeValue('gray.50', 'gray.700');
  
  // Set up real-time comment subscription when modal opens
  useEffect(() => {
    if (isOpen && task.id) {
      setIsLoadingComments(true);
      
      const unsubscribe = subscribeToTaskComments(task.id, (taskComments) => {
        setComments(taskComments);
        setIsLoadingComments(false);
      });

      return () => {
        unsubscribe();
      };
    } else {
      setComments([]);
      setIsLoadingComments(true);
    }
  }, [isOpen, task.id]);
  
  // Format dates
  const formattedDueDate = task.dueDate 
    ? format(task.dueDate.toDate(), 'MMMM d, yyyy h:mm a')
    : 'No due date';
  
  const formattedCreatedAt = format(task.createdAt.toDate(), 'MMMM d, yyyy');
  
  // Check if task is overdue
  const isOverdue = task.dueDate && task.status !== 'COMPLETED' && task.status !== 'CANCELLED'
    ? task.dueDate.toDate() < new Date()
    : false;
  
  // Handle status change
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as TaskStatus;
    onStatusChange(newStatus);
  };
  
  // Handle comment submission
  const handleSubmitComment = async () => {
    if (!comment.trim() || !currentUser) return;
    
    // Check permissions for commenting
    const permissions = getTaskPermissions(task, currentUser.uid);
    if (!permissions.canComment) {
      toast({
        title: 'Permission Denied',
        description: 'You do not have permission to comment on this task',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }
    
    try {
      setIsSubmittingComment(true);
      
      // Add comment to Firestore (always use the original task ID)
      await addTaskComment(
        task.id,
        currentUser.uid,
        currentUser.displayName || currentUser.email || 'Anonymous User',
        comment.trim()
      );
      
      // Notify all collaborators including the task owner about the new comment
      await notifyCollaborators(
        task,
        'comment_added',
        currentUser.uid,
        currentUser.displayName || currentUser.email || 'Anonymous User',
        { commentContent: comment.trim() }
      );
      
      toast({
        title: 'Comment added',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
      
      setComment('');
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add comment',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setIsSubmittingComment(false);
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <Flex justify="space-between" align="center">
            <Text>{task.title}</Text>
            <Menu>
              <MenuButton
                as={IconButton}
                aria-label="Options"
                icon={<FaEllipsisV />}
                variant="ghost"
                size="sm"
              />
              <MenuList>
                <MenuItem icon={<FaEdit />} onClick={onEdit}>
                  Edit
                </MenuItem>
                <MenuItem icon={<FaShare />} onClick={onShare}>
                  Share
                </MenuItem>
                <MenuItem icon={<FaTrash />} onClick={onDelete} color="red.500">
                  Delete
                </MenuItem>
              </MenuList>
            </Menu>
          </Flex>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={6} align="stretch">
            {/* Status and Priority */}
            <HStack spacing={4}>
              <FormControl>
                <HStack>
                  <Text fontWeight="semibold">Status:</Text>
                  <Select
                    value={task.status}
                    onChange={handleStatusChange}
                    width="150px"
                    size="sm"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </Select>
                </HStack>
              </FormControl>
              
              <Badge colorScheme={PRIORITY_COLOR_MAP[task.priority]} px={2} py={1}>
                {task.priority} Priority
              </Badge>
            </HStack>
            
            {/* Description */}
            <VStack align="stretch" spacing={1}>
              <Text fontWeight="semibold">Description</Text>
              <Box
                p={3}
                borderWidth="1px"
                borderRadius="md"
                borderColor={borderColor}
                minHeight="100px"
              >
                {task.description || 'No description provided.'}
              </Box>
            </VStack>
            
            {/* Task Details */}
            <VStack align="stretch" spacing={3}>
              <Box>
                <HStack>
                  <Box as={FaCalendarAlt} color={isOverdue ? 'red.500' : 'blue.500'} />
                  <Text fontWeight="semibold">Due Date:</Text>
                  <Text color={isOverdue ? 'red.500' : 'inherit'}>
                    {formattedDueDate} 
                    {isOverdue && ' (Overdue)'}
                  </Text>
                </HStack>
              </Box>
              
              <Box>
                <HStack>
                  <Box as={FaCalendarAlt} color="green.500" />
                  <Text fontWeight="semibold">Created:</Text>
                  <Text>{formattedCreatedAt}</Text>
                </HStack>
              </Box>
              
              {category && (
                <Box>
                  <HStack>
                    <Box as={FaTag} color="purple.500" />
                    <Text fontWeight="semibold">Category:</Text>
                    <Tag colorScheme="purple">
                      {category.name}
                    </Tag>
                  </HStack>
                </Box>
              )}
              
              {/* Tags */}
              {task.tags && task.tags.length > 0 && (
                <VStack align="stretch" spacing={1}>
                  <Text fontWeight="semibold">Tags</Text>
                  <Flex wrap="wrap" gap={2}>
                    {task.tags.map((tag, index) => (
                      <Tag key={index} size="md" colorScheme="blue" variant="solid">
                        <TagLabel>{tag}</TagLabel>
                      </Tag>
                    ))}
                  </Flex>
                </VStack>
              )}
            </VStack>
            
            <Divider />
            
            {/* Comments */}
            <VStack align="stretch" spacing={4}>
              <Box>
                <HStack>
                  <Box as={FaComments} />
                  <Text fontWeight="semibold" fontSize="lg">
                    Comments ({comments.length})
                  </Text>
                </HStack>
              </Box>
              
              <VStack align="stretch" spacing={3} maxH="300px" overflowY="auto">
                {isLoadingComments ? (
                  <Text color="gray.500" fontSize="sm">Loading comments...</Text>
                ) : comments.length === 0 ? (
                  <Text color="gray.500" fontSize="sm">No comments yet.</Text>
                ) : (
                  comments.map((comment) => (
                    <Box 
                      key={comment.id} 
                      p={3} 
                      bg={commentBg} 
                      borderRadius="md"
                      borderWidth="1px"
                      borderColor={borderColor}
                    >
                      <VStack align="stretch" spacing={2}>
                        <HStack justify="space-between">
                          <Text fontWeight="semibold" fontSize="sm">
                            {comment.userDisplayName}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            {format(comment.createdAt.toDate(), 'MMM d, yyyy h:mm a')}
                          </Text>
                        </HStack>
                        <Text fontSize="sm">{comment.content}</Text>
                      </VStack>
                    </Box>
                  ))
                )}
              </VStack>
              
              {currentUser && getTaskPermissions(task, currentUser.uid).canComment ? (
                <Box>
                  <Textarea
                    placeholder="Add a comment..."
                    resize="vertical"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                  />
                  <Flex justifyContent="flex-end" mt={2}>
                    <Button
                      leftIcon={<FaPaperPlane />}
                      colorScheme="blue"
                      size="sm"
                      isDisabled={!comment.trim()}
                      onClick={handleSubmitComment}
                      isLoading={isSubmittingComment}
                    >
                      Send
                    </Button>
                  </Flex>
                </Box>
              ) : (
                <Box>
                  <Text fontSize="sm" color="gray.500" fontStyle="italic">
                    You do not have permission to comment on this task.
                  </Text>
                </Box>
              )}
            </VStack>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="blue" onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default TaskDetailModal; 