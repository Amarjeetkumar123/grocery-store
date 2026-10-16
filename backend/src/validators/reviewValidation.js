import { readOptionalText, readPositiveInteger } from './commonValidation.js';

// Quick tags a customer can tap when rating. Kept here so the shop and the server agree.
export const reviewTags = ['Fresh', 'Good packing', 'Value for money', 'Long expiry', 'Damaged pack'];
const maximumReviewLength = 500;

// body: { rating: 1-5, tags: ['Fresh'], body: 'text' }. Returns { review, fieldErrors }.
export function readReviewInput(body) {
  const fieldErrors = {};
  const rating = readPositiveInteger(body.rating);
  if (!rating || rating > 5) fieldErrors.rating = 'Tap a star to rate.';
  const tags = Array.isArray(body.tags) ? [...new Set(body.tags)] : [];
  if (tags.some((tag) => !reviewTags.includes(tag))) fieldErrors.tags = 'Choose tags from the list.';
  const text = readOptionalText(body, 'body', 'Your review', maximumReviewLength, fieldErrors);
  return { review: { rating, tags, body: text }, fieldErrors };
}

// Product page list: ?stars=5, 4 or "low" (1-3), and ?offset= for "Show more".
export function readReviewListQuery(query) {
  const stars = ['5', '4', 'low'].includes(query.stars) ? query.stars : null;
  const offset = Number.isSafeInteger(Number(query.offset)) && Number(query.offset) > 0 ? Number(query.offset) : 0;
  return { stars, offset };
}
