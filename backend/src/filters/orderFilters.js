import { createFilterBuilder } from './filterBuilder.js';

// Orders for one delivery date, or one customer's history.
export function buildAdminOrderFilter({ deliveryDate, customerId }) {
  return createFilterBuilder()
    .whereEquals('placed.delivery_date', deliveryDate)
    .whereEquals('placed.customer_id', customerId)
    .build();
}

// Order board: delivery dates fromDate..toDate (either may be missing), zone,
// slot time window and search. Cancelled orders only when asked for.
export function buildBoardOrderFilter({ fromDate, toDate, zoneId, startTime, endTime, searchText }, { includeCancelled = false } = {}) {
  const builder = createFilterBuilder()
    .whereCompared('placed.delivery_date', '>=', fromDate)
    .whereCompared('placed.delivery_date', '<=', toDate)
    .whereEquals('placed.zone_id', zoneId)
    .whereEquals("to_char(slot.start_time, 'HH24:MI')", startTime)
    .whereEquals("to_char(slot.end_time, 'HH24:MI')", endTime)
    .whereAnyContains(['placed.order_number::text', 'placed.customer_name', 'placed.customer_phone'], searchText);
  if (!includeCancelled) builder.where("placed.status <> 'cancelled'");
  return builder.build();
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
