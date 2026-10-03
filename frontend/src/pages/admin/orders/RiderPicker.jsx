import { callApi } from '../../../apiClient.js';

// Assigns one rider to one order, or to a whole group on the delivery list.
export function RiderPicker({ orderNumbers, rider, riders, save, onChanged, label = 'Rider' }) {
  async function chooseRider(riderIdText) {
    const body = { orderNumbers, riderId: riderIdText ? Number(riderIdText) : null };
    if (await save(() => callApi('/api/admin/orders/assign-rider', { method: 'POST', body }))) onChanged();
  }
  return (
    <label className="rider-picker">
      <span>{label}:</span>
      <select className="input input-small" value={rider?.id ?? ''} onChange={(event) => chooseRider(event.target.value)}>
        <option value="">{riders.length ? 'Choose' : 'Add riders in Staff'}</option>
        {riders.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
        {rider && !riders.some((member) => member.id === rider.id) && <option value={rider.id}>{rider.name}</option>}
      </select>
    </label>
  );
}
