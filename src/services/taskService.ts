import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  query,
  where,
  Timestamp,
  orderBy,
  onSnapshot,
  writeBatch,
  limit,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  Task, 
  TaskPriority, 
  TaskStatus, 
  PermissionLevel, 
  TaskInvitation, 
  SharedTask, 
  TaskComment, 
  TaskHistory,
  TaskPermissions,
  TaskCollaborator
} from '../types/task';

// Permission helper functions
export const getTaskPermissions = (
  task: Task, 
  currentUserId: string
): TaskPermissions => {
  // Owner has all permissions
  if (task.userId === currentUserId) {
    return {
      canRead: true,
      canComment: true,
      canEdit: true,
      canShare: true,
      canDelete: true,
      canManagePermissions: true
    };
  }

  // Find user's permission level through sharing
  const userShare = task.sharing?.find(s => s.userId === currentUserId);
  const permissionLevel = userShare?.permissionLevel || 'read';

  return {
    canRead: true, // All shared users can read
    canComment: ['comment', 'edit', 'admin'].includes(permissionLevel),
    canEdit: ['edit', 'admin'].includes(permissionLevel),
    canShare: ['admin'].includes(permissionLevel),
    canDelete: permissionLevel === 'admin',
    canManagePermissions: permissionLevel === 'admin'
  };
};

