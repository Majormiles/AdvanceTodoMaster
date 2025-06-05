import React, { useState } from 'react';
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
import type { Task, TaskStatus, Category } from '../../types/task';
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
  const toast = useToast();
  const [comment, setComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  
  // Background colors
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
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
    if (!comment.trim()) return;
    
    try {
      setIsSubmittingComment(true);
      
      // This would typically call a function to add the comment to Firestore
      // For this example, we'll just show a success toast
      
      toast({
        title: 'Comment added',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
      
      setComment('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
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
                  <Text fontWeight="semibold" fontSize="lg">Comments</Text>
                </HStack>
              </Box>
              
              <VStack align="stretch" spacing={2}>
                {/* This would be populated with actual comments from Firestore */}
                <Text color="gray.500" fontSize="sm">
                  No comments yet.
                </Text>
              </VStack>
              
              <Box>
                <Textarea
                  placeholder="Add a comment..."
                  resize="vertical"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
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