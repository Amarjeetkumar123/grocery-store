import { findDailyCollections, findUnpaidOrders, insertCashHandover } from '../dbHelper/paymentDbHelper.js';
import { findSalesReport } from '../dbHelper/reportDbHelper.js';
import { findSlotLoadForDay } from '../dbHelper/slotDbHelper.js';
import { findStockItems } from '../dbHelper/packSizeDbHelper.js';
import { buildStockFilter } from '../filters/stockFilters.js';
import { readPositiveInteger } from '../validators/commonValidation.js';
import { readMoney, readOptionalDate } from '../validators/productValidation.js';
import { addDays, todayInIndia } from '../utils/indianDate.js';
import { ServiceError } from './serviceError.js';

const longestReportDays = 366;

const readDateOrToday = (value) => readOptionalDate(value).date ?? todayInIndia();

// End-of-day check: what each person collected, cash still with them, unpaid orders.
async function getCashCheck({ database }, query) {
  const date = readDateOrToday(query.date);
  const [collections, unpaidOrders] = await Promise.all([findDailyCollections(database, date), findUnpaidOrders(database, date)]);
  return { date, collections, unpaidOrders };
}

// body: { staffId, amount, date }. Never more than the cash they hold.
async function recordHandover({ database }, owner, body) {
  const staffId = readPositiveInteger(body.staffId);
  const amount = readMoney(body.amount);
  if (!staffId || !amount) throw ServiceError.badRequest('Enter the amount handed over.');
  const person = (await findDailyCollections(database, todayInIndia())).find((collection) => collection.staffId === staffId);
  if (!person || amount > person.cashInHand) throw ServiceError.badRequest('That is more than the cash they hold.');
  await insertCashHandover(database, { staffId, date: readDateOrToday(body.date), amount, receivedBy: owner.id });
  return { staffId, amount };
}

function daysBetween(fromDate, toDate) {
  return (new Date(`${toDate}T00:00:00Z`) - new Date(`${fromDate}T00:00:00Z`)) / 86400000;
}

// query: { from, to } as "2026-10-01"; both default to today.
async function getSalesReport({ database }, query) {
  const fromDate = readDateOrToday(query.from);
  const toDate = readDateOrToday(query.to);
  const days = daysBetween(fromDate, toDate);
  if (days < 0 || days >= longestReportDays) throw ServiceError.badRequest('Choose a range of up to one year, start before end.');
  return { fromDate, toDate, report: await findSalesReport(database, fromDate, toDate) };
}

const shownStockAlerts = 6;

// The owner's first screen: tomorrow's slots, sales for the last 7 days
// (today included), cash riders still hold, and stock that needs action.
async function getDashboard({ database }) {
  const today = todayInIndia();
  const tomorrow = addDays(today, 1);
  const [slots, salesWeek, collections, stockItems] = await Promise.all([
    findSlotLoadForDay(database, tomorrow),
    findSalesReport(database, addDays(today, -6), today),
    findDailyCollections(database, today),
    findStockItems(database, buildStockFilter({})),
  ]);
  const needsAction = stockItems.filter((item) => item.outOfStock || item.lowStock || item.expiringSoon);
  return {
    today,
    tomorrow,
    slots,
    salesWeek,
    cashWithRiders: collections.reduce((sum, person) => sum + person.cashInHand, 0),
    stock: {
      outOfStock: stockItems.filter((item) => item.outOfStock).length,
      lowStock: stockItems.filter((item) => item.lowStock).length,
      alerts: needsAction.slice(0, shownStockAlerts),
    },
  };
}

// The owner's Dashboard, Cash & UPI check and Reports screens.
export function createMoneyService(dependencies) {
  return {
    getCashCheck: (query) => getCashCheck(dependencies, query),
    recordHandover: (owner, body) => recordHandover(dependencies, owner, body),
    getSalesReport: (query) => getSalesReport(dependencies, query),
    getDashboard: () => getDashboard(dependencies),
  };
}
