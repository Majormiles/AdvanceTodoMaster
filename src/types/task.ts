import { Timestamp } from 'firebase/firestore';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface TaskSharingInfo {
  email: string;
  permissionLevel: 'view' | 'edit' | 'admin';
  sharedTaskId: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: Timestamp;
  status: TaskStatus;
  priority: TaskPriority;
  categoryId?: string;
  userId: string;
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
  }[];
  tags?: string[];
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
}

export interface TaskInvitation {
  id: string;
  taskId: string;
  ownerId: string;
  recipientEmail: string;
  sharedTaskId: string;
  permissionLevel: 'view' | 'edit' | 'admin';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: Timestamp;
  respondedAt?: Timestamp;
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
}

export interface SharedTask {
  id: string;
  originalTaskId: string;
  ownerId: string;
  sharedAt: Timestamp;
  permissionLevel: 'view' | 'edit' | 'admin';
  taskData: Task;
}

export interface TaskHistory {
  id: string;
  taskId: string;
  userId: string;
  userDisplayName: string;
  action: 'CREATED' | 'UPDATED' | 'DELETED' | 'STATUS_CHANGED' | 'SHARED' | 'COMMENT_ADDED';
  timestamp: Timestamp;
  details?: any;
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
} 