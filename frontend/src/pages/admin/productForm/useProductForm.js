import { useState } from 'react';
import { callApi } from '../../../apiClient.js';

let nextRowKey = 1;

function emptyPackSize() {
  return { rowKey: nextRowKey++, id: null, label: '', maximumRetailPrice: '', price: '', stock: '0', lowStockLevel: '5', bestBefore: '', active: true };
}

function toPackSizeRow(packSize) {
  return {
    rowKey: nextRowKey++,
    id: packSize.id,
    label: packSize.label,
    maximumRetailPrice: String(packSize.maximumRetailPrice),
    price: String(packSize.price),
    stock: String(packSize.stock),
    lowStockLevel: String(packSize.lowStockLevel),
    bestBefore: packSize.bestBefore ?? '',
    active: packSize.active,
  };
}

export function initialProductFormValues(product) {
  return {
    categoryId: product ? String(product.categoryId) : '',
    name: product?.name ?? '',
    brand: product?.brand ?? '',
    manufacturer: product?.manufacturer ?? '',
    countryOfOrigin: product?.countryOfOrigin ?? 'India',
    description: product?.description ?? '',
    active: product?.active ?? true,
    packSizes: product ? product.packSizes.map(toPackSizeRow) : [emptyPackSize()],
  };
}

function toProductRequest(formValues) {
  return {
    ...formValues,
    categoryId: Number(formValues.categoryId) || null,
    packSizes: formValues.packSizes.map(({ rowKey, ...packSize }) => ({ ...packSize, bestBefore: packSize.bestBefore || null })),
  };
}

// Form state for adding or editing a product. onSaved(product) runs after saving.
export function useProductForm(product, onSaved) {
  const [formValues, setFormValues] = useState(() => initialProductFormValues(product));
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [saving, setSaving] = useState(false);

  const updateField = (fieldName, value) => setFormValues((previousValues) => ({ ...previousValues, [fieldName]: value }));
  const updatePackSizes = (changePackSizes) => setFormValues((previousValues) => (
    { ...previousValues, packSizes: changePackSizes(previousValues.packSizes) }));
  const updatePackSize = (rowKey, fieldName, value) => updatePackSizes((packSizes) => packSizes.map((packSize) => (
    packSize.rowKey === rowKey ? { ...packSize, [fieldName]: value } : packSize)));
  const addPackSize = () => updatePackSizes((packSizes) => [...packSizes, emptyPackSize()]);
  const removePackSize = (rowKey) => updatePackSizes((packSizes) => packSizes.filter((packSize) => packSize.rowKey !== rowKey));

  async function saveProduct(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const path = product ? `/api/admin/products/${product.id}` : '/api/admin/products';
      const result = await callApi(path, { method: product ? 'PUT' : 'POST', body: toProductRequest(formValues) });
      setFieldErrors({});
      setSubmitError(null);
      onSaved(result.product);
    } catch (error) {
      setFieldErrors(error.fieldErrors ?? {});
      setSubmitError(error.message);
    } finally {
      setSaving(false);
    }
  }
  return { formValues, fieldErrors, submitError, saving, updateField, updatePackSize, addPackSize, removePackSize, saveProduct };
}
