import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  Timestamp,
  setDoc,
  deleteDoc,
  getDocs,
  getDoc,
  limit,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  TaskPresence, 
  TaskNotification,
  Task,
  TaskCollaborator,
  PermissionLevel
} from '../types/task';

// User search interface for sharing
interface UserSearchResult {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  lastSeen?: Date;
}

// Search users for sharing (implementation depends on your user collection structure)
export const searchUsers = async (query: string, limitResults: number = 10): Promise<UserSearchResult[]> => {
  try {
    // This implementation assumes you have a 'users' collection
    // You might need to adjust based on your Firebase Auth setup
    const usersQuery = collection(db, 'users');
    const usersSnapshot = await getDocs(usersQuery);
    
    const users: UserSearchResult[] = [];
    const searchLower = query.toLowerCase();
    
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      const displayName = userData.displayName || userData.name || '';
      const email = userData.email || '';
      
      // Simple search implementation - you might want to use Algolia or similar for production
      if (
        displayName.toLowerCase().includes(searchLower) ||
        email.toLowerCase().includes(searchLower)
      ) {
        users.push({
          uid: doc.id,
          email: email,
          displayName: displayName,
          photoURL: userData.photoURL,
          lastSeen: userData.lastSeen?.toDate()
        });
      }
    });
    
    return users.slice(0, limitResults);
  } catch (error) {
    console.error('Error searching users:', error);
    throw new Error('Failed to search users');
  }
};

// Get task collaborators
export const getTaskCollaborators = async (ownerId: string, taskId: string): Promise<TaskCollaborator[]> => {
  try {
    const taskRef = doc(db, 'users', ownerId, 'tasks', taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      throw new Error('Task not found');
    }
    
    const taskData = taskSnap.data();
    const collaborators = taskData.collaborators || [];
    
    // Add owner as a collaborator if not already present
    const ownerExists = collaborators.some((collab: TaskCollaborator) => collab.userId === ownerId);
    if (!ownerExists) {
      // Get owner details
      const ownerRef = doc(db, 'users', ownerId);
      const ownerSnap = await getDoc(ownerRef);
      
      if (ownerSnap.exists()) {
        const ownerData = ownerSnap.data();
        collaborators.unshift({
          userId: ownerId,
          userEmail: ownerData.email,
          userDisplayName: ownerData.displayName || ownerData.name,
          userPhotoURL: ownerData.photoURL,
          permissionLevel: 'admin' as PermissionLevel,
          joinedAt: taskData.createdAt,
          isOwner: true
        });
      }
    }
    
    return collaborators;
  } catch (error) {
    console.error('Error getting task collaborators:', error);
    throw error;
  }
};

// Update user permission
export const updateUserPermission = async (
  ownerId: string, 
  taskId: string, 
  userId: string, 
  newPermission: PermissionLevel
): Promise<void> => {
  try {
    const taskRef = doc(db, 'users', ownerId, 'tasks', taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      throw new Error('Task not found');
    }
    
    const taskData = taskSnap.data();
    const collaborators = taskData.collaborators || [];
    
    // Update collaborator permission
    const updatedCollaborators = collaborators.map((collab: TaskCollaborator) =>
      collab.userId === userId 
        ? { ...collab, permissionLevel: newPermission }
        : collab
    );
    
    await updateDoc(taskRef, {
      collaborators: updatedCollaborators,
      updatedAt: Timestamp.now()
    });
    
    // Create notification for the user whose permission was changed
    if (userId !== ownerId) {
      await createNotification(
        userId,
        taskId,
        'permission_changed',
        'Permission Updated',
        `Your permission for "${taskData.title}" has been changed to ${newPermission}`,
        { newPermission, taskTitle: taskData.title }
      );
    }
  } catch (error) {
    console.error('Error updating user permission:', error);
    throw error;
  }
};

