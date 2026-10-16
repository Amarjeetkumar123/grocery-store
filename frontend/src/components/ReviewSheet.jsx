import { useEffect, useRef, useState } from 'react';
import { callApi } from '../apiClient.js';
import { useApiData } from '../useApiData.js';
import { formatDeliveryDay } from '../formatting.js';
import { StarIcon } from './Rating.jsx';
import { useToast } from './ToastProvider.jsx';

const starWords = ['', 'Very bad', 'Bad', 'Okay', 'Good', 'Excellent'];
const maximumReviewLength = 500;

function BigStars({ rating, onRate }) {
  return (
    <div className="review-big-stars" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" role="radio" aria-checked={star === rating} aria-label={`${star} ${star === 1 ? 'star' : 'stars'}`}
          className={star <= rating ? 'review-star-on' : undefined} onClick={() => onRate(star)}>
          <StarIcon size={34} />
        </button>
      ))}
    </div>
  );
}

function TagChoices({ tags, chosenTags, onToggle }) {
  return (
    <div className="review-tags">
      {tags.map((tag) => (
        <button key={tag} type="button" className="chip" aria-pressed={chosenTags.includes(tag)} onClick={() => onToggle(tag)}>{tag}</button>
      ))}
    </div>
  );
}

function useReviewForm(myReview, initialRating) {
  const saved = myReview.review;
  const [values, setValues] = useState({ rating: initialRating ?? saved?.rating ?? 0, tags: saved?.tags ?? [], body: saved?.body ?? '' });
  const toggleTag = (tag) => setValues((previous) => ({
    ...previous, tags: previous.tags.includes(tag) ? previous.tags.filter((chosen) => chosen !== tag) : [...previous.tags, tag],
  }));
  return { values, setValues, toggleTag };
}

function ReviewForm({ productId, myReview, initialRating, onSaved }) {
  const { values, setValues, toggleTag } = useReviewForm(myReview, initialRating);
  const [state, setState] = useState({ saving: false, error: null });
  const showToast = useToast();
  async function submit(event) {
    event.preventDefault();
    setState({ saving: true, error: null });
    try {
      await callApi(`/api/account/reviews/${productId}`, { method: 'PUT', body: values });
      showToast(myReview.review ? 'Your review is updated' : 'Thanks for rating!');
      onSaved();
    } catch (error) {
      setState({ saving: false, error: error.message });
    }
  }
  return (
    <form onSubmit={submit}>
      <BigStars rating={values.rating} onRate={(rating) => setValues({ ...values, rating })} />
      <p className="review-star-word">{starWords[values.rating] || 'Tap a star'}</p>
      <TagChoices tags={myReview.tags} chosenTags={values.tags} onToggle={toggleTag} />
      <textarea className="input review-text" value={values.body} maxLength={maximumReviewLength} rows={3}
        placeholder="Tell others about the quality, taste or packing (optional)" onChange={(event) => setValues({ ...values, body: event.target.value })} />
      <p className="review-counter">{values.body.length} / {maximumReviewLength}</p>
      {state.error && <p className="field-error" role="alert">{state.error}</p>}
      <button type="submit" className="button" disabled={!values.rating || state.saving}>
        {state.saving ? <><span className="spinner" aria-hidden="true" /> Saving…</> : myReview.review ? 'Update review' : 'Submit review'}
      </button>
    </form>
  );
}

// Slides up on phones, a box in the middle on computers. Loads the customer's own
// rating, so it opens the same from the product page and from a delivered order.
// initialRating: the star they tapped to open it.
export function ReviewSheet({ productId, productName, initialRating, onClose, onSaved }) {
  const dialogRef = useRef(null);
  const { data, error } = useApiData(`/api/account/reviews/${productId}`);
  useEffect(() => {
    if (!dialogRef.current.open) dialogRef.current.showModal();
  }, []);
  return (
    <dialog ref={dialogRef} className="popup popup-medium review-sheet" aria-label={`Rate ${productName}`}
      onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => event.target === dialogRef.current && onClose()}>
      <div className="review-sheet-body">
        <span className="review-sheet-grabber" aria-hidden="true" />
        <div className="review-sheet-product">
          <strong>{productName}</strong>
          {data?.purchase && <small>{data.purchase.packLabel} · delivered {formatDeliveryDay(data.purchase.deliveryDate)}</small>}
        </div>
        {error && <p className="field-error" role="alert">{error}</p>}
        {data && !data.canReview && <p className="hint">You can rate this once an order with it has been delivered to you.</p>}
        {data?.canReview && <ReviewForm productId={productId} myReview={data} initialRating={initialRating} onSaved={() => { onSaved?.(); onClose(); }} />}
        {!data && !error && <span className="spinner spinner-dark review-sheet-loading" aria-hidden="true" />}
      </div>
    </dialog>
  );
}
