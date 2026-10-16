import { useCallback, useEffect, useState } from 'react';
import { callApi } from '../../apiClient.js';
import { useApiData } from '../../useApiData.js';
import { useAuthentication } from '../../AuthenticationContext.jsx';
import { formatDaysAgo } from '../../formatting.js';
import { ReviewSheet } from '../../components/ReviewSheet.jsx';
import { StarIcon, StarRow } from '../../components/Rating.jsx';

const starFilters = [{ value: '', label: 'All' }, { value: '5', label: '5 ★' }, { value: '4', label: '4 ★' }, { value: 'low', label: '1–3 ★' }];

// One product's shown reviews, a few at a time. stars: '', '5', '4' or 'low'.
function useReviewList(productId, stars) {
  const [state, setState] = useState({ summary: null, reviews: [], hasMore: false, loading: true });
  const load = useCallback(async (offset) => {
    setState((previous) => ({ ...previous, loading: true }));
    const result = await callApi(`/api/products/${productId}/reviews?stars=${stars}&offset=${offset}`).catch(() => null);
    setState((previous) => ({
      summary: result?.summary ?? previous.summary,
      reviews: offset === 0 ? result?.reviews ?? [] : [...previous.reviews, ...(result?.reviews ?? [])],
      hasMore: result?.hasMore ?? false,
      loading: false,
    }));
  }, [productId, stars]);
  useEffect(() => { load(0); }, [load]);
  return { ...state, reload: () => load(0), loadMore: () => load(state.reviews.length) };
}

function StarBars({ summary }) {
  return (
    <div className="review-bars">
      {[5, 4, 3, 2, 1].map((stars) => (
        <div key={stars} className={`review-bar-row review-bar-${stars}`}>
          <span>{stars}<StarIcon size={10} /></span>
          <span className="review-bar"><i style={{ width: `${summary.ratingCount ? (summary.starCounts[stars] / summary.ratingCount) * 100 : 0}%` }} /></span>
          <span>{summary.starCounts[stars]}</span>
        </div>
      ))}
    </div>
  );
}

function ReviewSummary({ summary }) {
  return (
    <div className="review-summary">
      <div className="review-average">
        <strong>{summary.average.toFixed(1)} <StarIcon size={18} /></strong>
        <small>{summary.ratingCount} {summary.ratingCount === 1 ? 'rating' : 'ratings'}<br />{summary.reviewCount} {summary.reviewCount === 1 ? 'review' : 'reviews'}</small>
      </div>
      <StarBars summary={summary} />
    </div>
  );
}

// For a customer who received this product: tap a star to rate, or see and edit their rating.
function RatePrompt({ myReview, onRate }) {
  if (!myReview?.canReview) return null;
  if (myReview.review) {
    return (
      <div className="rate-prompt">
        <p>Your rating<small><StarRow rating={myReview.review.rating} size={12} /></small></p>
        <button type="button" className="text-button" onClick={() => onRate(null)}>Edit</button>
      </div>
    );
  }
  return (
    <div className="rate-prompt">
      <p>You bought this<small>How was it? Tap a star</small></p>
      <div className="rate-prompt-stars">
        {[1, 2, 3, 4, 5].map((star) => <button key={star} type="button" onClick={() => onRate(star)} aria-label={`Rate ${star} out of 5`}><StarIcon size={24} /></button>)}
      </div>
    </div>
  );
}

function initialsOf(name) {
  return name.split(/\s+/).map((word) => word[0]).join('').slice(0, 2).toUpperCase();
}

function ReviewItem({ review }) {
  return (
    <article className="review-item">
      <div className="review-item-top">
        <span className="review-avatar" aria-hidden="true">{initialsOf(review.customerName)}</span>
        <p><strong>{review.customerName}</strong><small>{review.zoneName ? `${review.zoneName} · ` : ''}<span className="review-verified">✓ Verified buyer</span></small></p>
      </div>
      <div className="review-item-stars"><StarRow rating={review.rating} /><small>{formatDaysAgo(review.createdAt)}{review.edited ? ' · edited' : ''}</small></div>
      {review.body && <p className="review-body">{review.body}</p>}
      {(review.tags.length > 0 || review.packLabel) && (
        <div className="review-item-tags">
          {review.packLabel && <span>Bought: {review.packLabel}</span>}
          {review.tags.map((tag) => <span key={tag}>{tag}</span>)}
        </div>
      )}
    </article>
  );
}

function ReviewFilters({ stars, onChange }) {
  return (
    <div className="review-filters" role="group" aria-label="Show reviews with">
      {starFilters.map((filter) => (
        <button key={filter.value} type="button" className="chip" aria-pressed={stars === filter.value} onClick={() => onChange(filter.value)}>{filter.label}</button>
      ))}
    </div>
  );
}

function ReviewList({ list, stars }) {
  if (list.reviews.length === 0 && !list.loading) {
    return <p className="hint review-empty">{stars ? 'No reviews with these stars yet.' : 'No written reviews yet.'}</p>;
  }
  return (
    <>
      {list.reviews.map((review) => <ReviewItem key={review.id} review={review} />)}
      {list.hasMore && (
        <button type="button" className="button button-outline review-more" onClick={list.loadMore} disabled={list.loading}>
          {list.loading ? 'Loading…' : 'Show more reviews'}
        </button>
      )}
    </>
  );
}

// Under the product details. Buyers can rate from here; everyone can read.
export function ProductReviews({ product, onRatingsChanged }) {
  const { account } = useAuthentication();
  const myReviewRequest = useApiData(account?.role === 'customer' ? `/api/account/reviews/${product.id}` : null);
  const [stars, setStars] = useState('');
  const [sheetRating, setSheetRating] = useState(undefined);
  const list = useReviewList(product.id, stars);
  const hasRatings = list.summary?.ratingCount > 0;
  function afterSaved() {
    myReviewRequest.reload();
    list.reload();
    onRatingsChanged?.();
  }
  return (
    <section className="card product-reviews" id="reviews">
      <h2>Ratings &amp; reviews</h2>
      {hasRatings ? <ReviewSummary summary={list.summary} /> : !list.loading && <p className="hint">No ratings yet. Customers who receive this product can rate it.</p>}
      <RatePrompt myReview={myReviewRequest.data} onRate={(rating) => setSheetRating(rating)} />
      {hasRatings && <ReviewFilters stars={stars} onChange={setStars} />}
      {hasRatings && <ReviewList list={list} stars={stars} />}
      {sheetRating !== undefined && (
        <ReviewSheet productId={product.id} productName={product.name} initialRating={sheetRating}
          onClose={() => setSheetRating(undefined)} onSaved={afterSaved} />
      )}
    </section>
  );
}
