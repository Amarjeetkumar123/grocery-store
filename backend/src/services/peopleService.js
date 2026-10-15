import { uniqueViolationErrorCode } from '../dbHelper/databaseConnection.js';
import { countCustomersByStatus, findCustomersForAdmin, updateCustomerFlags } from '../dbHelper/customerDbHelper.js';
import { findAllStaff, insertStaffMember, updateStaffMember } from '../dbHelper/staffDbHelper.js';
import { buildCustomerFilter } from '../filters/orderFilters.js';
import { readPositiveInteger } from '../validators/commonValidation.js';
import { readPage } from '../validators/pagingValidation.js';
import { validateStaffInput } from '../validators/staffValidation.js';
import { ServiceError, throwIfFieldErrors } from './serviceError.js';

async function addStaffMember({ database }, body) {
  const { member, fieldErrors } = validateStaffInput(body, true);
  throwIfFieldErrors(fieldErrors);
  try {
    return { staffId: await insertStaffMember(database, member) };
  } catch (error) {
    if (error.code === uniqueViolationErrorCode) throw ServiceError.invalidFields({ email: 'This email is already on the team.' });
    throw error;
  }
}

// The owner cannot lock themselves out by mistake.
async function saveStaffMember({ database }, currentStaffMember, staffIdInput, body) {
  const staffId = readPositiveInteger(staffIdInput);
  const { member, fieldErrors } = validateStaffInput(body, false);
  throwIfFieldErrors(fieldErrors);
  if (staffId === currentStaffMember.id && (member.role !== 'owner' || !member.active)) {
    throw ServiceError.badRequest('You cannot remove your own owner access.');
  }
  if (!staffId || !(await updateStaffMember(database, staffId, member))) throw ServiceError.notFound('Team member not found.');
  return { staffId };
}

const customerStatuses = ['all', 'unconfirmed', 'blocked'];

// query: { search, zoneId, status, page, pageSize }. counts are per status, for the filter tabs.
async function listCustomers({ database }, query) {
  const status = customerStatuses.includes(query.status) ? query.status : 'all';
  const filterInput = { searchText: query.search, zoneId: readPositiveInteger(query.zoneId) };
  const counts = await countCustomersByStatus(database, buildCustomerFilter(filterInput));
  const page = readPage(query, counts[status]);
  const customers = await findCustomersForAdmin(database, buildCustomerFilter({ ...filterInput, status }), page);
  return { customers, counts, total: counts[status], page: page.page, pageSize: page.pageSize, pageCount: page.pageCount };
}

// body: { phoneConfirmed?: true/false, blocked?: true/false }
async function saveCustomerFlags({ database }, customerIdInput, body) {
  const customerId = readPositiveInteger(customerIdInput);
  const readFlag = (value) => (typeof value === 'boolean' ? value : null);
  const flags = { phoneConfirmed: readFlag(body.phoneConfirmed), blocked: readFlag(body.blocked) };
  if (flags.phoneConfirmed === null && flags.blocked === null) throw ServiceError.badRequest('Nothing to change.');
  if (!customerId || !(await updateCustomerFlags(database, customerId, flags))) throw ServiceError.notFound('Customer not found.');
  return { customerId };
}

// The owner's Staff and Customers screens.
export function createPeopleService(dependencies) {
  return {
    listStaff: async () => ({ staff: await findAllStaff(dependencies.database) }),
    addStaffMember: (body) => addStaffMember(dependencies, body),
    saveStaffMember: (currentStaffMember, staffIdInput, body) => saveStaffMember(dependencies, currentStaffMember, staffIdInput, body),
    listCustomers: (query) => listCustomers(dependencies, query),
    saveCustomerFlags: (customerIdInput, body) => saveCustomerFlags(dependencies, customerIdInput, body),
  };
}
