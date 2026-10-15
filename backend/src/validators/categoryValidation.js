import { readRequiredText } from './commonValidation.js';
import { readWholeNumber } from './productValidation.js';

const largestSortOrder = 999;

// body: { name, sortOrder, comingSoon }. Sort order 0–999, smaller shows first.
export function validateCategoryInput(body) {
  const fieldErrors = {};
  const category = {
    name: readRequiredText(body, 'name', 'Category name', 60, fieldErrors),
    sortOrder: readWholeNumber(body.sortOrder ?? 0, largestSortOrder),
    comingSoon: body.comingSoon === true,
  };
  if (category.sortOrder === null) fieldErrors.sortOrder = `Enter a whole number from 0 to ${largestSortOrder}.`;
  return { category, fieldErrors };
}
