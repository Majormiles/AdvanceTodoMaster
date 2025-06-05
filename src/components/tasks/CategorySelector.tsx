import React from 'react';
import {
  Select
} from '@chakra-ui/react';
import { Category } from '../../types/task';

interface CategorySelectorProps {
  categories: Category[];
  selectedCategoryId?: string;
  onSelect: (categoryId: string) => void;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategoryId = '',
  onSelect
}) => {
  return (
    <Select
      placeholder="Filter by category"
      value={selectedCategoryId}
      onChange={(e) => onSelect(e.target.value)}
      minW="150px"
    >
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
    </Select>
  );
};

export default CategorySelector; 