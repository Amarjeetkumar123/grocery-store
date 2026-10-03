import { createFilterBuilder } from './filterBuilder.js';

// Orders for one delivery date, or one customer's history.
export function buildAdminOrderFilter({ deliveryDate, customerId }) {
  return createFilterBuilder()
    .whereEquals('placed.delivery_date', deliveryDate)
    .whereEquals('placed.customer_id', customerId)
    .build();
}

// Customers screen search: name, phone, email or address.
export function buildCustomerFilter({ searchText }) {
  return createFilterBuilder()
    .whereAnyContains(['customer.name', 'customer.phone', 'customer.email', 'customer.flat_number',
      'customer.house_number', 'customer.street', 'zone.name'], searchText)
    .build();
}
