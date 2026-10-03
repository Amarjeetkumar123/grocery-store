import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useApiData } from '../../../useApiData.js';
import { useAuthentication } from '../../../AuthenticationContext.jsx';
import { formatTimeRange, todayInIndia } from '../../../formatting.js';

const refreshEverySeconds = 20;

// Board filters live in the page address, so Picking list and Delivery
// list open with the same day, zone and time window.
export function useBoardFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = {
    date: searchParams.get('date') ?? todayInIndia(),
    zoneId: searchParams.get('zone') ?? '',
    time: searchParams.get('time') ?? '',
    search: searchParams.get('search') ?? '',
  };
  const setFilter = (name, value) => setSearchParams((previous) => {
    const next = new URLSearchParams(previous);
    if (value) next.set(name, value);
    else next.delete(name);
    return next;
  }, { replace: true });
  return { filters, setFilter, queryString: searchParams.toString() };
}

// All orders for the day, fetched again every 20 seconds.
export function useDayOrders(date) {
  const request = useApiData(`/api/admin/orders?date=${encodeURIComponent(date)}`);
  const { reload } = request;
  useEffect(() => {
    const timer = setInterval(reload, refreshEverySeconds * 1000);
    return () => clearInterval(timer);
  }, [reload]);
  return { ...request, orders: request.data?.orders ?? [] };
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

// "Capetown · Tower B-1204" or "42, Gali No. 3 · Near Shiv Mandir"
export function shortAddressOf({ address }) {
  if (address.zoneType === 'society') return `${address.towerName} · ${address.flatNumber}`;
  return `${address.houseNumber}, ${address.street}`;
}

export function itemCountOf(order) {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}
