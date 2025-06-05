import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  FormErrorMessage,
  VStack,
  HStack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Tag,
  TagLabel,
  TagCloseButton,
  Flex,
  useToast
} from '@chakra-ui/react';
import { useAuth } from '../../contexts/AuthContext';
import { Task, TaskPriority, TaskStatus, Category } from '../../types/task';
import { Timestamp } from 'firebase/firestore';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: Omit<Task, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
  categories: Category[];
  initialData?: Task;
  isEditing?: boolean;
}

const TaskForm: React.FC<TaskFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  categories,
  initialData,
  isEditing = false
}) => {
  const { currentUser } = useAuth();
  const toast = useToast();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [categoryId, setCategoryId] = useState<string>('');
  const [tag, setTag] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form validation
  const [titleError, setTitleError] = useState('');
  
  // Initialize form with existing data if editing
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description || '');
      setDueDate(initialData.dueDate ? initialData.dueDate.toDate() : null);
      setStatus(initialData.status);
      setPriority(initialData.priority);
      setCategoryId(initialData.categoryId || '');
      setTags(initialData.tags || []);
    } else {
      // Reset form for new task
      setTitle('');
      setDescription('');
      setDueDate(null);
      setStatus('TODO');
      setPriority('MEDIUM');
      // Set default category if available
      setCategoryId(categories.length > 0 ? categories[0].id : '');
      setTags([]);
    }
  }, [initialData, categories]);
  
  const handleAddTag = () => {
    if (!tag.trim()) return;
    if (!tags.includes(tag.trim())) {
      setTags([...tags, tag.trim()]);
    }
    setTag('');
  };
  
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };
  
  const validateForm = () => {
    let isValid = true;
    
    // Title validation
    if (!title.trim()) {
      setTitleError('Title is required');
      isValid = false;
    } else {
      setTitleError('');
    }
    
    return isValid;
  };
  
  const handleSubmit = async () => {
    if (!validateForm() || !currentUser) return;
    
    try {
      setIsSubmitting(true);
      
      const taskData = {
        title,
        description,
        dueDate: dueDate ? Timestamp.fromDate(dueDate) : undefined,
        status,
        priority,
        categoryId: categoryId || undefined,
        tags: tags.length > 0 ? tags : [],
        updatedAt: Timestamp.now()
      };
      
      await onSubmit(taskData);
      
      toast({
        title: isEditing ? 'Task Updated' : 'Task Created',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
      
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{isEditing ? 'Edit Task' : 'Add New Task'}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl isInvalid={!!titleError} isRequired>
              <FormLabel>Title</FormLabel>
              <Input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="Task title"
              />
              {titleError && <FormErrorMessage>{titleError}</FormErrorMessage>}
            </FormControl>
            
            <FormControl>
              <FormLabel>Description</FormLabel>
              <Textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Task description"
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>Due Date</FormLabel>
              <DatePicker
                selected={dueDate}
                onChange={(date: Date | null) => setDueDate(date)}
                dateFormat="MMMM d, yyyy h:mm aa"
                placeholderText="Select due date and time"
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                timeCaption="time"
                customInput={
                  <Input 
                    placeholder="Select due date and time"
                  />
                }
              />
            </FormControl>
            
            <HStack width="100%" spacing={4}>
              <FormControl>
                <FormLabel>Status</FormLabel>
                <Select 
                  value={status} 
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                >
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </Select>
              </FormControl>
              
              <FormControl>
                <FormLabel>Priority</FormLabel>
                <Select 
                  value={priority} 
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </Select>
              </FormControl>
            </HStack>
            
            <FormControl>
              <FormLabel>Category</FormLabel>
              <Select 
                value={categoryId} 
                onChange={(e) => setCategoryId(e.target.value)}
                placeholder="Select a category"
              >
                {categories && categories.length > 0 ? (
                  categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>No categories available</option>
                )}
              </Select>
            </FormControl>
            
            <FormControl>
              <FormLabel>Tags</FormLabel>
              <HStack>
                <Input
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="Add tag"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button onClick={handleAddTag} size="sm">
                  Add
                </Button>
              </HStack>
              
              {tags.length > 0 && (
                <Box mt={2}>
                  <Flex flexWrap="wrap" gap={2}>
                    {tags.map((t, index) => (
                      <Tag key={index} size="md" borderRadius="full" variant="solid" colorScheme="blue">
                        <TagLabel>{t}</TagLabel>
                        <TagCloseButton onClick={() => handleRemoveTag(t)} />
                      </Tag>
                    ))}
                  </Flex>
                </Box>
              )}
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            loadingText="Saving..."
          >
            {isEditing ? 'Update' : 'Create'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default TaskForm; 