// Remove collaborator
export const removeCollaborator = async (
  ownerId: string, 
  taskId: string, 
  userId: string
): Promise<void> => {
  try {
    const taskRef = doc(db, 'users', ownerId, 'tasks', taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      throw new Error('Task not found');
    }
    
    const taskData = taskSnap.data();
    const collaborators = taskData.collaborators || [];
    
    // Remove collaborator
    const updatedCollaborators = collaborators.filter((collab: TaskCollaborator) => 
      collab.userId !== userId
    );
    
    // Update sharing info as well
    const sharing = taskData.sharing || [];
    const updatedSharing = sharing.filter((share: any) => share.userId !== userId);
    
    await updateDoc(taskRef, {
      collaborators: updatedCollaborators,
      sharing: updatedSharing,
      isShared: updatedCollaborators.length > 1, // More than just the owner
      updatedAt: Timestamp.now()
    });
    
    // Create notification for the removed user
    const removedUser = collaborators.find((collab: TaskCollaborator) => collab.userId === userId);
    if (removedUser) {
      await createNotification(
        userId,
        taskId,
        'access_removed',
        'Access Removed',
        `You no longer have access to "${taskData.title}"`,
        { taskTitle: taskData.title }
      );
    }
    
    // Also remove from user's shared tasks if it exists
    try {
      const userSharedTaskRef = doc(db, 'users', userId, 'sharedTasks', taskId);
      await deleteDoc(userSharedTaskRef);
    } catch (error) {
      // Ignore if doesn't exist
      console.log('Shared task not found in user collection, skipping...');
    }
  } catch (error) {
    console.error('Error removing collaborator:', error);
    throw error;
  }
};

// Add collaborators (used when sharing task)
export const addCollaborators = async (
  ownerId: string,
  taskId: string,
  users: { email: string; permissionLevel: PermissionLevel }[],
  ownerDisplayName: string,
  message?: string
): Promise<void> => {
  try {
    const taskRef = doc(db, 'users', ownerId, 'tasks', taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      throw new Error('Task not found');
    }
    
    const taskData = taskSnap.data();
    const existingCollaborators = taskData.collaborators || [];
    const existingSharing = taskData.sharing || [];
    
    const newCollaborators = [...existingCollaborators];
    const newSharing = [...existingSharing];
    
    for (const user of users) {
      // Check if user already exists
      const existingCollab = existingCollaborators.find((collab: TaskCollaborator) => 
        collab.userEmail === user.email
      );
      
      if (!existingCollab) {
        // Try to find user in users collection
        const usersQuery = query(
          collection(db, 'users'),
          where('email', '==', user.email),
          limit(1)
        );
        const userSnap = await getDocs(usersQuery);
        
        let userData: any = null;
        if (!userSnap.empty) {
          userData = userSnap.docs[0].data();
          userData.uid = userSnap.docs[0].id;
        }
        
        // Add to collaborators - filter out undefined values
        const newCollaborator: TaskCollaborator = {
          userId: userData?.uid || user.email, // Use email as fallback ID
          userEmail: user.email,
          userDisplayName: userData?.displayName || userData?.name || user.email,
          permissionLevel: user.permissionLevel,
          joinedAt: Timestamp.now(),
          isOwner: false,
          ...(userData?.photoURL && { userPhotoURL: userData.photoURL })
        };
        
        newCollaborators.push(newCollaborator);
        
        // Add to sharing info - filter out undefined values
        const sharingData: any = {
          email: user.email,
          permissionLevel: user.permissionLevel,
          sharedTaskId: `${taskId}_${user.email}`,
          sharedAt: Timestamp.now(),
          sharedBy: ownerId
        };
        
        // Only add userId if it exists
        if (userData?.uid) {
          sharingData.userId = userData.uid;
        }
        
        newSharing.push(sharingData);
        
        // Create notification if user exists
        if (userData?.uid) {
          // Create metadata object without undefined values
          const notificationMetadata: any = {
            ownerDisplayName, 
            taskTitle: taskData.title, 
            permissionLevel: user.permissionLevel
          };
          
          // Only add message if it's not undefined
          if (message !== undefined && message !== null) {
            notificationMetadata.message = message;
          }
          
          await createNotification(
            userData.uid,
            taskId,
            'task_shared',
            'Task Shared With You',
            `${ownerDisplayName} shared "${taskData.title}" with you${message ? ': ' + message : ''}`,
            notificationMetadata
          );
          
          // Add to user's shared tasks collection with complete task data
          const sharedTaskRef = doc(db, 'users', userData.uid, 'sharedTasks', taskId);
          await setDoc(sharedTaskRef, {
            originalTaskId: taskId,
            ownerId: ownerId,
            ownerDisplayName: ownerDisplayName,
            ownerEmail: taskData.userEmail || '',
            sharedAt: Timestamp.now(),
            permissionLevel: user.permissionLevel,
            taskData: {
              id: taskId,
              title: taskData.title,
              description: taskData.description || '',
              status: taskData.status,
              priority: taskData.priority,
              dueDate: taskData.dueDate,
              createdAt: taskData.createdAt,
              updatedAt: taskData.updatedAt || Timestamp.now(),
              userId: taskData.userId,
              categoryId: taskData.categoryId,
              collaborators: taskData.collaborators || [],
              sharing: taskData.sharing || [],
              isShared: true
            },
            lastSyncedAt: Timestamp.now()
          });
        } else {
          // Create notification for non-registered user (email notification)
          console.log(`User ${user.email} not found in database, consider sending email notification`);
        }
      }
    }
    
    // Clean the arrays to remove any undefined values before updating
    const cleanCollaborators = newCollaborators.map((collab: any) => {
      const cleaned: any = {};
      Object.entries(collab).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          cleaned[key] = value;
        }
      });
      return cleaned;
    });

    const cleanSharing = newSharing.map((share: any) => {
      const cleaned: any = {};
      Object.entries(share).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          cleaned[key] = value;
        }
      });
      return cleaned;
    });

    // Update task with new collaborators and sharing info
    await updateDoc(taskRef, {
      collaborators: cleanCollaborators,
      sharing: cleanSharing,
      isShared: newCollaborators.length > 1,
      updatedAt: Timestamp.now()
    });
    
  } catch (error) {
    console.error('Error adding collaborators:', error);
    throw error;
  }
};

