import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  VStack,
  HStack,
  Box,
  Text,
  Badge,
  Avatar,

  Alert,
  AlertIcon,
  Flex,
  Divider,
  Textarea,
  Spinner,
  useColorModeValue,
  IconButton,
  Switch,
  InputGroup,
  InputLeftElement,
  useToast,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Card,
  CardBody,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Icon
} from '@chakra-ui/react';
import { 
  FaSearch, 
  FaUserPlus, 
  FaUsers, 
  FaEye, 
  FaEdit, 
  FaUserShield, 
  FaComments,
  FaCrown,
  FaTrash,
  FaEllipsisV,
  FaCopy,
  FaLink
} from 'react-icons/fa';
import { Task, PermissionLevel, TaskCollaborator } from '../../types/task';
import { useAuth } from '../../contexts/AuthContext';
import { searchUsers, getTaskCollaborators, updateUserPermission, removeCollaborator } from '../../services/collaborationService';
import { getTaskPermissions } from '../../services/taskService';
import { debounce } from 'lodash';

interface UserSearchResult {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  lastSeen?: Date;
}

interface SelectedUser extends UserSearchResult {
  permissionLevel: PermissionLevel;
}

interface ShareTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  onShare: (users: { email: string; permissionLevel: PermissionLevel }[], message?: string) => Promise<void>;
  currentCollaborators?: TaskCollaborator[];
}

const PERMISSION_LEVELS: { value: PermissionLevel; label: string; description: string; icon: any; color: string }[] = [
  { 
    value: 'read', 
    label: 'View Only', 
    description: 'Can view task details and comments', 
    icon: FaEye, 
    color: 'gray' 
  },
  { 
    value: 'comment', 
    label: 'Comment', 
    description: 'Can view and add comments', 
    icon: FaComments, 
    color: 'blue' 
  },
  { 
    value: 'edit', 
    label: 'Edit', 
    description: 'Can modify task details and status', 
    icon: FaEdit, 
    color: 'green' 
  },
  { 
    value: 'admin', 
    label: 'Admin', 
    description: 'Full access including sharing management', 
    icon: FaUserShield, 
    color: 'purple' 
  }
];

