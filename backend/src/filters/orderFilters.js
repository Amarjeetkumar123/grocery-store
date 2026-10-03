import { createFilterBuilder } from './filterBuilder.js';

// Orders for one delivery date, or one customer's history.
export function buildAdminOrderFilter({ deliveryDate, customerId }) {
  return createFilterBuilder()
    .whereEquals('placed.delivery_date', deliveryDate)
    .whereEquals('placed.customer_id', customerId)
    .build();
}

// One rider's deliveries for a day, cancelled ones left out.
export function buildRiderOrderFilter({ riderId, deliveryDate }) {
  return createFilterBuilder()
    .whereEquals('placed.rider_id', riderId)
    .whereEquals('placed.delivery_date', deliveryDate)
    .where("placed.status <> 'cancelled'")
    .build();
}

// Customers screen search: name, phone, email or address.
export function buildCustomerFilter({ searchText }) {
  return createFilterBuilder()
    .whereAnyContains(['customer.name', 'customer.phone', 'customer.email', 'customer.flat_number',
      'customer.house_number', 'customer.street', 'zone.name'], searchText)
    .build();
}
