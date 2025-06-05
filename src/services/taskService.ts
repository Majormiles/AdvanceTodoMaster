import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Task, TaskPriority, TaskStatus } from '../types/task';

// Create a new task
export const createTask = async (userId: string, task: Omit<Task, 'id' | 'createdAt'>) => {
  try {
    const taskData = {
      ...task,
      createdAt: Timestamp.now(),
      userId
    };
    
    // Add the task to Firestore
    const docRef = await addDoc(collection(db, 'users', userId, 'tasks'), taskData);
    
    // Return the created task with ID
    return {
      id: docRef.id,
      ...taskData
    };
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
};

// Update an existing task
export const updateTask = async (userId: string, taskId: string, updates: Partial<Task>) => {
  try {
    const taskRef = doc(db, 'users', userId, 'tasks', taskId);
    await updateDoc(taskRef, updates);
    
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

// Delete a task
export const deleteTask = async (userId: string, taskId: string) => {
  try {
    const taskRef = doc(db, 'users', userId, 'tasks', taskId);
    await deleteDoc(taskRef);
    return taskId;
  } catch (error) {
    console.error('Error deleting task:', error);
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

// Get all tasks for a user
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

// Subscribe to real-time task updates
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

// Share a task with another user
export const shareTaskWithUser = async (
  ownerId: string, 
  taskId: string, 
  shareWithEmail: string, 
  permissionLevel: 'view' | 'edit' | 'admin' = 'view'
) => {
  try {
    // Get the task data
    const taskRef = doc(db, 'users', ownerId, 'tasks', taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      throw new Error('Task not found');
    }
    
    const taskData = taskSnap.data() as Task;
    
    // Create a shared task document
    const sharedTaskData = {
      originalTaskId: taskId,
      ownerId: ownerId,
      sharedAt: Timestamp.now(),
      permissionLevel,
      taskData,
    };
    
    // Add shared task to the "sharedTasks" collection
    const sharedTaskRef = await addDoc(
      collection(db, 'sharedTasks'), 
      sharedTaskData
    );
    
    // Create an invitation record
    await addDoc(collection(db, 'taskInvitations'), {
      taskId,
      ownerId,
      recipientEmail: shareWithEmail,
      sharedTaskId: sharedTaskRef.id,
      permissionLevel,
      status: 'PENDING',
      createdAt: Timestamp.now()
    });
    
    // Update the original task with sharing info
    const sharingInfo = taskData.sharing || [];
    sharingInfo.push({
      email: shareWithEmail,
      permissionLevel,
      sharedTaskId: sharedTaskRef.id
    });
    
    await updateDoc(taskRef, {
      sharing: sharingInfo
    });
    
    return {
      taskId,
      sharedWithEmail: shareWithEmail,
      sharedTaskId: sharedTaskRef.id
    };
  } catch (error) {
    console.error('Error sharing task:', error);
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