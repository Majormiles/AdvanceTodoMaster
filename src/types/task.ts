import { Timestamp } from 'firebase/firestore';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

// Enhanced Permission System
export type PermissionLevel = 'read' | 'comment' | 'edit' | 'admin';

export interface TaskSharingInfo {
  email: string;
  userId?: string; // Populated after user accepts invitation
  permissionLevel: PermissionLevel;
  sharedTaskId: string;
  sharedAt: Timestamp;
  sharedBy: string; // User ID who shared the task
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: Timestamp;
  status: TaskStatus;
  priority: TaskPriority;
  categoryId?: string;
  userId: string; // Owner of the task
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  completedAt?: Timestamp;
  parentTaskId?: string; // For subtasks
  sharing?: TaskSharingInfo[];
  assignees?: string[]; // User IDs of assignees
  attachments?: {
    name: string;
    url: string;
    type: string;
    uploadedAt: Timestamp;
    uploadedBy: string;
  }[];
  tags?: string[];
  isShared?: boolean; // Quick check if task is shared
  collaborators?: TaskCollaborator[]; // Active collaborators
  lastModifiedBy?: string; // User ID who last modified the task
  version?: number; // For conflict resolution
}

// New interfaces for collaboration
export interface TaskCollaborator {
  userId: string;
  userEmail: string;
  userDisplayName: string;
  userPhotoURL?: string;
  permissionLevel: PermissionLevel;
  joinedAt: Timestamp;
  lastActive?: Timestamp;
  isOnline?: boolean;
}

export interface Category {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL?: string;
  content: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  mentions?: string[]; // User IDs mentioned in the comment
  parentCommentId?: string; // For threaded comments
  isEdited?: boolean;
}

export interface TaskInvitation {
  id: string;
  taskId: string;
  ownerId: string;
  ownerDisplayName: string;
  ownerEmail: string;
  recipientEmail: string;
  sharedTaskId: string;
  permissionLevel: PermissionLevel;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: Timestamp;
  respondedAt?: Timestamp;
  expiresAt: Timestamp; // Invitations expire after 7 days
  message?: string; // Optional message from the sharer
}

export interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  todo: number;
  cancelled: number;
  overdue: number;
  dueToday: number;
  dueTomorrow: number;
  shared: number; // Tasks shared by user
  sharedWithMe: number; // Tasks shared with user
}

export interface SharedTask {
  id: string;
  originalTaskId: string;
  ownerId: string;
  ownerDisplayName: string;
  ownerEmail: string;
  sharedAt: Timestamp;
  permissionLevel: PermissionLevel;
  taskData: Task;
  lastSyncedAt: Timestamp;
}

export interface TaskHistory {
  id: string;
  taskId: string;
  userId: string;
  userDisplayName: string;
  action: 'created' | 'updated' | 'deleted' | 'status_changed' | 'shared' | 'comment_added' | 'assigned' | 'unassigned';
  timestamp: Timestamp;
  details?: {
    field?: string;
    oldValue?: any;
    newValue?: any;
    metadata?: any;
  };
}

export interface TaskFilter {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  categories?: string[];
  dueDate?: {
    from?: Date;
    to?: Date;
  };
  search?: string;
  tags?: string[];
  assignees?: string[];
  sharedBy?: string[];
  permissionLevel?: PermissionLevel[];
  isShared?: boolean;
}

// Real-time collaboration interfaces
export interface TaskPresence {
  userId: string;
  userDisplayName: string;
  userPhotoURL?: string;
  taskId: string;
  lastSeen: Timestamp;
  isViewing: boolean;
  isEditing: boolean;
  cursorPosition?: number;
}

export interface TaskNotification {
  id: string;
  userId: string; // Recipient
  taskId: string;
  type: 'task_shared' | 'task_assigned' | 'comment_added' | 'status_changed' | 'due_reminder' | 'mention';
  title: string;
  message: string;
  createdAt: Timestamp;
  readAt?: Timestamp;
  actionUrl?: string;
  metadata?: {
    fromUserId?: string;
    fromUserDisplayName?: string;
    commentId?: string;
    oldStatus?: TaskStatus;
    newStatus?: TaskStatus;
  };
}

// Utility types for permissions
export interface TaskPermissions {
  canRead: boolean;
  canComment: boolean;
  canEdit: boolean;
  canShare: boolean;
  canDelete: boolean;
  canManagePermissions: boolean;
}

export interface UserTaskRole {
  taskId: string;
  userId: string;
  role: 'owner' | 'collaborator';
  permissionLevel: PermissionLevel;
  grantedAt: Timestamp;
  grantedBy: string;
} 