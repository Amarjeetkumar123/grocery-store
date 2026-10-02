import { adjustPackSizeStock, findStockItems, packSizeExists } from '../dbHelper/packSizeDbHelper.js';
import { buildStockFilter, stockStatuses } from '../filters/stockFilters.js';
import { readPositiveInteger } from '../validators/commonValidation.js';
import { ServiceError } from './serviceError.js';

const largestStockChange = 10000;

// query: { status: all | out | low | expiring, categoryId, search }
async function listStock({ database }, query) {
  const status = stockStatuses.includes(query.status) ? query.status : 'all';
  const stockItems = await findStockItems(database, buildStockFilter({
    status,
    categoryId: readPositiveInteger(query.categoryId),
    searchText: query.search,
  }));
  return { stockItems };
}

// body: { quantityChange: 12 } adds stock, { quantityChange: -2 } removes it.
async function adjustStock({ database }, packSizeIdInput, body) {
  const packSizeId = readPositiveInteger(packSizeIdInput);
  const quantityChange = body.quantityChange;
  if (!Number.isSafeInteger(quantityChange) || quantityChange === 0 || Math.abs(quantityChange) > largestStockChange) {
    throw ServiceError.badRequest(`Enter a whole number between -${largestStockChange} and ${largestStockChange}.`);
  }
  if (!packSizeId) throw ServiceError.notFound('Item not found.');

  const newStock = await adjustPackSizeStock(database, packSizeId, quantityChange);
  if (newStock !== null) return { packSizeId, stock: newStock };
  if (!(await packSizeExists(database, packSizeId))) throw ServiceError.notFound('Item not found.');
  throw ServiceError.badRequest('Stock cannot go below 0.');
}

export function createStockService(dependencies) {
  return {
    listStock: (query) => listStock(dependencies, query),
    adjustStock: (packSizeIdInput, body) => adjustStock(dependencies, packSizeIdInput, body),
  };
}
