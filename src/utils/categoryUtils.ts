import { initializeDefaultCategories, getUserCategories, createCategory } from '../services/categoryService';
import { Category } from '../types/task';

export const ensureUserHasCategories = async (userId: string): Promise<Category[]> => {
  try {
    // First, get existing categories
    let categories = await getUserCategories(userId);
    
    console.log('🔍 CategoryUtils: Current categories count:', categories.length);
    
    // If no categories exist, initialize defaults
    if (categories.length === 0) {
      console.log('🆕 CategoryUtils: No categories found, initializing defaults...');
      await initializeDefaultCategories(userId);
      
      // Fetch the newly created categories
      categories = await getUserCategories(userId);
      console.log('✅ CategoryUtils: Default categories created, count:', categories.length);
    }
    
    return categories;
  } catch (error) {
    console.error('❌ CategoryUtils: Error ensuring categories:', error);
    throw error;
  }
};

export const createQuickCategories = async (userId: string): Promise<Category[]> => {
  const quickCategories = [
    { name: 'Work', color: '#4299E1', icon: 'briefcase' },
    { name: 'Personal', color: '#F56565', icon: 'user' },
    { name: 'Shopping', color: '#ED8936', icon: 'shopping-cart' },
  ];

  try {
    const createdCategories: Category[] = [];
    
    for (const categoryData of quickCategories) {
      const category = await createCategory(userId, categoryData);
      createdCategories.push(category);
    }
    
    console.log('✅ CategoryUtils: Quick categories created:', createdCategories.length);
    return createdCategories;
  } catch (error) {
    console.error('❌ CategoryUtils: Error creating quick categories:', error);
    throw error;
  }
};

export const debugCategories = async (userId: string): Promise<void> => {
  try {
    const categories = await getUserCategories(userId);
    console.log('🐛 Debug Categories for user:', userId);
    console.log('📊 Total categories:', categories.length);
    console.log('📋 Categories:', categories.map(c => ({ id: c.id, name: c.name, color: c.color })));
  } catch (error) {
    console.error('❌ CategoryUtils: Debug error:', error);
  }
}; 