import { withTransaction } from '../dbHelper/databaseConnection.js';
import { findCategoryIdsByLowerCaseName } from '../dbHelper/categoryDbHelper.js';
import {
  findProductIdByNameAndBrand, insertProduct, updateProductDetailsIfGiven,
} from '../dbHelper/productDbHelper.js';
import { upsertImportedPackSize } from '../dbHelper/packSizeDbHelper.js';
import { parseCsv } from '../utils/csvParser.js';
import { validatePackSizeInput } from '../validators/productValidation.js';
import { readOptionalText, readRequiredText } from '../validators/commonValidation.js';
import { ServiceError } from './serviceError.js';

// Bulk upload of products from a spreadsheet saved as CSV. Every row is
// checked first; if any row is wrong, nothing is saved.

const maximumRows = 2000;

// Spreadsheet headers (lower-case, letters only) -> field names.
const fieldsByHeader = {
  category: 'categoryName',
  productname: 'productName',
  brand: 'brand',
  packsize: 'label',
  maximumretailpricemrp: 'maximumRetailPrice',
  mrp: 'maximumRetailPrice',
  price: 'price',
  sellingprice: 'price',
  stock: 'stock',
  lowstockalert: 'lowStockLevel',
  bestbeforeyyyymmdd: 'bestBefore',
  bestbefore: 'bestBefore',
  manufacturer: 'manufacturer',
  description: 'description',
};
const requiredFields = ['categoryName', 'productName', 'label', 'maximumRetailPrice', 'price', 'stock'];

function readRecords(csvText) {
  const [headerRow, ...dataRows] = parseCsv(csvText);
  if (!headerRow) return { problems: [{ rowNumber: 1, message: 'The file is empty.' }] };
  const fieldNames = headerRow.map((header) => fieldsByHeader[header.toLowerCase().replace(/[^a-z]/g, '')]);
  const missingFields = requiredFields.filter((fieldName) => !fieldNames.includes(fieldName));
  if (missingFields.length > 0) {
    return { problems: [{ rowNumber: 1, message: `Missing columns: ${missingFields.join(', ')}. Please use the template.` }] };
  }
  if (dataRows.length > maximumRows) {
    return { problems: [{ rowNumber: 1, message: `Up to ${maximumRows} rows per file. Split the file and upload again.` }] };
  }
  const records = dataRows.map((cells, index) => {
    const values = {};
    fieldNames.forEach((fieldName, column) => { if (fieldName) values[fieldName] = (cells[column] ?? '').trim(); });
    return { rowNumber: index + 2, values };
  });
  return { records, problems: [] };
}

// One spreadsheet row -> one pack size of one product.
function readImportRow(record, categoryIdsByName) {
  const fieldErrors = {};
  const { values } = record;
  const categoryId = categoryIdsByName.get(values.categoryName.toLowerCase());
  if (!categoryId) fieldErrors.category = `No category called "${values.categoryName}".`;
  const row = {
    rowNumber: record.rowNumber,
    categoryId,
    productName: readRequiredText(values, 'productName', 'Product name', 120, fieldErrors),
    brand: readOptionalText(values, 'brand', 'Brand', 80, fieldErrors),
    manufacturer: readOptionalText(values, 'manufacturer', 'Manufacturer', 120, fieldErrors),
    description: readOptionalText(values, 'description', 'Description', 1000, fieldErrors),
    packSize: validatePackSizeInput({ ...values, lowStockLevel: values.lowStockLevel || undefined }, '', fieldErrors),
  };
  const problems = Object.values(fieldErrors).map((message) => ({ rowNumber: record.rowNumber, message }));
  return { row, problems };
}

// Rows with the same category, name and brand are pack sizes of one product.
function groupRowsByProduct(rows) {
  const products = new Map();
  const problems = [];
  for (const row of rows) {
    const productKey = [row.categoryId, row.productName.toLowerCase(), (row.brand ?? '').toLowerCase()].join('|');
    const product = products.get(productKey) ?? { ...row, packSizes: [] };
    if (product.packSizes.some((packSize) => packSize.label.toLowerCase() === row.packSize.label.toLowerCase())) {
      problems.push({ rowNumber: row.rowNumber, message: `Pack size "${row.packSize.label}" appears twice for this product.` });
    }
    product.manufacturer ??= row.manufacturer;
    product.description ??= row.description;
    product.packSizes.push(row.packSize);
    products.set(productKey, product);
  }
  return { products: [...products.values()], problems };
}

async function saveImportedProduct(client, product, summary) {
  let productId = await findProductIdByNameAndBrand(client, product.categoryId, product.productName, product.brand);
  if (productId) {
    await updateProductDetailsIfGiven(client, productId, product.manufacturer, product.description);
  } else {
    productId = await insertProduct(client, {
      categoryId: product.categoryId, name: product.productName, brand: product.brand,
      description: product.description, manufacturer: product.manufacturer, countryOfOrigin: 'India', active: true,
    });
    summary.productsCreated += 1;
  }
  for (const packSize of product.packSizes) {
    if (await upsertImportedPackSize(client, productId, packSize)) summary.packSizesCreated += 1;
    else summary.packSizesUpdated += 1;
  }
}

function throwIfProblems(problems) {
  if (problems.length > 0) {
    throw ServiceError.badRequest('Nothing was saved. Please fix these rows and upload again.', { problems });
  }
}

function readRecordsOrThrow(csvText) {
  if (typeof csvText !== 'string' || csvText.trim() === '') throw ServiceError.badRequest('Please choose a CSV file.');
  try {
    return readRecords(csvText);
  } catch (error) {
    throw ServiceError.badRequest('Nothing was saved. Please fix the file and upload again.', {
      problems: [{ rowNumber: null, message: error.message }],
    });
  }
}

// Returns { summary: { productsCreated, packSizesCreated, packSizesUpdated } }.
async function importProductsFromCsv({ database }, csvText) {
  const reading = readRecordsOrThrow(csvText);
  throwIfProblems(reading.problems);

  const categoryIdsByName = await findCategoryIdsByLowerCaseName(database);
  const checkedRows = reading.records.map((record) => readImportRow(record, categoryIdsByName));
  throwIfProblems(checkedRows.flatMap((checkedRow) => checkedRow.problems));

  const grouping = groupRowsByProduct(checkedRows.map((checkedRow) => checkedRow.row));
  throwIfProblems(grouping.problems);

  const summary = await withTransaction(database, async (client) => {
    const counts = { productsCreated: 0, packSizesCreated: 0, packSizesUpdated: 0 };
    for (const product of grouping.products) await saveImportedProduct(client, product, counts);
    return counts;
  });
  return { summary };
}

export function createProductImportService(dependencies) {
  return {
    importProductsFromCsv: (csvText) => importProductsFromCsv(dependencies, csvText),
  };
}
