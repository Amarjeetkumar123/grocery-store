import { useState } from 'react';
import { callApi } from '../../apiClient.js';
import { useApiData } from '../../useApiData.js';
import { useSaveRequest } from '../../useSaveRequest.js';
import { formatDeliveryDay, formatRupees, todayInIndia } from '../../formatting.js';
import { LoadingOrError } from '../../components/LoadingOrError.jsx';
import { StatusPill } from '../orders/OrderParts.jsx';
import { AdminPageHeader } from './AdminLayout.jsx';

const sumOf = (rows, field) => rows.reduce((sum, row) => sum + row[field], 0);

// "Handed over": records the cash the owner received from this person.
function HandOverButton({ person, date, onSaved }) {
  const { saving, error, save } = useSaveRequest();
  async function handOver() {
    const answer = window.prompt(`Cash received from ${person.name} (₹)`, String(person.cashInHand));
    if (!answer) return;
    if (await save(() => callApi('/api/admin/cash-handovers', { method: 'POST', body: { staffId: person.staffId, amount: answer, date } }))) onSaved();
  }
  if (person.cashInHand <= 0) return <span className="pill pill-green">All handed over</span>;
  return (
    <>
      <button type="button" className="button button-compact" disabled={saving} onClick={handOver}>Handed over</button>
      {error && <p className="field-error" role="alert">{error}</p>}
    </>
  );
}

function CollectionsTable({ collections, date, onSaved }) {
  return (
    <div className="table-box">
      <table className="admin-table">
        <thead><tr><th>Collected by</th><th>Payments</th><th>Cash</th><th>UPI</th><th>Cash still with them</th><th /></tr></thead>
        <tbody>
          {collections.map((person) => (
            <tr key={person.staffId}>
              <td><strong>{person.name}</strong> <span className="hint">· {person.role}</span></td>
              <td>{person.paymentsToday}</td>
              <td>{formatRupees(person.cashToday)}</td>
              <td>{formatRupees(person.upiToday)}</td>
              <td className="stock-count"><strong>{formatRupees(person.cashInHand)}</strong></td>
              <td><HandOverButton person={person} date={date} onSaved={onSaved} /></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr><th>Total</th><th>{sumOf(collections, 'paymentsToday')}</th><th>{formatRupees(sumOf(collections, 'cashToday'))}</th>
            <th>{formatRupees(sumOf(collections, 'upiToday'))}</th><th>{formatRupees(sumOf(collections, 'cashInHand'))}</th><th /></tr>
        </tfoot>
      </table>
    </div>
  );
}

// UPI goes straight to the bank: check the total against the store's UPI app.
export function AdminCashCheckPage() {
  const [date, setDate] = useState(todayInIndia());
  const { data, error, loading, reload } = useApiData(`/api/admin/cash-check?date=${date}`);
  return (
    <>
      <AdminPageHeader title={`Cash & UPI check · ${formatDeliveryDay(date)}`}>
        <input type="date" className="input input-small" value={date} onChange={(event) => setDate(event.target.value || todayInIndia())} aria-label="Day" />
      </AdminPageHeader>
      <LoadingOrError loading={loading && !data} error={error} onRetry={reload} />
      {data && (
        <>
          <CollectionsTable collections={data.collections} date={date} onSaved={reload} />
          <p className="hint">Match the UPI total with the payments shown in your UPI business app.</p>
          <section className="card">
            <h2>Not paid yet · {data.unpaidOrders.length}</h2>
            {data.unpaidOrders.length === 0 && <p className="hint">Every order for this day is paid or cancelled.</p>}
            <ul className="order-history">
              {data.unpaidOrders.map((order) => (
                <li key={order.orderNumber}>
                  <strong>#{order.orderNumber}</strong> · {order.customerName} · {formatRupees(order.total)} <StatusPill status={order.status} />
                  {order.riderName && <span className="hint"> · {order.riderName}</span>}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </>
  );
}
