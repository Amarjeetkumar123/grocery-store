import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { callApi } from '../../apiClient.js';
import { useApiData } from '../../useApiData.js';

// Today's deliveries for the signed-in rider, plus cash in hand and the store's UPI ID.
export function useRiderDay() {
  const request = useApiData('/api/rider/deliveries');
  return { ...request, orders: request.data?.orders ?? [] };
}

// Runs a door-step action (start / payment / delivered), then reloads or moves on.
export function useRiderAction(orderNumber, onDone) {
  const [state, setState] = useState({ busy: false, error: null });
  const run = useCallback(async (action, body = {}) => {
    setState({ busy: true, error: null });
    try {
      await callApi(`/api/rider/orders/${orderNumber}/${action}`, { method: 'POST', body });
      setState({ busy: false, error: null });
      await onDone();
    } catch (error) {
      setState({ busy: false, error: error.message });
    }
  }, [orderNumber, onDone]);
  return { ...state, run };
}

export function useBackToOrder(orderNumber) {
  const navigate = useNavigate();
  return useCallback(() => navigate(`/rider/orders/${orderNumber}`, { replace: true }), [navigate, orderNumber]);
}

// Society -> tower, local area -> street: the order a rider walks in.
const doorOf = ({ address }) => (address.zoneType === 'society' ? address.flatNumber : address.houseNumber);

export function groupByZoneAndBlock(orders) {
  const zones = new Map();
  const byDoorNumber = [...orders].sort((first, second) => doorOf(first).localeCompare(doorOf(second), 'en', { numeric: true }));
  for (const order of byDoorNumber) {
    const block = order.address.zoneType === 'society' ? order.address.towerName : order.address.street;
    const zone = zones.get(order.zoneId) ?? { zoneName: order.address.zoneName, zoneType: order.address.zoneType, blocks: new Map() };
    zone.blocks.set(block, [...(zone.blocks.get(block) ?? []), order]);
    zones.set(order.zoneId, zone);
  }
  const byName = (first, second) => first.name.localeCompare(second.name, 'en', { numeric: true });
  return [...zones.values()].map((zone) => ({
    ...zone,
    blocks: [...zone.blocks].map(([name, blockOrders]) => ({ name, orders: blockOrders })).sort(byName),
  }));
}
