import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Category } from '../types/task';

// Default categories
const defaultCategories = [
  { name: 'Work', color: '#4299E1', icon: 'briefcase' },
  { name: 'Personal', color: '#F56565', icon: 'user' },
  { name: 'Shopping', color: '#ED8936', icon: 'shopping-cart' },
  { name: 'Health', color: '#48BB78', icon: 'heart' },
  { name: 'Finance', color: '#9F7AEA', icon: 'dollar-sign' },
  { name: 'Education', color: '#ECC94B', icon: 'book' },
  { name: 'Family', color: '#E53E3E', icon: 'home' },
  { name: 'Travel', color: '#38B2AC', icon: 'plane' }
];

// Create a new category
export const createCategory = async (userId: string, category: Omit<Category, 'id' | 'userId' | 'createdAt'>) => {
  try {
    const categoryData = {
      ...category,
      userId,
      createdAt: Timestamp.now()
    };
    
    // Add the category to Firestore
    const docRef = await addDoc(collection(db, 'users', userId, 'categories'), categoryData);
    
    // Return the created category with ID
    return {
      id: docRef.id,
      ...categoryData
    };
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
};

// Initialize default categories for a new user
export const initializeDefaultCategories = async (userId: string) => {
  try {
    // Check if user already has categories
    const existingCategoriesQuery = query(collection(db, 'users', userId, 'categories'));
    const existingCategoriesSnap = await getDocs(existingCategoriesQuery);
    
    if (!existingCategoriesSnap.empty) {
      // User already has categories
      return;
    }
    
    // Create default categories for the user
    const createdCategories = await Promise.all(
      defaultCategories.map(category => createCategory(userId, category))
    );
    
    return createdCategories;
  } catch (error) {
    console.error('Error initializing default categories:', error);
    throw error;
  }
};

// Update an existing category
export const updateCategory = async (userId: string, categoryId: string, updates: Partial<Category>) => {
  try {
    const updatedData = {
      ...updates,
      updatedAt: Timestamp.now()
    };
    
    const categoryRef = doc(db, 'users', userId, 'categories', categoryId);
    await updateDoc(categoryRef, updatedData);
    
    // Return the updated category
    const updatedCategory = await getDoc(categoryRef);
    return {
      id: updatedCategory.id,
      ...updatedCategory.data()
    };
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
};

// Delete a category
export const deleteCategory = async (userId: string, categoryId: string, reassignToId?: string) => {
  try {
    const categoryRef = doc(db, 'users', userId, 'categories', categoryId);
    
    // If a reassignment category is specified, update all tasks with this category
    if (reassignToId) {
      const tasksRef = collection(db, 'users', userId, 'tasks');
      const tasksQuery = query(tasksRef, where('categoryId', '==', categoryId));
      const tasksSnap = await getDocs(tasksQuery);
      
      // Update each task with the new category
      const updatePromises = tasksSnap.docs.map(taskDoc => 
        updateDoc(doc(db, 'users', userId, 'tasks', taskDoc.id), {
          categoryId: reassignToId,
          updatedAt: Timestamp.now()
        })
      );
      
      await Promise.all(updatePromises);
    }
    
    // Delete the category
    await deleteDoc(categoryRef);
    return categoryId;
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

// Get a single category by ID
export const getCategoryById = async (userId: string, categoryId: string) => {
  try {
    const categoryRef = doc(db, 'users', userId, 'categories', categoryId);
    const categorySnap = await getDoc(categoryRef);
    
    if (!categorySnap.exists()) {
      throw new Error('Category not found');
    }
    
    return {
      id: categorySnap.id,
      ...categorySnap.data()
    } as Category;
  } catch (error) {
    console.error('Error getting category:', error);
    throw error;
  }
};

// Get all categories for a user
export const getUserCategories = async (userId: string) => {
  try {
    const categoriesQuery = query(
      collection(db, 'users', userId, 'categories'),
      orderBy('name', 'asc')
    );
    
    const categorySnaps = await getDocs(categoriesQuery);
    
    const categories: Category[] = [];
    categorySnaps.forEach((doc) => {
      categories.push({
        id: doc.id,
        ...doc.data()
      } as Category);
    });
    
    return categories;
  } catch (error) {
    console.error('Error getting categories:', error);
    throw error;
  }
};

// Subscribe to real-time category updates
export const subscribeToCategories = (userId: string, callback: (categories: Category[]) => void) => {
  try {
    const categoriesQuery = query(
      collection(db, 'users', userId, 'categories'),
      orderBy('name', 'asc')
    );
    
    const unsubscribe = onSnapshot(categoriesQuery, (querySnapshot) => {
      const categories: Category[] = [];
      querySnapshot.forEach((doc) => {
        categories.push({
          id: doc.id,
          ...doc.data()
        } as Category);
      });
      
      callback(categories);
    }, (error) => {
      console.error('Error listening to categories:', error);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up categories subscription:', error);
    throw error;
  }
}; 