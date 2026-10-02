import { useState } from 'react';
import { Link } from 'react-router';
import { useApiData } from '../../useApiData.js';
import { useAuthentication } from '../../AuthenticationContext.jsx';
import { callApi } from '../../apiClient.js';
import { categoryImageFor } from '../../categoryImages.js';
import { LoadingOrError } from '../../components/LoadingOrError.jsx';

const tileColors = ['#fbf0cf', '#f3e8da', '#edf0e6', '#f9e5d8', '#eee7d3', '#eaeae6'];

function CategoryTile({ category, colorIndex }) {
  return (
    <Link to={`/category/${category.id}`} className="category-tile" style={{ background: tileColors[colorIndex % tileColors.length] }}>
      <img src={categoryImageFor(category.name)} alt="" />
      <span>{category.name}</span>
    </Link>
  );
}

function ComingSoonTile({ category }) {
  const { account, refreshAccount } = useAuthentication();
  const [requestError, setRequestError] = useState(null);
  const alreadyRequested = account.notifyMeCategoryIds.includes(category.id);

  async function requestNotification() {
    try {
      await callApi('/api/account/notify-me', { method: 'POST', body: { categoryId: category.id } });
      await refreshAccount();
    } catch (error) {
      setRequestError(error.message);
    }
  }
  return (
    <div className="category-tile category-tile-coming-soon">
      <img src={categoryImageFor(category.name)} alt="" />
      <span>{category.name}</span>
      <span className="pill pill-amber">Coming soon</span>
      {alreadyRequested
        ? <span className="hint">We'll let you know</span>
        : <button type="button" className="text-button small-text-button" onClick={requestNotification}>Notify me</button>}
      {requestError && <span className="field-error">{requestError}</span>}
    </div>
  );
}

export function CategoryGrid() {
  const { data, error, loading, reload } = useApiData('/api/categories');
  if (!data) return <LoadingOrError loading={loading} error={error} onRetry={reload} />;
  return (
    <div className="category-grid">
      {data.categories.map((category, index) => (category.comingSoon
        ? <ComingSoonTile key={category.id} category={category} />
        : <CategoryTile key={category.id} category={category} colorIndex={index} />))}
    </div>
  );
}
