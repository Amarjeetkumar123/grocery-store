// Sales reports. A sale is a delivered order, counted on its delivery date.
// $1 and $2 are the first and last day of the report (Indian dates, both included).

const deliveredInRange = "placed.status = 'delivered' and placed.delivery_date between $1 and $2";

const summaryQuery = `
  select count(*) filter (where ${deliveredInRange}) as delivered_orders,
         coalesce(sum(placed.total) filter (where ${deliveredInRange}), 0) as sales,
         coalesce(sum(placed.total) filter (where ${deliveredInRange} and placed.payment_method = 'cash'), 0) as cash_sales,
         coalesce(sum(placed.total) filter (where ${deliveredInRange} and placed.payment_method = 'upi'), 0) as upi_sales,
         count(*) filter (where placed.status = 'cancelled' and placed.delivery_date between $1 and $2) as cancelled_orders
  from orders placed`;

const salesByDayQuery = `
  select placed.delivery_date, count(*) as orders, sum(placed.total) as sales
  from orders placed where ${deliveredInRange}
  group by placed.delivery_date order by placed.delivery_date`;

const salesByZoneQuery = `
  select zone.name, count(*) as orders, sum(placed.total) as sales
  from orders placed join zones zone on zone.id = placed.zone_id
  where ${deliveredInRange}
  group by zone.name order by sales desc`;

const topItemsQuery = `
  select item.product_name, item.pack_label, sum(item.quantity) as quantity, sum(item.quantity * item.unit_price) as sales
  from order_items item join orders placed on placed.id = item.order_id
  where ${deliveredInRange}
  group by item.product_name, item.pack_label order by quantity desc, sales desc limit 10`;

// "Notify me" taps on coming-soon categories, all time.
const notifyMeQuery = `
  select category.name, count(*) as requests
  from notify_me request join categories category on category.id = request.category_id
  group by category.name order by requests desc`;

export async function findSalesReport(executor, fromDate, toDate) {
  const range = [fromDate, toDate];
  const [summary, byDay, byZone, topItems, notifyMe] = await Promise.all([
    executor.query(summaryQuery, range), executor.query(salesByDayQuery, range), executor.query(salesByZoneQuery, range),
    executor.query(topItemsQuery, range), executor.query(notifyMeQuery),
  ]);
  const totals = summary.rows[0];
  return {
    deliveredOrders: totals.delivered_orders,
    sales: totals.sales,
    cashSales: totals.cash_sales,
    upiSales: totals.upi_sales,
    cancelledOrders: totals.cancelled_orders,
    byDay: byDay.rows.map((row) => ({ date: row.delivery_date, orders: row.orders, sales: row.sales })),
    byZone: byZone.rows.map((row) => ({ zoneName: row.name, orders: row.orders, sales: row.sales })),
    topItems: topItems.rows.map((row) => ({ productName: row.product_name, packLabel: row.pack_label, quantity: row.quantity, sales: row.sales })),
    notifyMe: notifyMe.rows.map((row) => ({ categoryName: row.name, requests: row.requests })),
  };
}
