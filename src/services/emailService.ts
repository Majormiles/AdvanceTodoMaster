import { db } from '../firebase/config';
import { doc, getDoc, setDoc, addDoc, collection, updateDoc, Timestamp } from 'firebase/firestore';
import { Task } from '../types/task';

// Interface for notification settings
export interface NotificationSettings {
  userId: string;
  email: string;
  dueDateReminders: boolean;
  taskAssignments: boolean;
  taskUpdates: boolean;
  comments: boolean;
  sharedTasks: boolean;
  dailyDigest: boolean;
  reminderTime: '1_DAY' | '2_DAYS' | '4_HOURS' | '1_HOUR';
}

// Get user notification settings
export const getUserNotificationSettings = async (userId: string) => {
  try {
    const settingsRef = doc(db, 'users', userId, 'settings', 'notifications');
    const settingsSnap = await getDoc(settingsRef);
    
    if (settingsSnap.exists()) {
      return settingsSnap.data() as NotificationSettings;
    } else {
      // Create default settings if they don't exist
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data();
      const defaultSettings: NotificationSettings = {
        userId,
        email: userData.email,
        dueDateReminders: true,
        taskAssignments: true,
        taskUpdates: true,
        comments: true,
        sharedTasks: true,
        dailyDigest: false,
        reminderTime: '1_DAY'
      };
      
      await setDoc(settingsRef, defaultSettings);
      return defaultSettings;
    }
  } catch (error) {
    console.error('Error getting notification settings:', error);
    throw error;
  }
};

// Update notification settings
export const updateNotificationSettings = async (userId: string, settings: Partial<NotificationSettings>) => {
  try {
    const settingsRef = doc(db, 'users', userId, 'settings', 'notifications');
    await updateDoc(settingsRef, settings);
    
    // Return the updated settings
    const updatedSettings = await getDoc(settingsRef);
    return updatedSettings.data() as NotificationSettings;
  } catch (error) {
    console.error('Error updating notification settings:', error);
    throw error;
  }
};

// Schedule due date reminder for a task
export const scheduleDueDateReminder = async (userId: string, task: Task) => {
  if (!task.dueDate) return null;
  
  try {
    // Get user notification settings
    const settings = await getUserNotificationSettings(userId);
    
    if (!settings.dueDateReminders) {
      return null; // User has disabled due date reminders
    }
    
    // Calculate reminder time based on user preference
    const dueDate = task.dueDate.toDate();
    let reminderDate = new Date(dueDate);
    
    switch (settings.reminderTime) {
      case '1_DAY':
        reminderDate.setDate(dueDate.getDate() - 1);
        break;
      case '2_DAYS':
        reminderDate.setDate(dueDate.getDate() - 2);
        break;
      case '4_HOURS':
        reminderDate.setHours(dueDate.getHours() - 4);
        break;
      case '1_HOUR':
        reminderDate.setHours(dueDate.getHours() - 1);
        break;
    }
    
    // Don't schedule if reminder time is in the past
    if (reminderDate < new Date()) {
      return null;
    }
    
    // Schedule the reminder by creating a document in 'scheduledEmails' collection
    const reminderData = {
      userId,
      taskId: task.id,
      taskTitle: task.title,
      taskDescription: task.description || '',
      dueDate: task.dueDate,
      reminderDate: Timestamp.fromDate(reminderDate),
      recipientEmail: settings.email,
      status: 'PENDING',
      type: 'DUE_DATE_REMINDER',
      createdAt: Timestamp.now()
    };
    
    const scheduledEmailRef = await addDoc(collection(db, 'scheduledEmails'), reminderData);
    return scheduledEmailRef.id;
  } catch (error) {
    console.error('Error scheduling due date reminder:', error);
    throw error;
  }
};

// Send task invitation email
export const sendTaskInvitationEmail = async (
  ownerId: string,
  taskId: string,
  recipientEmail: string,
  invitationId: string
) => {
  try {
    // Get the task data
    const taskRef = doc(db, 'users', ownerId, 'tasks', taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      throw new Error('Task not found');
    }
    
    const taskData = taskSnap.data() as Task;
    
    // Get the owner's information
    const ownerRef = doc(db, 'users', ownerId);
    const ownerSnap = await getDoc(ownerRef);
    
    if (!ownerSnap.exists()) {
      throw new Error('Owner not found');
    }
    
    const ownerData = ownerSnap.data();
    
    // Create the email data
    const emailData = {
      recipientEmail,
      subject: `${ownerData.displayName || 'Someone'} has shared a task with you: ${taskData.title}`,
      templateId: 'task-invitation',
      templateData: {
        recipientEmail,
        ownerName: ownerData.displayName || 'Someone',
        ownerEmail: ownerData.email,
        taskTitle: taskData.title,
        taskDescription: taskData.description || 'No description provided.',
        invitationLink: `https://yourdomain.com/invitation/${invitationId}`,
        invitationId
      }
    };
    
    // Create a record in the 'emails' collection
    await addDoc(collection(db, 'emails'), {
      ...emailData,
      status: 'PENDING',
      createdAt: Timestamp.now()
    });
    
    return emailData;
  } catch (error) {
    console.error('Error sending task invitation email:', error);
    throw error;
  }
};

