import { findCustomerWithProfileByUserId } from '../dbHelper/customerDbHelper.js';
import { productExists } from '../dbHelper/productDbHelper.js';
import {
  countReviewsForAdmin, findCustomerReview, findDeliveredPurchase, findProductReviews, findReviewSummary,
  findReviewsForAdmin, findReviewTotals, setReviewHidden, upsertReview,
} from '../dbHelper/reviewDbHelper.js';
import { buildAdminReviewFilter, buildProductReviewFilter } from '../filters/reviewFilters.js';
import { readPositiveInteger } from '../validators/commonValidation.js';
import { readPage } from '../validators/pagingValidation.js';
import { readReviewInput, readReviewListQuery, reviewTags } from '../validators/reviewValidation.js';
import { ServiceError, throwIfFieldErrors } from './serviceError.js';

const reviewsPerLoad = 5;

// "Priya Sharma" -> "Priya S.": enough to feel real, not enough to find someone.
function shortName(fullName) {
  const [first = 'Customer', ...rest] = (fullName ?? '').trim().split(/\s+/);
  const lastInitial = rest.length > 0 ? ` ${rest[rest.length - 1][0].toUpperCase()}.` : '';
  return `${first}${lastInitial}`;
}

const toPublicReview = ({ customerName, ...review }) => ({ ...review, customerName: shortName(customerName) });

async function readProductId(database, productIdInput) {
  const productId = readPositiveInteger(productIdInput);
  if (!productId || !(await productExists(database, productId))) throw ServiceError.notFound('Product not found.');
  return productId;
}

// Product page: the summary (first load only) and the next few shown reviews.
async function listProductReviews({ database }, productIdInput, query) {
  const productId = await readProductId(database, productIdInput);
  const { stars, offset } = readReviewListQuery(query);
  const [summary, reviews] = await Promise.all([
    offset === 0 ? findReviewSummary(database, productId) : null,
    findProductReviews(database, buildProductReviewFilter({ productId, stars }), { limit: reviewsPerLoad + 1, offset }),
  ]);
  return {
    ...(summary && { summary }),
    reviews: reviews.slice(0, reviewsPerLoad).map(toPublicReview),
    hasMore: reviews.length > reviewsPerLoad,
  };
}

async function findCustomer(database, user) {
  const customer = await findCustomerWithProfileByUserId(database, user.id);
  if (!customer) throw ServiceError.badRequest('Add your address first, then place an order.');
  return customer;
}

// Signed-in customer: may they rate this product, and their own rating if any.
async function getMyReview({ database }, user, productIdInput) {
  const productId = await readProductId(database, productIdInput);
  const customer = await findCustomerWithProfileByUserId(database, user.id);
  if (!customer) return { canReview: false, review: null, tags: reviewTags };
  const [purchase, review] = await Promise.all([
    findDeliveredPurchase(database, customer.customerId, productId),
    findCustomerReview(database, customer.customerId, productId),
  ]);
  return { canReview: Boolean(purchase) && !customer.profile.blocked, purchase, review, tags: reviewTags };
}

// Only a customer who received the product can rate it; saving again edits their rating.
async function saveMyReview({ database }, user, productIdInput, body) {
  const productId = await readProductId(database, productIdInput);
  const { review, fieldErrors } = readReviewInput(body);
  throwIfFieldErrors(fieldErrors);
  const customer = await findCustomer(database, user);
  if (customer.profile.blocked) throw ServiceError.forbidden('Your account cannot post reviews. Please call the store.');
  const purchase = await findDeliveredPurchase(database, customer.customerId, productId);
  if (!purchase) throw ServiceError.forbidden('You can rate this once an order with it has been delivered to you.');
  await upsertReview(database, { ...review, productId, customerId: customer.customerId, packLabel: purchase.packLabel });
  return { review: await findCustomerReview(database, customer.customerId, productId) };
}

// Admin Reviews page. query: { search, show: all | low | text | hidden, page, pageSize }.
async function listReviewsForAdmin({ database }, query) {
  const searchText = typeof query.search === 'string' ? query.search.trim() : '';
  const reviewFilter = buildAdminReviewFilter({ searchText, show: query.show });
  const [total, totals] = await Promise.all([countReviewsForAdmin(database, reviewFilter), findReviewTotals(database)]);
  const page = readPage(query, total);
  const reviews = await findReviewsForAdmin(database, reviewFilter, page);
  return { reviews, totals, total, page: page.page, pageSize: page.pageSize, pageCount: page.pageCount };
}

// body: { hidden: true } hides a review from the shop; it is kept, never deleted.
async function saveReviewVisibility({ database }, reviewIdInput, body) {
  const reviewId = readPositiveInteger(reviewIdInput);
  if (typeof body.hidden !== 'boolean') throw ServiceError.badRequest('Say whether the review is hidden.');
  if (!reviewId || !(await setReviewHidden(database, reviewId, body.hidden))) throw ServiceError.notFound('Review not found.');
  return { reviewId, hidden: body.hidden };
}

export function createReviewService(dependencies) {
  return {
    listProductReviews: (productIdInput, query) => listProductReviews(dependencies, productIdInput, query),
    getMyReview: (user, productIdInput) => getMyReview(dependencies, user, productIdInput),
    saveMyReview: (user, productIdInput, body) => saveMyReview(dependencies, user, productIdInput, body),
    listReviewsForAdmin: (query) => listReviewsForAdmin(dependencies, query),
    saveReviewVisibility: (reviewIdInput, body) => saveReviewVisibility(dependencies, reviewIdInput, body),
  };
}
