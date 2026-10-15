import { foreignKeyViolationErrorCode, uniqueViolationErrorCode } from '../dbHelper/databaseConnection.js';
import {
  categoryExists, deleteCategory as deleteCategoryRow, findCategoriesWithProductCount, insertCategory,
  setCategoryImagePath, updateCategory as updateCategoryRow,
} from '../dbHelper/categoryDbHelper.js';
import { readPositiveInteger } from '../validators/commonValidation.js';
import { validateCategoryInput } from '../validators/categoryValidation.js';
import { isRealImage } from '../storage/productImageStorage.js';
import { ServiceError, throwIfFieldErrors } from './serviceError.js';

// Swaps the storage path for a public link. Used by the shop and by admin.
export function withCategoryImageUrl(category, productImageStorage) {
  const { imagePath, ...visibleCategory } = category;
  return { ...visibleCategory, imageUrl: productImageStorage.publicUrlFor(imagePath) };
}

async function listCategories({ database, productImageStorage }) {
  const categories = await findCategoriesWithProductCount(database);
  return { categories: categories.map((category) => withCategoryImageUrl(category, productImageStorage)) };
}

// Turns database rule violations into messages the owner can act on.
async function saveWithFriendlyErrors(save) {
  try {
    return await save();
  } catch (error) {
    if (error.code === uniqueViolationErrorCode) {
      throw ServiceError.invalidFields({ name: 'There is already a category with this name.' });
    }
    if (error.code === foreignKeyViolationErrorCode) {
      throw ServiceError.conflict('This category still has products. Move or delete them first.');
    }
    throw error;
  }
}

function readCategoryForm(body) {
  const { category, fieldErrors } = validateCategoryInput(body);
  throwIfFieldErrors(fieldErrors);
  return category;
}

// Answers with the new id too, so the form can upload its photo next.
async function createCategory(dependencies, body) {
  const category = readCategoryForm(body);
  const categoryId = await saveWithFriendlyErrors(() => insertCategory(dependencies.database, category));
  return { categoryId, ...(await listCategories(dependencies)) };
}

// Opening a "coming soon" category tells the customers who asked for it.
async function updateCategory(dependencies, categoryIdInput, body) {
  const categoryId = readPositiveInteger(categoryIdInput);
  const category = readCategoryForm(body);
  const before = categoryId && await saveWithFriendlyErrors(() => updateCategoryRow(dependencies.database, categoryId, category));
  if (!before) throw ServiceError.notFound('Category not found.');
  if (before.wasComingSoon && !category.comingSoon) dependencies.notificationService.categoryOpened(categoryId, category.name);
  return listCategories(dependencies);
}

async function deleteCategory(dependencies, categoryIdInput) {
  const categoryId = readPositiveInteger(categoryIdInput);
  const deleted = categoryId && await saveWithFriendlyErrors(() => deleteCategoryRow(dependencies.database, categoryId));
  if (!deleted) throw ServiceError.notFound('Category not found.');
  return listCategories(dependencies);
}

async function uploadCategoryImage(dependencies, categoryIdInput, imageBytes, contentType) {
  const { database, productImageStorage } = dependencies;
  if (!productImageStorage.isConfigured) {
    throw ServiceError.unavailable('Photo upload is not set up yet (SUPABASE_SECRET_KEY is missing).');
  }
  if (!Buffer.isBuffer(imageBytes) || !isRealImage(imageBytes, contentType)) {
    throw ServiceError.badRequest('Please choose a JPG, PNG or WebP photo (up to 3 MB).');
  }
  const categoryId = readPositiveInteger(categoryIdInput);
  if (!categoryId || !(await categoryExists(database, categoryId))) throw ServiceError.notFound('Category not found.');

  const imagePath = await productImageStorage.uploadCategoryImage(categoryId, imageBytes, contentType);
  await setCategoryImagePath(database, categoryId, imagePath);
  return listCategories(dependencies);
}

export function createCategoryService(dependencies) {
  return {
    listCategories: () => listCategories(dependencies),
    createCategory: (body) => createCategory(dependencies, body),
    updateCategory: (categoryIdInput, body) => updateCategory(dependencies, categoryIdInput, body),
    deleteCategory: (categoryIdInput) => deleteCategory(dependencies, categoryIdInput),
    uploadCategoryImage: (categoryIdInput, imageBytes, contentType) =>
      uploadCategoryImage(dependencies, categoryIdInput, imageBytes, contentType),
  };
}