const ShareTaskModal: React.FC<ShareTaskModalProps> = ({
  isOpen,
  onClose,
  task,
  onShare,
  currentCollaborators = []
}) => {
  const { currentUser } = useAuth();
  const toast = useToast();

  // UI States
  const [activeTab, setActiveTab] = useState<'share' | 'manage'>('share');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([]);

  // Share Settings
  const [defaultPermission, setDefaultPermission] = useState<PermissionLevel>('read');
  const [shareMessage, setShareMessage] = useState('');
  const [generateShareLink, setGenerateShareLink] = useState(false);
  const [shareLink, setShareLink] = useState('');

  // Collaborator Management
  const [collaborators, setCollaborators] = useState<TaskCollaborator[]>(currentCollaborators);
  const [updatingPermissions, setUpdatingPermissions] = useState<Record<string, boolean>>({});

  // Colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const secondaryBg = useColorModeValue('gray.50', 'gray.700');

  // Check current user permissions
  const userPermissions = getTaskPermissions(task, currentUser?.uid || '');

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim() || query.length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      try {
        setIsSearching(true);
        const results = await searchUsers(query);
        // Filter out current user and existing collaborators
        const filteredResults = results.filter(user => 
          user.uid !== currentUser?.uid && 
          !collaborators.some(collab => collab.userId === user.uid) &&
          !selectedUsers.some(selected => selected.uid === user.uid)
        );
        setSearchResults(filteredResults);
      } catch (error) {
        console.error('Error searching users:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [currentUser?.uid, collaborators, selectedUsers]
  );

  // Effect for search
  useEffect(() => {
    debouncedSearch(searchQuery);
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchQuery, debouncedSearch]);

  // Load current collaborators
  useEffect(() => {
    if (isOpen && task.id) {
      loadCollaborators();
    }
  }, [isOpen, task.id]);

  const loadCollaborators = async () => {
    try {
      const taskCollaborators = await getTaskCollaborators(task.userId, task.id);
      setCollaborators(taskCollaborators);
    } catch (error) {
      console.error('Error loading collaborators:', error);
    }
  };

  const handleUserSelect = (user: UserSearchResult) => {
    const selectedUser: SelectedUser = {
      ...user,
      permissionLevel: defaultPermission
    };
    setSelectedUsers([...selectedUsers, selectedUser]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleUserRemove = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(user => user.uid !== userId));
  };

  const handlePermissionChange = (userId: string, permission: PermissionLevel) => {
    setSelectedUsers(selectedUsers.map(user => 
      user.uid === userId ? { ...user, permissionLevel: permission } : user
    ));
  };

  const handleBulkPermissionChange = (permission: PermissionLevel) => {
    setSelectedUsers(selectedUsers.map(user => ({ ...user, permissionLevel: permission })));
    setDefaultPermission(permission);
  };

  const handleCollaboratorPermissionUpdate = async (collaboratorId: string, newPermission: PermissionLevel) => {
    if (!userPermissions.canManagePermissions) {
      toast({
        title: 'Permission Denied',
        description: 'You do not have permission to manage collaborators',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    try {
      setUpdatingPermissions(prev => ({ ...prev, [collaboratorId]: true }));
      await updateUserPermission(task.userId, task.id, collaboratorId, newPermission);
      
      // Update local state
      setCollaborators(prev => prev.map(collab => 
        collab.userId === collaboratorId 
          ? { ...collab, permissionLevel: newPermission }
          : collab
      ));

      toast({
        title: 'Permission Updated',
        description: 'Collaborator permission has been updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update permission',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    } finally {
      setUpdatingPermissions(prev => ({ ...prev, [collaboratorId]: false }));
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    if (!userPermissions.canManagePermissions) {
      toast({
        title: 'Permission Denied',
        description: 'You do not have permission to remove collaborators',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    try {
      await removeCollaborator(task.userId, task.id, collaboratorId);
      
      // Update local state
      setCollaborators(prev => prev.filter(collab => collab.userId !== collaboratorId));

      toast({
        title: 'Collaborator Removed',
        description: 'Collaborator has been removed from the task',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove collaborator',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  const generateTaskShareLink = () => {
    // Generate a shareable link (implementation depends on your routing setup)
    const link = `${window.location.origin}/shared-task/${task.id}?token=${btoa(JSON.stringify({ taskId: task.id, ownerId: task.userId }))}`;
    setShareLink(link);
    
    // Copy to clipboard
    navigator.clipboard.writeText(link).then(() => {
      toast({
        title: 'Link Copied',
        description: 'Share link has been copied to clipboard',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    });
  };

  const handleSubmit = async () => {
    if (selectedUsers.length === 0) {
      setError('Please select at least one user to share with');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const usersToShare = selectedUsers.map(user => ({
        email: user.email,
        permissionLevel: user.permissionLevel
      }));

      await onShare(usersToShare, shareMessage || undefined);

      toast({
        title: 'Task Shared Successfully',
        description: `Task shared with ${selectedUsers.length} user(s)`,
        status: 'success',
        duration: 3000,
        isClosable: true
      });

      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to share task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset states
    setActiveTab('share');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUsers([]);
    setShareMessage('');
    setError(null);
    setGenerateShareLink(false);
    setShareLink('');
  };

  const getPermissionDetails = (permission: PermissionLevel) => {
    return PERMISSION_LEVELS.find(p => p.value === permission) || PERMISSION_LEVELS[0];
  };

  if (!userPermissions.canShare && !userPermissions.canManagePermissions) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Access Denied</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Alert status="warning">
              <AlertIcon />
              You do not have permission to share this task or manage collaborators.
            </Alert>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <ModalOverlay />
      <ModalContent maxH="90vh">
        <ModalHeader>
          <VStack align="start" spacing={2}>
            <HStack>
              <Icon as={FaUsers} />
              <Text>Share Task</Text>
            </HStack>
            <Text fontSize="sm" fontWeight="normal" color="gray.600">
              {task.title}
            </Text>
          </VStack>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody pb={6} overflowY="auto">
          <VStack spacing={6} align="stretch">
            {/* Tab Navigation */}
            <HStack spacing={4}>
              <Button
                variant={activeTab === 'share' ? 'solid' : 'ghost'}
                colorScheme="blue"
                size="sm"
                onClick={() => setActiveTab('share')}
                leftIcon={<Icon as={FaUserPlus} />}
                isDisabled={!userPermissions.canShare}
              >
                Share Task
              </Button>
              <Button
                variant={activeTab === 'manage' ? 'solid' : 'ghost'}
                colorScheme="blue"
                size="sm"
                onClick={() => setActiveTab('manage')}
                leftIcon={<Icon as={FaUsers} />}
                isDisabled={!userPermissions.canManagePermissions}
              >
                Manage Access ({collaborators.length})
              </Button>
            </HStack>

            {error && (
              <Alert status="error">
                <AlertIcon />
                {error}
              </Alert>
            )}

            {/* Share Tab */}
            {activeTab === 'share' && userPermissions.canShare && (
              <VStack spacing={4} align="stretch">
                {/* User Search */}
                <FormControl>
                  <FormLabel>Search Users</FormLabel>
                  <InputGroup>
                    <InputLeftElement>
                      <Icon as={FaSearch} color="gray.400" />
                    </InputLeftElement>
                    <Input
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </InputGroup>
                  
                  {/* Search Results */}
                  {(searchResults.length > 0 || isSearching) && (
                    <Box
                      mt={2}
                      border="1px solid"
                      borderColor={borderColor}
                      borderRadius="md"
                      maxH="200px"
                      overflowY="auto"
                      bg={bgColor}
                    >
                      {isSearching ? (
                        <Flex justify="center" p={4}>
                          <Spinner size="sm" />
                        </Flex>
                      ) : (
                        searchResults.map((user) => (
                          <Flex
                            key={user.uid}
                            p={3}
                            align="center"
                            cursor="pointer"
                            _hover={{ bg: secondaryBg }}
                            onClick={() => handleUserSelect(user)}
                            borderBottom="1px solid"
                            borderColor={borderColor}
                            _last={{ borderBottom: 'none' }}
                          >
                            <Avatar size="sm" name={user.displayName} src={user.photoURL} mr={3} />
                            <VStack align="start" spacing={0} flex={1}>
                              <Text fontWeight="medium">{user.displayName}</Text>
                              <Text fontSize="sm" color="gray.600">{user.email}</Text>
                            </VStack>
                            <Icon as={FaUserPlus} color="blue.500" />
                          </Flex>
                        ))
                      )}
                    </Box>
                  )}
                </FormControl>

                {/* Selected Users */}
                {selectedUsers.length > 0 && (
                  <Box>
                    <FormLabel>Selected Users ({selectedUsers.length})</FormLabel>
                    <VStack spacing={3} align="stretch">
                      {/* Bulk Permission Setting */}
                      <HStack>
                        <Text fontSize="sm">Set all permissions to:</Text>
                        <Select
                          size="sm"
                          width="auto"
                          value={defaultPermission}
                          onChange={(e) => handleBulkPermissionChange(e.target.value as PermissionLevel)}
                        >
                          {PERMISSION_LEVELS.map((perm) => (
                            <option key={perm.value} value={perm.value}>
                              {perm.label}
                            </option>
                          ))}
                        </Select>
                      </HStack>

                                             {/* Individual Users */}
                       {selectedUsers.map((user) => {
                         return (
                          <Card key={user.uid} size="sm">
                            <CardBody>
                              <Flex align="center">
                                <Avatar size="sm" name={user.displayName} src={user.photoURL} mr={3} />
                                <VStack align="start" spacing={0} flex={1}>
                                  <Text fontWeight="medium">{user.displayName}</Text>
                                  <Text fontSize="sm" color="gray.600">{user.email}</Text>
                                </VStack>
                                <HStack>
                                  <Select
                                    size="sm"
                                    width="130px"
                                    value={user.permissionLevel}
                                    onChange={(e) => handlePermissionChange(user.uid, e.target.value as PermissionLevel)}
                                  >
                                    {PERMISSION_LEVELS.map((perm) => (
                                      <option key={perm.value} value={perm.value}>
                                        {perm.label}
                                      </option>
                                    ))}
                                  </Select>
                                  <IconButton
                                    aria-label="Remove user"
                                    icon={<Icon as={FaTrash} />}
                                    size="sm"
                                    variant="ghost"
                                    colorScheme="red"
                                    onClick={() => handleUserRemove(user.uid)}
                                  />
                                </HStack>
                              </Flex>
                            </CardBody>
                          </Card>
                        );
                      })}
                    </VStack>
                  </Box>
                )}

                {/* Share Message */}
                <FormControl>
                  <FormLabel>Personal Message (Optional)</FormLabel>
                  <Textarea
                    placeholder="Add a personal message to include with the invitation..."
                    value={shareMessage}
                    onChange={(e) => setShareMessage(e.target.value)}
                    rows={3}
                  />
                </FormControl>

                {/* Share Link Option */}
                <Card bg={secondaryBg}>
                  <CardBody>
                    <HStack justify="space-between">
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="medium">Generate Share Link</Text>
                        <Text fontSize="sm" color="gray.600">
                          Create a shareable link for this task
                        </Text>
                      </VStack>
                      <Switch
                        isChecked={generateShareLink}
                        onChange={(e) => setGenerateShareLink(e.target.checked)}
                      />
                    </HStack>
                    
                    {generateShareLink && (
                      <Box mt={3}>
                        <Button
                          size="sm"
                          leftIcon={<Icon as={FaLink} />}
                          onClick={generateTaskShareLink}
                          colorScheme="blue"
                          variant="outline"
                        >
                          Generate Link
                        </Button>
                        {shareLink && (
                          <HStack mt={2}>
                            <Input value={shareLink} isReadOnly size="sm" />
                            <IconButton
                              aria-label="Copy link"
                              icon={<Icon as={FaCopy} />}
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(shareLink);
                                toast({
                                  title: 'Copied',
                                  status: 'success',
                                  duration: 2000
                                });
                              }}
                            />
                          </HStack>
                        )}
                      </Box>
                    )}
                  </CardBody>
                </Card>
              </VStack>
            )}

            {/* Manage Access Tab */}
            {activeTab === 'manage' && userPermissions.canManagePermissions && (
              <VStack spacing={4} align="stretch">
                {collaborators.length === 0 ? (
                  <Card>
                    <CardBody>
                      <VStack spacing={3}>
                        <Icon as={FaUsers} size="32px" color="gray.400" />
                        <Text color="gray.600">No collaborators yet</Text>
                        <Text fontSize="sm" color="gray.500">
                          Share this task to start collaborating
                        </Text>
                      </VStack>
                    </CardBody>
                  </Card>
                ) : (
                  <VStack spacing={3} align="stretch">
                    <Text fontWeight="medium">Current Collaborators</Text>
                    
                    {collaborators.map((collaborator) => {
                      const permDetails = getPermissionDetails(collaborator.permissionLevel);
                      const isOwner = collaborator.userId === task.userId;
                      const isUpdating = updatingPermissions[collaborator.userId];
                      
                      return (
                        <Card key={collaborator.userId}>
                          <CardBody>
                            <Flex align="center">
                              <Avatar 
                                size="sm" 
                                name={collaborator.userDisplayName} 
                                src={collaborator.userPhotoURL} 
                                mr={3} 
                              />
                              <VStack align="start" spacing={0} flex={1}>
                                <HStack>
                                  <Text fontWeight="medium">{collaborator.userDisplayName}</Text>
                                                                     {isOwner && (
                                     <Badge colorScheme="yellow">
                                       <HStack spacing={1}>
                                         <Icon as={FaCrown} />
                                         <Text>Owner</Text>
                                       </HStack>
                                     </Badge>
                                   )}
                                </HStack>
                                <Text fontSize="sm" color="gray.600">{collaborator.userEmail}</Text>
                                <HStack spacing={2}>
                                  <Badge colorScheme={permDetails.color}>
                                    <HStack spacing={1}>
                                      <Icon as={permDetails.icon} />
                                      <Text>{permDetails.label}</Text>
                                    </HStack>
                                  </Badge>
                                  <Text fontSize="xs" color="gray.500">
                                    Joined {collaborator.joinedAt?.toDate().toLocaleDateString()}
                                  </Text>
                                </HStack>
                              </VStack>
                              
                              {!isOwner && (
                                <HStack>
                                  <Menu>
                                    <MenuButton
                                      as={IconButton}
                                      aria-label="Manage collaborator"
                                      icon={<Icon as={FaEllipsisV} />}
                                      size="sm"
                                      variant="ghost"
                                      isLoading={isUpdating}
                                    />
                                    <MenuList>
                                      {PERMISSION_LEVELS.map((perm) => (
                                        <MenuItem
                                          key={perm.value}
                                          icon={<Icon as={perm.icon} />}
                                          onClick={() => handleCollaboratorPermissionUpdate(collaborator.userId, perm.value)}
                                          isDisabled={collaborator.permissionLevel === perm.value}
                                        >
                                          {perm.label}
                                        </MenuItem>
                                      ))}
                                      <Divider />
                                      <MenuItem
                                        icon={<Icon as={FaTrash} />}
                                        color="red.500"
                                        onClick={() => handleRemoveCollaborator(collaborator.userId)}
                                      >
                                        Remove Access
                                      </MenuItem>
                                    </MenuList>
                                  </Menu>
                                </HStack>
                              )}
                            </Flex>
                          </CardBody>
                        </Card>
                      );
                    })}
                  </VStack>
                )}

                {/* Permission Levels Info */}
                <Accordion allowToggle>
                  <AccordionItem>
                    <AccordionButton>
                      <Box flex="1" textAlign="left">
                        <Text fontSize="sm" fontWeight="medium">Permission Levels</Text>
                      </Box>
                      <AccordionIcon />
                    </AccordionButton>
                    <AccordionPanel pb={4}>
                      <VStack spacing={3} align="stretch">
                        {PERMISSION_LEVELS.map((perm) => (
                          <HStack key={perm.value}>
                            <Badge colorScheme={perm.color}>
                              <HStack spacing={1}>
                                <Icon as={perm.icon} />
                                <Text>{perm.label}</Text>
                              </HStack>
                            </Badge>
                            <Text fontSize="sm" color="gray.600">{perm.description}</Text>
                          </HStack>
                        ))}
                      </VStack>
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>
              </VStack>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3} width="100%" justify="flex-end">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            
            {activeTab === 'share' && userPermissions.canShare && (
              <Button
                colorScheme="blue"
                onClick={handleSubmit}
                isLoading={isSubmitting}
                loadingText="Sharing..."
                isDisabled={selectedUsers.length === 0}
                leftIcon={<Icon as={FaUserPlus} />}
              >
                Share with {selectedUsers.length} User{selectedUsers.length !== 1 ? 's' : ''}
              </Button>
            )}
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ShareTaskModal; 