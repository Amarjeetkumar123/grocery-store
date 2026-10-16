import { useState } from 'react';
import { Icon } from '../../Icon.jsx';
import { LoadingOrError } from '../../components/LoadingOrError.jsx';
import { AdminPageHeader } from './AdminLayout.jsx';
import { TablePager } from './TablePager.jsx';
import { BoardFilters, DateRangeFields } from './orders/BoardFilters.jsx';
import { dateRangeLabel, filterOrders, timeOptionsOf, useBoardFilters, useListOrders, zoneOptionsOf } from './orders/orderBoardData.js';

// Orders still to be packed.
const toPackStatuses = ['new', 'confirmed'];

// One line per pack size: how many to take off the shelf in total, and which
// orders they go into: orders: [{ orderNumber: 1004, quantity: 2 }].
function totalsByPackSize(orders) {
  const lines = new Map();
  for (const order of orders) {
    for (const item of order.items) {
      const line = lines.get(item.packSizeId) ?? { ...item, quantity: 0, orders: [] };
      const forOrder = { orderNumber: order.orderNumber, quantity: item.quantity };
      lines.set(item.packSizeId, { ...line, quantity: line.quantity + item.quantity, orders: [...line.orders, forOrder] });
    }
  }
  return [...lines.values()].sort((first, second) => first.productName.localeCompare(second.productName) || first.packLabel.localeCompare(second.packLabel));
}

function PickingRow({ line, onPage }) {
  return (
    <tr className={onPage ? undefined : 'off-page-row'}>
      <td className="print-only">☐</td>
      <td><strong>{line.productName}</strong></td>
      <td>{line.packLabel}</td>
      <td className="stock-count"><strong>{line.quantity}</strong></td>
      <td>
        <div className="badge-cell">
          {line.orders.map((order) => <span key={order.orderNumber} className="pill pill-gray">#{order.orderNumber} × {order.quantity}</span>)}
        </div>
      </td>
    </tr>
  );
}

// Every line is drawn so Print gets them all; lines off this page are hidden on screen.
function PickingTable({ lines }) {
  const [pager, setPager] = useState({ page: 1, pageSize: 25 });
  const pageCount = Math.max(1, Math.ceil(lines.length / pager.pageSize));
  const page = Math.min(pager.page, pageCount);
  const firstIndex = (page - 1) * pager.pageSize;
  const isOnPage = (index) => index >= firstIndex && index < firstIndex + pager.pageSize;
  return (
    <div className="table-box">
      <div className="table-scroll">
        <table className="admin-table picking-table">
          <thead><tr><th className="print-only">✓</th><th>Product</th><th>Pack size</th><th>Total to pick</th><th>Goes into order (× packs)</th></tr></thead>
          <tbody>{lines.map((line, index) => <PickingRow key={line.packSizeId} line={line} onPage={isOnPage(index)} />)}</tbody>
        </table>
      </div>
      <TablePager page={page} pageCount={pageCount} pageSize={pager.pageSize} total={lines.length}
        shownCount={lines.filter((line, index) => isOnPage(index)).length} onChange={(changes) => setPager({ ...pager, page, ...changes })} />
    </div>
  );
}

export function AdminPickingListPage() {
  const { filters, setFilter, setFilters } = useBoardFilters();
  const { orders, data, error, loading, reload } = useListOrders(filters, toPackStatuses);
  const toPack = filterOrders(orders, { ...filters, search: '' });
  const notConfirmed = toPack.filter((order) => order.status === 'new').length;
  return (
    <>
      <AdminPageHeader title={`Picking list · ${dateRangeLabel(filters)}`}>
        <button type="button" className="button button-compact button-outline" onClick={() => window.print()}><Icon name="layers" /> Print</button>
      </AdminPageHeader>
      <BoardFilters filters={filters} setFilter={setFilter} zoneOptions={zoneOptionsOf(orders)} timeOptions={timeOptionsOf(orders)} showSearch={false}>
        <DateRangeFields filters={filters} setFilter={setFilter} setFilters={setFilters} />
      </BoardFilters>
      <LoadingOrError loading={loading && !data} error={data ? null : error} onRetry={reload} />
      {data && (
        <>
          <p className="hint">
            {toPack.length} {toPack.length === 1 ? 'order' : 'orders'} to pack
            {notConfirmed > 0 && ` (${notConfirmed} not confirmed yet)`}. Take the total off the shelf once, then split it into each order's bag.
            Packed and cancelled orders are left out.
          </p>
          {toPack.length > 0 && <PickingTable lines={totalsByPackSize(toPack)} />}
        </>
      )}
    </>
  );
}
