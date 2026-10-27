import { useSelector } from 'react-redux';
import { selectBrands } from '../store/brandsSlice.js';
import { selectOffers } from '../store/offersSlice.js';
import EmptyState from './EmptyState.jsx';
import ErrorAlert from './ErrorAlert.jsx';
import Loader from './Loader.jsx';

export default function BrandList({ onSelect, onRetry }) {
  const { items, status, error } = useSelector(selectBrands);
  const { selected } = useSelector(selectOffers);

  if (status === 'idle') {
    return <p className="text-body-secondary">Введите артикул, чтобы увидеть производителей</p>;
  }
  if (status === 'loading') return <Loader />;
  if (status === 'failed') return <ErrorAlert message={error} onRetry={onRetry} />;
  if (items.length === 0) return <EmptyState>Производители не найдены</EmptyState>;

  return (
    <div className="list-group">
      {items.map((item) => {
        const isActive = selected?.brand === item.brand;
        return (
          <button
            key={item.brand}
            type="button"
            className={`list-group-item list-group-item-action${isActive ? ' active' : ''}`}
            aria-current={isActive || undefined}
            onClick={() => onSelect?.(item)}
          >
            <div className="fw-semibold">{item.brand}</div>
            <small className={isActive ? undefined : 'text-body-secondary'}>{item.name}</small>
          </button>
        );
      })}
    </div>
  );
}
