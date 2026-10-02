import { findAllCategories } from '../dbHelper/categoryDbHelper.js';
import { findProducts } from '../dbHelper/productDbHelper.js';
import { buildProductFilter } from '../filters/productFilters.js';
import { readPositiveInteger } from '../validators/commonValidation.js';
import { ServiceError } from './serviceError.js';

const minimumSearchLength = 2;

// Customers see whether a pack is in stock, not the exact count.
function toCustomerProduct(product, productImageStorage) {
  const { active, imagePath, ...visibleProduct } = product;
  return {
    ...visibleProduct,
    imageUrl: productImageStorage.publicUrlFor(imagePath),
    packSizes: product.packSizes.map(({ stock, lowStockLevel, active: packSizeActive, ...packSize }) => ({
      ...packSize,
      inStock: stock > 0,
      fewLeft: stock > 0 && stock <= lowStockLevel,
    })),
  };
}

async function listCategories({ database }) {
  return { categories: await findAllCategories(database) };
}

// query: { categoryId } for one category, or { search } to search everything.
async function listProducts({ database, productImageStorage }, query) {
  const categoryId = readPositiveInteger(query.categoryId);
  const searchText = typeof query.search === 'string' ? query.search.trim() : '';
  if (!categoryId && searchText.length < minimumSearchLength) {
    throw ServiceError.badRequest(`Choose a category or type at least ${minimumSearchLength} letters to search.`);
  }
  const products = await findProducts(database, buildProductFilter({ categoryId, searchText }));
  return { products: products.map((product) => toCustomerProduct(product, productImageStorage)) };
}

async function getProduct({ database, productImageStorage }, productIdInput) {
  const productId = readPositiveInteger(productIdInput);
  const [product] = productId ? await findProducts(database, buildProductFilter({ productId })) : [];
  if (!product) throw ServiceError.notFound('This product is not available.');
  return { product: toCustomerProduct(product, productImageStorage) };
}

export function createCatalogueService(dependencies) {
  return {
    listCategories: () => listCategories(dependencies),
    listProducts: (query) => listProducts(dependencies, query),
    getProduct: (productIdInput) => getProduct(dependencies, productIdInput),
  };
}
