import { findDailyCollections, findUnpaidOrders, insertCashHandover } from '../dbHelper/paymentDbHelper.js';
import { findSalesReport } from '../dbHelper/reportDbHelper.js';
import { readPositiveInteger } from '../validators/commonValidation.js';
import { readMoney, readOptionalDate } from '../validators/productValidation.js';
import { todayInIndia } from '../utils/indianDate.js';
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

// The owner's Cash & UPI check and Reports screens.
export function createMoneyService(dependencies) {
  return {
    getCashCheck: (query) => getCashCheck(dependencies, query),
    recordHandover: (owner, body) => recordHandover(dependencies, owner, body),
    getSalesReport: (query) => getSalesReport(dependencies, query),
  };
}