// Real-time presence management
export const updateUserPresence = async (
  userId: string, 
  taskId: string, 
  userDisplayName: string,
  isViewing: boolean = true,
  isEditing: boolean = false
) => {
  try {
    const presenceRef = doc(db, 'taskPresence', `${taskId}_${userId}`);
    
    const presenceData: Omit<TaskPresence, 'id'> = {
      userId,
      userDisplayName,
      taskId,
      lastSeen: Timestamp.now(),
      isViewing,
      isEditing
    };
    
    await setDoc(presenceRef, presenceData, { merge: true });
    
    // Auto-cleanup presence after 5 minutes of inactivity
    setTimeout(async () => {
      try {
        await deleteDoc(presenceRef);
      } catch (error) {
        console.error('Error cleaning up presence:', error);
      }
    }, 5 * 60 * 1000);
    
    return presenceData;
  } catch (error) {
    console.error('Error updating presence:', error);
    throw error;
  }
};

// Subscribe to task presence (who's viewing/editing)
export const subscribeToTaskPresence = (
  taskId: string,
  currentUserId: string,
  callback: (presence: TaskPresence[]) => void
) => {
  try {
    const presenceQuery = query(
      collection(db, 'taskPresence'),
      where('taskId', '==', taskId)
    );
    
    const unsubscribe = onSnapshot(presenceQuery, (querySnapshot) => {
      const presence: TaskPresence[] = [];
      
      querySnapshot.forEach((doc) => {
        const presenceData = doc.data() as TaskPresence;
        
        // Filter out current user and inactive users
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (presenceData.userId !== currentUserId && 
            presenceData.lastSeen.toDate() > fiveMinutesAgo) {
          presence.push({
            ...presenceData,
            id: doc.id
          } as TaskPresence);
        }
      });
      
      callback(presence);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to presence:', error);
    throw error;
  }
};

// Enhanced notification creation with better error handling
export const createNotification = async (
  recipientUserId: string,
  taskId: string,
  type: TaskNotification['type'],
  title: string,
  message: string,
  metadata?: TaskNotification['metadata']
) => {
  try {
    // Validate inputs
    if (!recipientUserId || !taskId || !type || !title || !message) {
      throw new Error('Missing required notification parameters');
    }

    // Filter out undefined values from metadata to prevent Firebase errors
    const cleanMetadata = metadata ? 
      Object.fromEntries(
        Object.entries(metadata).filter(([_, value]) => value !== undefined && value !== null)
      ) : undefined;

    const notificationData: Omit<TaskNotification, 'id'> = {
      userId: recipientUserId,
      taskId,
      type,
      title,
      message,
      createdAt: Timestamp.now(),
      ...(cleanMetadata && Object.keys(cleanMetadata).length > 0 && { metadata: cleanMetadata })
    };
    
    // Add to user's notifications collection
    const notificationRef = await addDoc(
      collection(db, 'users', recipientUserId, 'notifications'), 
      notificationData
    );
    
    console.log(`Notification created successfully: ${notificationRef.id} for user ${recipientUserId}`);
    
    return {
      id: notificationRef.id,
      ...notificationData
    };
  } catch (error) {
    console.error('Error creating notification:', error);
    // Don't throw the error to prevent breaking the main sharing flow
    return null;
  }
};

// Bulk mark notifications as read
export const markAllNotificationsAsRead = async (userId: string) => {
  try {
    const notificationsQuery = query(
      collection(db, 'users', userId, 'notifications'),
      where('readAt', '==', null)
    );
    
    const notificationsSnap = await getDocs(notificationsQuery);
    
    if (notificationsSnap.empty) {
      return 0;
    }
    
    const batch = writeBatch(db);
    const readTimestamp = Timestamp.now();
    
    notificationsSnap.docs.forEach(doc => {
      batch.update(doc.ref, { readAt: readTimestamp });
    });
    
    await batch.commit();
    return notificationsSnap.size;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

// Mark notification as read
export const markNotificationAsRead = async (
  userId: string, 
  notificationId: string
) => {
  try {
    const notificationRef = doc(db, 'users', userId, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      readAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

// Subscribe to user notifications
export const subscribeToNotifications = (
  userId: string,
  callback: (notifications: TaskNotification[]) => void
) => {
  try {
    const notificationsQuery = query(
      collection(db, 'users', userId, 'notifications'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(notificationsQuery, (querySnapshot) => {
      const notifications: TaskNotification[] = [];
      
      querySnapshot.forEach((doc) => {
        notifications.push({
          id: doc.id,
          ...doc.data()
        } as TaskNotification);
      });
      
      callback(notifications);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to notifications:', error);
    throw error;
  }
};

// Notify collaborators about task changes
export const notifyCollaborators = async (
  task: Task,
  changeType: 'status_changed' | 'comment_added' | 'task_assigned',
  changedByUserId: string,
  changedByUserName: string,
  details?: any
) => {
  try {
    const collaborators = task.collaborators || [];
    const notifications = [];
    
    // Create a set to track who we've already notified to avoid duplicates
    const notifiedUserIds = new Set<string>();
    
    // Always notify the task owner (unless they made the change)
    if (task.userId !== changedByUserId) {
      let title = '';
      let message = '';
      
      switch (changeType) {
        case 'status_changed':
          title = 'Task Status Updated';
          message = `${changedByUserName} changed the status of "${task.title}" to ${details.newStatus}`;
          break;
        case 'comment_added':
          title = 'New Comment';
          message = `${changedByUserName} commented on "${task.title}"`;
          break;
        case 'task_assigned':
          title = 'Task Assigned';
          message = `${changedByUserName} assigned someone to "${task.title}"`;
          break;
      }
      
      const ownerNotification = createNotification(
        task.userId,
        task.id,
        changeType,
        title,
        message,
        {
          fromUserId: changedByUserId,
          fromUserDisplayName: changedByUserName,
          ...details
        }
      );
      
      notifications.push(ownerNotification);
      notifiedUserIds.add(task.userId);
    }
    
    // Notify all collaborators (except the one who made the change and the owner if already notified)
    for (const collaborator of collaborators) {
      // Don't notify the user who made the change or if already notified
      if (collaborator.userId === changedByUserId || notifiedUserIds.has(collaborator.userId)) {
        continue;
      }
      
      let title = '';
      let message = '';
      
      switch (changeType) {
        case 'status_changed':
          title = 'Task Status Updated';
          message = `${changedByUserName} changed the status of "${task.title}" to ${details.newStatus}`;
          break;
        case 'comment_added':
          title = 'New Comment';
          message = `${changedByUserName} commented on "${task.title}"`;
          break;
        case 'task_assigned':
          title = 'Task Assigned';
          message = `${changedByUserName} assigned you to "${task.title}"`;
          break;
      }
      
      const notification = createNotification(
        collaborator.userId,
        task.id,
        changeType,
        title,
        message,
        {
          fromUserId: changedByUserId,
          fromUserDisplayName: changedByUserName,
          ...details
        }
      );
      
      notifications.push(notification);
      notifiedUserIds.add(collaborator.userId);
    }
    
    await Promise.all(notifications);
  } catch (error) {
    console.error('Error notifying collaborators:', error);
    throw error;
  }
};

// Subscribe to real-time task comments
export const subscribeToTaskComments = (
  taskId: string,
  callback: (comments: any[]) => void
) => {
  try {
    const commentsQuery = query(
      collection(db, 'taskComments'),
      where('taskId', '==', taskId),
      orderBy('createdAt', 'asc')
    );
    
    const unsubscribe = onSnapshot(commentsQuery, (querySnapshot) => {
      const comments: any[] = [];
      
      querySnapshot.forEach((doc) => {
        comments.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      callback(comments);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to comments:', error);
    throw error;
  }
};

// Update collaborator status (online/offline)
export const updateCollaboratorStatus = async (
  taskId: string,
  userId: string,
  isOnline: boolean
) => {
  try {
    // This would typically update the collaborator's status in the task document
    // For now, we'll use the presence system
    if (isOnline) {
      await updateUserPresence(userId, taskId, 'Unknown User', true, false);
    }
  } catch (error) {
    console.error('Error updating collaborator status:', error);
    throw error;
  }
};

// Clean up old notifications (called periodically)
export const cleanupOldNotifications = async (userId: string, daysOld: number = 30) => {
  try {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    
    const oldNotificationsQuery = query(
      collection(db, 'users', userId, 'notifications'),
      where('createdAt', '<', Timestamp.fromDate(cutoffDate))
    );
    
    const oldNotificationsSnap = await getDocs(oldNotificationsQuery);
    
    const deletePromises = oldNotificationsSnap.docs.map(doc => 
      deleteDoc(doc.ref)
    );
    
    await Promise.all(deletePromises);
    
    return oldNotificationsSnap.size;
  } catch (error) {
    console.error('Error cleaning up notifications:', error);
    throw error;
  }
};

// Handle @mentions in comments
export const handleMentions = async (
  taskId: string,
  commentId: string,
  mentions: string[],
  fromUserId: string,
  fromUserName: string,
  commentContent: string
) => {
  try {
    const mentionNotifications = mentions.map(mentionedUserId => {
      if (mentionedUserId === fromUserId) return null; // Don't mention yourself
      
      return createNotification(
        mentionedUserId,
        taskId,
        'mention',
        'You were mentioned',
        `${fromUserName} mentioned you in a comment: "${commentContent.substring(0, 100)}..."`,
        {
          fromUserId,
          fromUserDisplayName: fromUserName,
          commentId
        }
      );
    }).filter(Boolean);
    
    await Promise.all(mentionNotifications);
  } catch (error) {
    console.error('Error handling mentions:', error);
    throw error;
  }
}; 