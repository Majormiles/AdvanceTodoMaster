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
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  TaskPresence, 
  TaskNotification,
  Task 
} from '../types/task';

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

// Create notification
export const createNotification = async (
  recipientUserId: string,
  taskId: string,
  type: TaskNotification['type'],
  title: string,
  message: string,
  metadata?: TaskNotification['metadata']
) => {
  try {
    const notificationData: Omit<TaskNotification, 'id'> = {
      userId: recipientUserId,
      taskId,
      type,
      title,
      message,
      createdAt: Timestamp.now(),
      metadata
    };
    
    const notificationRef = await addDoc(
      collection(db, 'users', recipientUserId, 'notifications'), 
      notificationData
    );
    
    return {
      id: notificationRef.id,
      ...notificationData
    };
  } catch (error) {
    console.error('Error creating notification:', error);
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
    
    for (const collaborator of collaborators) {
      // Don't notify the user who made the change
      if (collaborator.userId === changedByUserId) continue;
      
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