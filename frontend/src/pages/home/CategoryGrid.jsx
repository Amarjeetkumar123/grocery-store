import { useState } from 'react';
import { Link } from 'react-router';
import { useApiData } from '../../useApiData.js';
import { useAuthentication } from '../../AuthenticationContext.jsx';
import { callApi } from '../../apiClient.js';
import { categoryImageFor } from '../../categoryImages.js';
import { LoadingOrError } from '../../components/LoadingOrError.jsx';
import { Icon } from '../../Icon.jsx';

// The owner's photo when there is one, otherwise the built-in picture.
function CategoryPhoto({ category, children }) {
  const className = category.imageUrl ? 'category-photo' : 'category-photo category-photo-illustration';
  return (
    <span className={className}>
      <img src={category.imageUrl ?? categoryImageFor(category.name)} alt="" loading="lazy" />
      {children}
    </span>
  );
}

function CategoryTile({ category }) {
  return (
    <Link to={`/category/${category.id}`} className="category-tile">
      <CategoryPhoto category={category} />
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
      <CategoryPhoto category={category}>
        <span className="coming-soon-label">Coming soon</span>
        {!alreadyRequested && (
          <button type="button" className="notify-bell" onClick={requestNotification} aria-label={`Notify me when ${category.name} arrives`}>
            <Icon name="bell" size={16} />
          </button>
        )}
      </CategoryPhoto>
      <span>{category.name}</span>
      {alreadyRequested && <span className="hint">We'll let you know</span>}
      {requestError && <span className="field-error">{requestError}</span>}
    </div>
  );
}

export function CategoryGrid() {
  const { data, error, loading, reload } = useApiData('/api/categories');
  if (!data) return <LoadingOrError loading={loading} error={error} onRetry={reload} />;
  return (
    <div className="category-grid">
      {data.categories.map((category) => (category.comingSoon
        ? <ComingSoonTile key={category.id} category={category} />
        : <CategoryTile key={category.id} category={category} />))}
    </div>
  );
}
