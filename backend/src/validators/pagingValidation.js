import { readPositiveInteger } from './commonValidation.js';

const pageSizes = [10, 25, 50];
const defaultPageSize = 25;

// One page of a long admin list. query: { page, pageSize } (10, 25 or 50; 25 otherwise).
// A page past the end becomes the last page. Returns { page, pageSize, pageCount, limit, offset }.
export function readPage(query, total) {
  const pageSize = pageSizes.includes(Number(query.pageSize)) ? Number(query.pageSize) : defaultPageSize;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(readPositiveInteger(query.page) ?? 1, pageCount);
  return { page, pageSize, pageCount, limit: pageSize, offset: (page - 1) * pageSize };
}
