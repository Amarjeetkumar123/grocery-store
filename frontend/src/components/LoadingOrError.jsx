// Shown while a page loads its data, or when loading failed.
export function LoadingOrError({ loading, error, onRetry }) {
  if (loading) return <p className="hint centered" role="status">Loading…</p>;
  if (!error) return null;
  return (
    <div className="centered-block">
      <p className="error-text" role="alert">{error}</p>
      {onRetry && <button type="button" className="text-button" onClick={onRetry}>Try again</button>}
    </div>
  );
}
