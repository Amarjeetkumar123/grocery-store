const starPath = 'm12 2.5 2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z';

export function StarIcon({ size = 12, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d={starPath} />
    </svg>
  );
}

// ★★★★☆ for a whole-number rating.
export function StarRow({ rating, size = 13 }) {
  return (
    <span className="star-row" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => <StarIcon key={star} size={size} className={star <= rating ? undefined : 'star-empty'} />)}
    </span>
  );
}

// "4.4 ★  128 ratings" on product cards; "No ratings yet" before the first one.
export function RatingLine({ rating }) {
  if (!rating?.count) return <p className="rating-line rating-line-empty">No ratings yet</p>;
  return (
    <p className="rating-line">
      <span className="rating-chip">{rating.average.toFixed(1)} <StarIcon size={10} /></span>
      {rating.count} {rating.count === 1 ? 'rating' : 'ratings'}
    </p>
  );
}
