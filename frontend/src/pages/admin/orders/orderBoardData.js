import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useApiData } from '../../../useApiData.js';
import { useAuthentication } from '../../../AuthenticationContext.jsx';
import { formatDeliveryDay, formatTimeRange } from '../../../formatting.js';

const refreshEverySeconds = 20;

// Filters live in the page address, shared by the board, Picking list and
// Delivery list: a delivery date range (all dates by default), zone and time window.
export function useBoardFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = {
    from: searchParams.get('from') ?? '',
    to: searchParams.get('to') ?? '',
    zoneId: searchParams.get('zone') ?? '',
    time: searchParams.get('time') ?? '',
    search: searchParams.get('search') ?? '',
    page: Number(searchParams.get('page')) || 1,
  };
  // changes: { from: "2026-10-04", to: "" }. Any change but the page goes back to page 1.
  const setFilters = (changes) => setSearchParams((previous) => {
    const next = new URLSearchParams(previous);
    if (!('page' in changes)) next.delete('page');
    for (const [name, value] of Object.entries(changes)) {
      if (value) next.set(name, value);
      else next.delete(name);
    }
    return next;
  }, { replace: true });
  const setFilter = (name, value) => setFilters({ [name]: value });
  return { filters, setFilter, setFilters };
}

function useRefreshed(path) {
  const request = useApiData(path);
  const { reload } = request;
  useEffect(() => {
    const timer = setInterval(reload, refreshEverySeconds * 1000);
    return () => clearInterval(timer);
  }, [reload]);
  return request;
}

// Orders in the date range with one of the statuses, fetched again every 20 seconds.
export function useListOrders(filters, statuses) {
  const query = new URLSearchParams({ from: filters.from, to: filters.to, status: statuses.join(',') });
  const request = useRefreshed(`/api/admin/orders?${query}`);
  return { ...request, orders: request.data?.orders ?? [] };
}

// One page of the board, filtered on the server, fetched again every 20 seconds.
export function useBoardOrders(filters) {
  const query = new URLSearchParams({ from: filters.from, to: filters.to, zone: filters.zoneId, time: filters.time, search: filters.search, page: filters.page });
  const request = useRefreshed(`/api/admin/orders/board?${query}`);
  return { ...request, orders: request.data?.orders ?? [] };
}

// Picking list and Delivery list open on the board's dates and zone/time.
export function listQueryOf(filters) {
  const query = new URLSearchParams();
  if (filters.from) query.set('from', filters.from);
  if (filters.to) query.set('to', filters.to);
  if (filters.zoneId) query.set('zone', filters.zoneId);
  if (filters.time) query.set('time', filters.time);
  return query.toString();
}

export function dateRangeLabel({ from, to }) {
  if (!from && !to) return 'All dates';
  if (from === to) return formatDeliveryDay(from);
  if (!to) return `${formatDeliveryDay(from)} onwards`;
  if (!from) return `Up to ${formatDeliveryDay(to)}`;
  return `${formatDeliveryDay(from)} – ${formatDeliveryDay(to)}`;
}

// Active riders for the owner's rider pickers (packers don't assign riders).
export function useRiders() {
  const { account } = useAuthentication();
  const { data } = useApiData(account.role === 'owner' ? '/api/admin/staff' : null);
  return (data?.staff ?? []).filter((member) => member.role === 'rider' && member.active);
}

export const timeWindowOf = (order) => `${order.slot.startTime}-${order.slot.endTime}`;

export function filterOrders(orders, { zoneId, time, search }) {
  const searchText = search.trim().toLowerCase();
  return orders.filter((order) => (!zoneId || String(order.zoneId) === zoneId)
    && (!time || timeWindowOf(order) === time)
    && (!searchText || `#${order.orderNumber} ${order.address.customerName} ${order.address.customerPhone}`.toLowerCase().includes(searchText)));
}

function uniqueOptions(orders, valueOf, labelOf) {
  const options = new Map();
  for (const order of orders) options.set(valueOf(order), labelOf(order));
  return [...options].map(([value, label]) => ({ value, label })).sort((first, second) => first.label.localeCompare(second.label));
}

export const zoneOptionsOf = (orders) => uniqueOptions(orders, (order) => String(order.zoneId), (order) => order.address.zoneName);
export const timeOptionsOf = (orders) => uniqueOptions(orders, timeWindowOf, (order) => formatTimeRange(order.slot.startTime, order.slot.endTime));

// "Tower B · Flat 1204" or "42, Gali No. 3"
export function shortAddressOf({ address }) {
  if (address.zoneType === 'society') return `${address.towerName} · Flat ${address.flatNumber}`;
  return `${address.houseNumber}, ${address.street}`;
}

export function itemCountOf(order) {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}