// Send task comment notification
export const sendCommentNotificationEmail = async (
  taskId: string,
  taskOwnerId: string,
  commenterId: string,
  comment: string
) => {
  try {
    // Get the task data
    const taskRef = doc(db, 'users', taskOwnerId, 'tasks', taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      throw new Error('Task not found');
    }
    
    const taskData = taskSnap.data() as Task;
    
    // Get task owner settings to check if they want comment notifications
    const ownerSettings = await getUserNotificationSettings(taskOwnerId);
    
    if (!ownerSettings.comments) {
      return null; // Owner has disabled comment notifications
    }
    
    // Get the commenter's information
    const commenterRef = doc(db, 'users', commenterId);
    const commenterSnap = await getDoc(commenterRef);
    
    if (!commenterSnap.exists()) {
      throw new Error('Commenter not found');
    }
    
    const commenterData = commenterSnap.data();
    
    // Create the email data
    const emailData = {
      recipientEmail: ownerSettings.email,
      subject: `New comment on your task: ${taskData.title}`,
      templateId: 'task-comment',
      templateData: {
        recipientName: ownerSettings.email,
        commenterName: commenterData.displayName || commenterData.email,
        taskTitle: taskData.title,
        commentText: comment,
        taskLink: `https://yourdomain.com/task/${taskId}`
      }
    };
    
    // Create a record in the 'emails' collection
    await addDoc(collection(db, 'emails'), {
      ...emailData,
      status: 'PENDING',
      createdAt: Timestamp.now()
    });
    
    return emailData;
  } catch (error) {
    console.error('Error sending comment notification email:', error);
    throw error;
  }
};

// Send task assignment notification
export const sendTaskAssignmentEmail = async (
  taskId: string,
  taskOwnerId: string,
  assigneeId: string
) => {
  try {
    // Get the task data
    const taskRef = doc(db, 'users', taskOwnerId, 'tasks', taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      throw new Error('Task not found');
    }
    
    const taskData = taskSnap.data() as Task;
    
    // Get the task owner's information
    const ownerRef = doc(db, 'users', taskOwnerId);
    const ownerSnap = await getDoc(ownerRef);
    
    if (!ownerSnap.exists()) {
      throw new Error('Owner not found');
    }
    
    const ownerData = ownerSnap.data();
    
    // Get the assignee's information
    const assigneeRef = doc(db, 'users', assigneeId);
    const assigneeSnap = await getDoc(assigneeRef);
    
    if (!assigneeSnap.exists()) {
      throw new Error('Assignee not found');
    }
    
    const assigneeData = assigneeSnap.data();
    
    // Get assignee notification settings
    const assigneeSettings = await getUserNotificationSettings(assigneeId);
    
    if (!assigneeSettings.taskAssignments) {
      return null; // Assignee has disabled assignment notifications
    }
    
    // Create the email data
    const emailData = {
      recipientEmail: assigneeData.email,
      subject: `You've been assigned a task: ${taskData.title}`,
      templateId: 'task-assignment',
      templateData: {
        recipientName: assigneeData.displayName || assigneeData.email,
        assignerName: ownerData.displayName || ownerData.email,
        taskTitle: taskData.title,
        taskDescription: taskData.description || 'No description provided.',
        dueDate: taskData.dueDate ? taskData.dueDate.toDate().toLocaleDateString() : 'No due date',
        priority: taskData.priority,
        taskLink: `https://yourdomain.com/task/${taskId}`
      }
    };
    
    // Create a record in the 'emails' collection
    await addDoc(collection(db, 'emails'), {
      ...emailData,
      status: 'PENDING',
      createdAt: Timestamp.now()
    });
    
    return emailData;
  } catch (error) {
    console.error('Error sending task assignment email:', error);
    throw error;
  }
}; 