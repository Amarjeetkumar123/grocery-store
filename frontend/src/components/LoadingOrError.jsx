// Grey placeholder cards in the shape of a list, so nothing jumps when data arrives.
function PlaceholderCards() {
  return (
    <div className="placeholder-list" role="status" aria-label="Loading">
      {[0, 1, 2].map((index) => (
        <div key={index} className="placeholder-card">
          <span className="shimmer placeholder-image" />
          <span className="placeholder-lines">
            <span className="shimmer placeholder-line" />
            <span className="shimmer placeholder-line placeholder-line-short" />
            <span className="shimmer placeholder-line placeholder-line-shorter" />
          </span>
        </div>
      ))}
    </div>
  );
}

// Shown while a page loads its data, or when loading failed.
export function LoadingOrError({ loading, error, onRetry }) {
  if (loading) return <PlaceholderCards />;
  if (!error) return null;
  return (
    <div className="centered-block">
      <p className="error-text" role="alert">{error}</p>
      {onRetry && <button type="button" className="text-button" onClick={onRetry}>Try again</button>}
    </div>
  );
}
