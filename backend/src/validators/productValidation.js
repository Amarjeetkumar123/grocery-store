import { readOptionalText, readPositiveInteger, readRequiredText } from './commonValidation.js';

const maximumPackSizesPerProduct = 10;
const largestAllowedAmount = 1000000;
const largestAllowedStock = 100000;

// Accepts 899, "899", "₹1,050.50". Returns rupees rounded to paise, or null.
export function readMoney(value) {
  const number = typeof value === 'string' ? Number(value.replace(/[₹,\s]/g, '')) : value;
  if (typeof number !== 'number' || !Number.isFinite(number) || number <= 0 || number > largestAllowedAmount) return null;
  return Math.round(number * 100) / 100;
}

// Accepts 0, 12, "12". Returns the whole number, or null.
export function readWholeNumber(value, largestAllowed = largestAllowedStock) {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return Number.isSafeInteger(number) && number >= 0 && number <= largestAllowed ? number : null;
}

// Accepts "2027-03-31" or empty. Returns { date } with date null when empty, or { invalid: true }.
export function readOptionalDate(value) {
  if (value === undefined || value === null || value === '') return { date: null };
  const text = String(value).trim();
  const isRealDate = /^\d{4}-\d{2}-\d{2}$/.test(text)
    && new Date(`${text}T00:00:00Z`).toISOString().startsWith(text);
  return isRealDate ? { date: text } : { invalid: true };
}

function readBoolean(value, defaultValue) {
  return typeof value === 'boolean' ? value : defaultValue;
}

// One pack size row. errorPrefix is e.g. "packSizes.0." for form errors.
export function validatePackSizeInput(input, errorPrefix, fieldErrors) {
  const packSize = {
    id: input.id === undefined || input.id === null ? null : readPositiveInteger(input.id),
    label: readRequiredText(input, 'label', 'Pack size', 30, fieldErrors, `${errorPrefix}label`),
    maximumRetailPrice: readMoney(input.maximumRetailPrice),
    price: readMoney(input.price),
    stock: readWholeNumber(input.stock ?? 0),
    lowStockLevel: readWholeNumber(input.lowStockLevel ?? 5),
    bestBefore: null,
    active: readBoolean(input.active, true),
  };
  if (!packSize.maximumRetailPrice) fieldErrors[`${errorPrefix}maximumRetailPrice`] = 'Enter the MRP in rupees.';
  if (!packSize.price) fieldErrors[`${errorPrefix}price`] = 'Enter the selling price in rupees.';
  else if (packSize.maximumRetailPrice && packSize.price > packSize.maximumRetailPrice) {
    fieldErrors[`${errorPrefix}price`] = 'Selling price cannot be more than the MRP.';
  }
  if (packSize.stock === null) fieldErrors[`${errorPrefix}stock`] = 'Stock must be a whole number (0 or more).';
  if (packSize.lowStockLevel === null) fieldErrors[`${errorPrefix}lowStockLevel`] = 'Must be a whole number (0 or more).';
  const bestBefore = readOptionalDate(input.bestBefore);
  if (bestBefore.invalid) fieldErrors[`${errorPrefix}bestBefore`] = 'Use a real date like 2027-03-31.';
  else packSize.bestBefore = bestBefore.date;
  return packSize;
}

function validatePackSizeList(inputList, fieldErrors) {
  if (!Array.isArray(inputList) || inputList.length === 0 || inputList.length > maximumPackSizesPerProduct) {
    fieldErrors.packSizes = `Add between 1 and ${maximumPackSizesPerProduct} pack sizes.`;
    return [];
  }
  const packSizes = inputList.map((input, index) =>
    validatePackSizeInput(input ?? {}, `packSizes.${index}.`, fieldErrors));
  const seenLabels = new Set();
  packSizes.forEach((packSize, index) => {
    const labelKey = packSize.label?.toLowerCase();
    if (labelKey && seenLabels.has(labelKey)) fieldErrors[`packSizes.${index}.label`] = 'This pack size is listed twice.';
    seenLabels.add(labelKey);
  });
  return packSizes;
}

// The add / edit product form. Returns { product, packSizes, fieldErrors }.
export function validateProductInput(body) {
  const fieldErrors = {};
  const product = {
    categoryId: readPositiveInteger(body.categoryId),
    name: readRequiredText(body, 'name', 'Product name', 120, fieldErrors),
    brand: readOptionalText(body, 'brand', 'Brand', 80, fieldErrors),
    description: readOptionalText(body, 'description', 'Description', 1000, fieldErrors),
    manufacturer: readOptionalText(body, 'manufacturer', 'Manufacturer', 120, fieldErrors),
    countryOfOrigin: readOptionalText(body, 'countryOfOrigin', 'Country of origin', 60, fieldErrors) ?? 'India',
    active: readBoolean(body.active, true),
  };
  if (!product.categoryId) fieldErrors.categoryId = 'Please choose a category.';
  const packSizes = validatePackSizeList(body.packSizes, fieldErrors);
  return { product, packSizes, fieldErrors };
}
