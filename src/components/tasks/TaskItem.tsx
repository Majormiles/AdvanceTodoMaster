import React from 'react';
import {
  Box,
  Flex,
  Text,
  Badge,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Tooltip,
  HStack,
  Tag,
  useDisclosure,
  useColorModeValue,
  Checkbox
} from '@chakra-ui/react';
import { Task, Category } from '../../types/task';
import { 
  FaEllipsisV, 
  FaEdit, 
  FaTrash, 
  FaShare, 
  FaCalendarAlt, 
  FaTag 
} from 'react-icons/fa';
import { format } from 'date-fns';
import ShareTaskModal from './ShareTaskModal';
import TaskDetailModal from './TaskDetailModal';

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

interface TaskItemProps {
  task: Task;
  categories: Category[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, status: Task['status']) => void;
  onShare: (taskId: string, email: string, permission: string) => Promise<void>;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  categories,
  onEdit,
  onDelete,
  onStatusChange,
  onShare
}) => {
  const { isOpen: isShareOpen, onOpen: onShareOpen, onClose: onShareClose } = useDisclosure();
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();
  
  // Background color for the task card
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  // Find category of this task
  const taskCategory = categories.find(cat => cat.id === task.categoryId);
  
  // Format due date
  const formattedDueDate = task.dueDate 
    ? format(task.dueDate.toDate(), 'MMM d, yyyy h:mm a')
    : null;
  
  // Check if task is overdue
  const isOverdue = task.dueDate && task.status !== 'COMPLETED' && task.status !== 'CANCELLED'
    ? task.dueDate.toDate() < new Date()
    : false;
  
  // Handle status change
  const handleStatusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStatus = e.target.checked ? 'COMPLETED' : 'TODO';
    onStatusChange(task.id, newStatus);
  };
  
  return (
    <>
      <Box
        p={4}
        borderWidth="1px"
        borderRadius="lg"
        borderColor={borderColor}
        bg={bgColor}
        boxShadow="sm"
        _hover={{ boxShadow: 'md' }}
        transition="all 0.2s"
        cursor="pointer"
        onClick={onDetailOpen}
      >
        <Flex justify="space-between" align="center" mb={2}>
          <HStack spacing={3}>
            <Checkbox 
              isChecked={task.status === 'COMPLETED'}
              onChange={handleStatusChange}
              onClick={(e) => e.stopPropagation()} // Prevent opening detail modal when clicking checkbox
            />
            <Text 
              fontWeight="semibold" 
              fontSize="md" 
              textDecoration={task.status === 'COMPLETED' || task.status === 'CANCELLED' ? 'line-through' : 'none'}
            >
              {task.title}
            </Text>
          </HStack>
          
          <Menu>
            <MenuButton
              as={IconButton}
              aria-label="Options"
              icon={<FaEllipsisV />}
              variant="ghost"
              size="sm"
              onClick={(e) => e.stopPropagation()} // Prevent opening detail modal when clicking menu
            />
            <MenuList onClick={(e) => e.stopPropagation()}>
              <MenuItem icon={<FaEdit />} onClick={() => onEdit(task)}>
                Edit
              </MenuItem>
              <MenuItem icon={<FaShare />} onClick={onShareOpen}>
                Share
              </MenuItem>
              <MenuItem icon={<FaTrash />} onClick={() => onDelete(task.id)} color="red.500">
                Delete
              </MenuItem>
            </MenuList>
          </Menu>
        </Flex>
        
        <Flex justify="space-between" mt={3}>
          <HStack spacing={2}>
            <Badge colorScheme={STATUS_COLOR_MAP[task.status]}>
              {task.status.replace('_', ' ')}
            </Badge>
            <Badge colorScheme={PRIORITY_COLOR_MAP[task.priority]}>
              {task.priority}
            </Badge>
            {taskCategory && (
              <Tag size="sm" colorScheme="purple">
                {taskCategory.name}
              </Tag>
            )}
          </HStack>
          
          {formattedDueDate && (
            <Tooltip label={formattedDueDate}>
              <HStack spacing={1}>
                <Box as={FaCalendarAlt} color={isOverdue ? 'red.500' : 'gray.500'} size="12px" />
                <Text fontSize="xs" color={isOverdue ? 'red.500' : 'gray.500'}>
                  {format(task.dueDate!.toDate(), 'MMM d')}
                </Text>
              </HStack>
            </Tooltip>
          )}
        </Flex>
        
        {task.tags && task.tags.length > 0 && (
          <Box mt={2}>
            <HStack spacing={1}>
              <Box as={FaTag} color="gray.500" size="12px" />
              <Flex wrap="wrap" gap={1}>
                {task.tags.slice(0, 3).map((tag, index) => (
                  <Tag key={index} size="sm" colorScheme="blue" variant="subtle">
                    {tag}
                  </Tag>
                ))}
                {task.tags.length > 3 && (
                  <Tag size="sm" colorScheme="gray" variant="subtle">
                    +{task.tags.length - 3} more
                  </Tag>
                )}
              </Flex>
            </HStack>
          </Box>
        )}
      </Box>
      
      <ShareTaskModal
        isOpen={isShareOpen}
        onClose={onShareClose}
        onShare={(email, permission) => onShare(task.id, email, permission)}
        taskTitle={task.title}
      />
      
      <TaskDetailModal
        isOpen={isDetailOpen}
        onClose={onDetailClose}
        task={task}
        category={taskCategory}
        onEdit={() => onEdit(task)}
        onDelete={() => onDelete(task.id)}
        onShare={onShareOpen}
        onStatusChange={(status) => onStatusChange(task.id, status)}
      />
    </>
  );
};

export default TaskItem; 