// Create a new task with enhanced tracking
export const createTask = async (
  userId: string, 
  task: Omit<Task, 'id' | 'createdAt'>,
  userDisplayName?: string
) => {
  try {
    const taskData = {
      ...task,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      userId,
      lastModifiedBy: userId,
      version: 1,
      isShared: false
    };
    
    const batch = writeBatch(db);
    
    // Add the task to Firestore
    const taskRef = doc(collection(db, 'users', userId, 'tasks'));
    batch.set(taskRef, taskData);
    
    // Add history entry
    const historyRef = doc(collection(db, 'taskHistory'));
    batch.set(historyRef, {
      taskId: taskRef.id,
      userId,
      userDisplayName: userDisplayName || 'Unknown User',
      action: 'created',
      timestamp: Timestamp.now(),
      details: {
        field: 'task',
        newValue: taskData
      }
    });
    
    await batch.commit();
    
    // Return the created task with ID
    return {
      id: taskRef.id,
      ...taskData
    };
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
};

// Update an existing task with version control and permissions
export const updateTask = async (
  userId: string, 
  taskId: string, 
  updates: Partial<Task>,
  userDisplayName?: string
) => {
  try {
    const taskRef = doc(db, 'users', userId, 'tasks', taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      throw new Error('Task not found');
    }
    
    const currentTask = { id: taskSnap.id, ...taskSnap.data() } as Task;
    
    // Check permissions
    const permissions = getTaskPermissions(currentTask, userId);
    if (!permissions.canEdit && userId !== currentTask.userId) {
      throw new Error('Insufficient permissions to edit this task');
    }
    
    const batch = writeBatch(db);
    
    // Filter out undefined values from updates
    const filteredUpdates: any = {};
    Object.keys(updates).forEach(key => {
      const value = updates[key as keyof Task];
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    });
    
    const updateData = {
      ...filteredUpdates,
      updatedAt: Timestamp.now(),
      lastModifiedBy: userId,
      version: (currentTask.version || 1) + 1
    };
    
    batch.update(taskRef, updateData);
    
    // Add history entry for each changed field
    Object.keys(updates).forEach(field => {
      const historyRef = doc(collection(db, 'taskHistory'));
      const oldValue = currentTask[field as keyof Task];
      const newValue = updates[field as keyof Task];
      
      // Create details object and only include non-undefined values
      const details: any = { field };
      if (oldValue !== undefined) {
        details.oldValue = oldValue;
      }
      if (newValue !== undefined) {
        details.newValue = newValue;
      }
      
      batch.set(historyRef, {
        taskId,
        userId,
        userDisplayName: userDisplayName || 'Unknown User',
        action: 'updated',
        timestamp: Timestamp.now(),
        details
      });
    });
    
    await batch.commit();
    
    // Return the updated task
    const updatedTask = await getDoc(taskRef);
    return {
      id: updatedTask.id,
      ...updatedTask.data()
    };
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
};

// Enhanced sharing functionality with proper invitations
export const shareTaskWithUser = async (
  ownerId: string, 
  taskId: string, 
  recipientEmail: string, 
  permissionLevel: PermissionLevel = 'read',
  ownerDisplayName: string,
  ownerEmail: string,
  message?: string
) => {
  try {
    const batch = writeBatch(db);
    
    // Get the task data
    const taskRef = doc(db, 'users', ownerId, 'tasks', taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      throw new Error('Task not found');
    }
    
    const taskData = { id: taskSnap.id, ...taskSnap.data() } as Task;
    
    // Check permissions
    const permissions = getTaskPermissions(taskData, ownerId);
    if (!permissions.canShare) {
      throw new Error('Insufficient permissions to share this task');
    }
    
    // Create invitation
    const invitationRef = doc(collection(db, 'taskInvitations'));
    const invitation: Omit<TaskInvitation, 'id'> = {
      taskId,
      ownerId,
      ownerDisplayName,
      ownerEmail,
      recipientEmail,
      sharedTaskId: invitationRef.id,
      permissionLevel,
      status: 'pending',
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 7 days
      message
    };
    
    batch.set(invitationRef, invitation);
    
    // Update task sharing info
    const currentSharing = taskData.sharing || [];
    const updatedSharing = [
      ...currentSharing,
      {
        email: recipientEmail,
        permissionLevel,
        sharedTaskId: invitationRef.id,
        sharedAt: Timestamp.now(),
        sharedBy: ownerId
      }
    ];
    
    batch.update(taskRef, {
      sharing: updatedSharing,
      isShared: true,
      updatedAt: Timestamp.now()
    });
    
    // Add history entry
    const historyRef = doc(collection(db, 'taskHistory'));
    batch.set(historyRef, {
      taskId,
      userId: ownerId,
      userDisplayName: ownerDisplayName,
      action: 'shared',
      timestamp: Timestamp.now(),
      details: {
        field: 'sharing',
        newValue: { recipientEmail, permissionLevel }
      }
    });
    
    await batch.commit();
    
    return {
      invitationId: invitationRef.id,
      taskId,
      recipientEmail,
      permissionLevel
    };
  } catch (error) {
    console.error('Error sharing task:', error);
    throw error;
  }
};

// Accept task invitation
export const acceptTaskInvitation = async (
  invitationId: string,
  userId: string,
  userDisplayName: string,
  userEmail: string
) => {
  try {
    const batch = writeBatch(db);
    
    // Get invitation
    const invitationRef = doc(db, 'taskInvitations', invitationId);
    const invitationSnap = await getDoc(invitationRef);
    
    if (!invitationSnap.exists()) {
      throw new Error('Invitation not found');
    }
    
    const invitation = { id: invitationSnap.id, ...invitationSnap.data() } as TaskInvitation;
    
    if (invitation.status !== 'pending') {
      throw new Error('Invitation is no longer valid');
    }
    
    if (invitation.expiresAt.toDate() < new Date()) {
      throw new Error('Invitation has expired');
    }
    
    // Update invitation status
    batch.update(invitationRef, {
      status: 'accepted',
      respondedAt: Timestamp.now()
    });
    
    // Create shared task for recipient
    const sharedTaskRef = doc(collection(db, 'users', userId, 'sharedTasks'));
    const sharedTask: Omit<SharedTask, 'id'> = {
      originalTaskId: invitation.taskId,
      ownerId: invitation.ownerId,
      ownerDisplayName: invitation.ownerDisplayName,
      ownerEmail: invitation.ownerEmail,
      sharedAt: Timestamp.now(),
      permissionLevel: invitation.permissionLevel,
      taskData: {} as Task, // Will be populated by real-time sync
      lastSyncedAt: Timestamp.now()
    };
    
    batch.set(sharedTaskRef, sharedTask);
    
    // Update original task with collaborator info
    const originalTaskRef = doc(db, 'users', invitation.ownerId, 'tasks', invitation.taskId);
    const originalTaskSnap = await getDoc(originalTaskRef);
    
    if (originalTaskSnap.exists()) {
      const originalTask = originalTaskSnap.data() as Task;
      const collaborators = originalTask.collaborators || [];
      
      const newCollaborator: TaskCollaborator = {
        userId,
        userEmail,
        userDisplayName,
        permissionLevel: invitation.permissionLevel,
        joinedAt: Timestamp.now(),
        lastActive: Timestamp.now(),
        isOnline: true
      };
      
      // Update sharing info with user ID
      const updatedSharing = originalTask.sharing?.map(share => 
        share.email === userEmail 
          ? { ...share, userId }
          : share
      ) || [];
      
      batch.update(originalTaskRef, {
        collaborators: [...collaborators, newCollaborator],
        sharing: updatedSharing,
        updatedAt: Timestamp.now()
      });
    }
    
    await batch.commit();
    
    return sharedTaskRef.id;
  } catch (error) {
    console.error('Error accepting invitation:', error);
    throw error;
  }
};

// Get shared tasks for a user
export const getSharedTasks = async (userId: string) => {
  try {
    const sharedTasksQuery = query(
      collection(db, 'users', userId, 'sharedTasks'),
      orderBy('sharedAt', 'desc')
    );
    
    const sharedTasksSnap = await getDocs(sharedTasksQuery);
    const sharedTasks: SharedTask[] = [];
    
    for (const docSnap of sharedTasksSnap.docs) {
      const sharedTask = { id: docSnap.id, ...docSnap.data() } as SharedTask;
      
      // Get latest task data
      const originalTaskRef = doc(db, 'users', sharedTask.ownerId, 'tasks', sharedTask.originalTaskId);
      const originalTaskSnap = await getDoc(originalTaskRef);
      
      if (originalTaskSnap.exists()) {
        sharedTask.taskData = { id: originalTaskSnap.id, ...originalTaskSnap.data() } as Task;
        sharedTasks.push(sharedTask);
      }
    }
    
    return sharedTasks;
  } catch (error) {
    console.error('Error getting shared tasks:', error);
    throw error;
  }
};

// Add comment to task (works for both regular and shared tasks)
export const addTaskComment = async (
  taskId: string,
  userId: string,
  userDisplayName: string,
  content: string,
  mentions?: string[],
  parentCommentId?: string
) => {
  try {
    // Build comment data, excluding undefined values
    const commentData: any = {
      taskId,
      userId,
      userDisplayName,
      content,
      createdAt: Timestamp.now()
    };
    
    // Only add optional fields if they have values
    if (mentions && mentions.length > 0) {
      commentData.mentions = mentions;
    }
    
    if (parentCommentId) {
      commentData.parentCommentId = parentCommentId;
    }
    
    const commentRef = await addDoc(collection(db, 'taskComments'), commentData);
    
    // Add history entry
    await addDoc(collection(db, 'taskHistory'), {
      taskId,
      userId,
      userDisplayName,
      action: 'comment_added',
      timestamp: Timestamp.now(),
      details: {
        field: 'comment',
        newValue: content,
        metadata: { commentId: commentRef.id }
      }
    });
    
    return {
      id: commentRef.id,
      ...commentData
    } as TaskComment;
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

// Get comments for a task
export const getTaskComments = async (taskId: string) => {
  try {
    const commentsQuery = query(
      collection(db, 'taskComments'),
      where('taskId', '==', taskId)
      // Removed orderBy to avoid requiring composite index
    );
    
    const commentsSnap = await getDocs(commentsQuery);
    const comments: TaskComment[] = [];
    
    commentsSnap.forEach((doc) => {
      comments.push({
        id: doc.id,
        ...doc.data()
      } as TaskComment);
    });
    
    // Sort comments by createdAt on the client side
    comments.sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
    
    return comments;
  } catch (error) {
    console.error('Error getting comments:', error);
    throw error;
  }
};

// Subscribe to real-time task comments
export const subscribeToTaskComments = (
  taskId: string,
  callback: (comments: TaskComment[]) => void
) => {
  try {
    const commentsQuery = query(
      collection(db, 'taskComments'),
      where('taskId', '==', taskId)
      // Removed orderBy to avoid requiring composite index
      // We'll sort on the client side instead
    );
    
    const unsubscribe = onSnapshot(commentsQuery, (querySnapshot) => {
      const comments: TaskComment[] = [];
      
      querySnapshot.forEach((doc) => {
        comments.push({
          id: doc.id,
          ...doc.data()
        } as TaskComment);
      });
      
      // Sort comments by createdAt on the client side
      comments.sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
      
      callback(comments);
    }, (error) => {
      console.error('Error listening to comments:', error);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up comment subscription:', error);
    throw error;
  }
};

// Get task history
export const getTaskHistory = async (taskId: string, limitCount: number = 50) => {
  try {
    const historyQuery = query(
      collection(db, 'taskHistory'),
      where('taskId', '==', taskId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const historySnap = await getDocs(historyQuery);
    const history: TaskHistory[] = [];
    
    historySnap.forEach((doc) => {
      history.push({
        id: doc.id,
        ...doc.data()
      } as TaskHistory);
    });
    
    return history;
  } catch (error) {
    console.error('Error getting task history:', error);
    throw error;
  }
};

// Subscribe to real-time task updates including shared tasks
export const subscribeToUserTasks = (
  userId: string, 
  callback: (tasks: Task[], sharedTasks: SharedTask[]) => void
) => {
  try {
    // Subscribe to user's own tasks
    const userTasksQuery = query(
      collection(db, 'users', userId, 'tasks'),
      orderBy('createdAt', 'desc')
    );
    
    // Subscribe to shared tasks
    const sharedTasksQuery = query(
      collection(db, 'users', userId, 'sharedTasks'),
      orderBy('sharedAt', 'desc')
    );
    
    let userTasks: Task[] = [];
    let sharedTasks: SharedTask[] = [];
    
    const unsubscribeUserTasks = onSnapshot(userTasksQuery, (querySnapshot) => {
      userTasks = [];
      querySnapshot.forEach((doc) => {
        userTasks.push({
          id: doc.id,
          ...doc.data()
        } as Task);
      });
      
      callback(userTasks, sharedTasks);
    });
    
    const unsubscribeSharedTasks = onSnapshot(sharedTasksQuery, async (querySnapshot) => {
      sharedTasks = [];
      
             // Process each shared task and fetch latest data
       const sharedTaskPromises = querySnapshot.docs.map(async (docSnapshot) => {
         const sharedTaskData = { id: docSnapshot.id, ...docSnapshot.data() } as SharedTask;
         
         try {
           // Fetch the latest task data from the owner's collection
           const originalTaskRef = doc(db, 'users', sharedTaskData.ownerId, 'tasks', sharedTaskData.originalTaskId);
           const originalTaskSnap = await getDoc(originalTaskRef);
           
           if (originalTaskSnap.exists()) {
             const latestTaskData = { id: originalTaskSnap.id, ...originalTaskSnap.data() } as Task;
             
             // Update the shared task with latest data
             sharedTaskData.taskData = latestTaskData;
             sharedTaskData.lastSyncedAt = Timestamp.now();
             
             return sharedTaskData;
           } else {
             // Original task was deleted, remove this shared task
             console.warn(`Original task ${sharedTaskData.originalTaskId} not found, removing shared task`);
             await deleteDoc(docSnapshot.ref);
             return null;
           }
         } catch (error) {
           console.error('Error fetching original task data:', error);
           return sharedTaskData; // Return stale data rather than nothing
         }
       });
      
      // Wait for all shared tasks to be processed
      const processedSharedTasks = await Promise.all(sharedTaskPromises);
      sharedTasks = processedSharedTasks.filter(task => task !== null) as SharedTask[];
      
      callback(userTasks, sharedTasks);
    });
    
    // Return combined unsubscribe function
    return () => {
      unsubscribeUserTasks();
      unsubscribeSharedTasks();
    };
  } catch (error) {
    console.error('Error setting up task subscriptions:', error);
    throw error;
  }
};

// Delete a task (with permission checking)
export const deleteTask = async (userId: string, taskId: string) => {
  try {
    const taskRef = doc(db, 'users', userId, 'tasks', taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      throw new Error('Task not found');
    }
    
    const task = { id: taskSnap.id, ...taskSnap.data() } as Task;
    
    // Check permissions
    const permissions = getTaskPermissions(task, userId);
    if (!permissions.canDelete && userId !== task.userId) {
      throw new Error('Insufficient permissions to delete this task');
    }
    
    const batch = writeBatch(db);
    
    // Delete the task
    batch.delete(taskRef);
    
    // Add history entry
    const historyRef = doc(collection(db, 'taskHistory'));
    batch.set(historyRef, {
      taskId,
      userId,
      userDisplayName: 'Unknown User', // Should be passed as parameter
      action: 'deleted',
      timestamp: Timestamp.now(),
      details: {
        field: 'task',
        oldValue: task
      }
    });
    
    await batch.commit();
    return taskId;
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
};

// Get all tasks for a user (including shared)
export const getUserTasks = async (userId: string) => {
  try {
    const tasksQuery = query(
      collection(db, 'users', userId, 'tasks'),
      orderBy('createdAt', 'desc')
    );
    
    const taskSnaps = await getDocs(tasksQuery);
    
    const tasks: Task[] = [];
    taskSnaps.forEach((doc) => {
      tasks.push({
        id: doc.id,
        ...doc.data()
      } as Task);
    });
    
    return tasks;
  } catch (error) {
    console.error('Error getting tasks:', error);
    throw error;
  }
};

// Get a single task by ID
export const getTaskById = async (userId: string, taskId: string) => {
  try {
    const taskRef = doc(db, 'users', userId, 'tasks', taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      throw new Error('Task not found');
    }
    
    return {
      id: taskSnap.id,
      ...taskSnap.data()
    } as Task;
  } catch (error) {
    console.error('Error getting task:', error);
    throw error;
  }
};

// Get tasks by category
export const getTasksByCategory = async (userId: string, categoryId: string) => {
  try {
    const tasksQuery = query(
      collection(db, 'users', userId, 'tasks'),
      where('categoryId', '==', categoryId),
      orderBy('createdAt', 'desc')
    );
    
    const taskSnaps = await getDocs(tasksQuery);
    
    const tasks: Task[] = [];
    taskSnaps.forEach((doc) => {
      tasks.push({
        id: doc.id,
        ...doc.data()
      } as Task);
    });
    
    return tasks;
  } catch (error) {
    console.error('Error getting tasks by category:', error);
    throw error;
  }
};

// Get tasks by status
export const getTasksByStatus = async (userId: string, status: TaskStatus) => {
  try {
    const tasksQuery = query(
      collection(db, 'users', userId, 'tasks'),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    
    const taskSnaps = await getDocs(tasksQuery);
    
    const tasks: Task[] = [];
    taskSnaps.forEach((doc) => {
      tasks.push({
        id: doc.id,
        ...doc.data()
      } as Task);
    });
    
    return tasks;
  } catch (error) {
    console.error('Error getting tasks by status:', error);
    throw error;
  }
};

// Get tasks by priority
export const getTasksByPriority = async (userId: string, priority: TaskPriority) => {
  try {
    const tasksQuery = query(
      collection(db, 'users', userId, 'tasks'),
      where('priority', '==', priority),
      orderBy('createdAt', 'desc')
    );
    
    const taskSnaps = await getDocs(tasksQuery);
    
    const tasks: Task[] = [];
    taskSnaps.forEach((doc) => {
      tasks.push({
        id: doc.id,
        ...doc.data()
      } as Task);
    });
    
    return tasks;
  } catch (error) {
    console.error('Error getting tasks by priority:', error);
    throw error;
  }
};

// Get upcoming tasks (due soon)
export const getUpcomingTasks = async (userId: string) => {
  try {
    // Get tasks due in the next 3 days
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
    const now = Timestamp.now();
    const futureCutoff = Timestamp.fromDate(threeDaysFromNow);
    
    const tasksQuery = query(
      collection(db, 'users', userId, 'tasks'),
      where('dueDate', '>=', now),
      where('dueDate', '<=', futureCutoff),
      orderBy('dueDate', 'asc')
    );
    
    const taskSnaps = await getDocs(tasksQuery);
    
    const tasks: Task[] = [];
    taskSnaps.forEach((doc) => {
      tasks.push({
        id: doc.id,
        ...doc.data()
      } as Task);
    });
    
    return tasks;
  } catch (error) {
    console.error('Error getting upcoming tasks:', error);
    throw error;
  }
};

// Get overdue tasks
export const getOverdueTasks = async (userId: string) => {
  try {
    const now = Timestamp.now();
    
    const tasksQuery = query(
      collection(db, 'users', userId, 'tasks'),
      where('dueDate', '<', now),
      where('status', '!=', 'COMPLETED'),
      orderBy('dueDate', 'asc')
    );
    
    const taskSnaps = await getDocs(tasksQuery);
    
    const tasks: Task[] = [];
    taskSnaps.forEach((doc) => {
      tasks.push({
        id: doc.id,
        ...doc.data()
      } as Task);
    });
    
    return tasks;
  } catch (error) {
    console.error('Error getting overdue tasks:', error);
    throw error;
  }
};

// Subscribe to real-time task updates (original function)
export const subscribeToTasks = (userId: string, callback: (tasks: Task[]) => void) => {
  try {
    const tasksQuery = query(
      collection(db, 'users', userId, 'tasks'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(tasksQuery, (querySnapshot) => {
      const tasks: Task[] = [];
      querySnapshot.forEach((doc) => {
        tasks.push({
          id: doc.id,
          ...doc.data()
        } as Task);
      });
      
      callback(tasks);
    }, (error) => {
      console.error('Error listening to tasks:', error);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up task subscription:', error);
    throw error;
  }
};

// Create a subtask
export const createSubtask = async (
  userId: string, 
  parentTaskId: string, 
  subtask: Omit<Task, 'id' | 'createdAt'>
) => {
  try {
    const subtaskData = {
      ...subtask,
      parentTaskId,
      createdAt: Timestamp.now(),
      userId
    };
    
    // Add the subtask to Firestore
    const docRef = await addDoc(
      collection(db, 'users', userId, 'tasks', parentTaskId, 'subtasks'), 
      subtaskData
    );
    
    // Return the created subtask with ID
    return {
      id: docRef.id,
      ...subtaskData
    };
  } catch (error) {
    console.error('Error creating subtask:', error);
    throw error;
  }
};

 