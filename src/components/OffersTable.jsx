import { useDispatch, useSelector } from 'react-redux';
import { selectOffers, selectVisibleOffers, toggleOnlyInStock } from '../store/offersSlice.js';
import { formatDate, formatPrice } from '../utils/format.js';
import EmptyState from './EmptyState.jsx';
import ErrorAlert from './ErrorAlert.jsx';
import Loader from './Loader.jsx';
import { STATUS } from '../constants.js';

function OffersBody({ onRetry }) {
  const { items, status, error, onlyInStock } = useSelector(selectOffers);
  const visible = useSelector(selectVisibleOffers);

  if (status === STATUS.LOADING) return <Loader />;
  if (status === STATUS.FAILED) return <ErrorAlert message={error} onRetry={onRetry} />;
  if (items.length === 0) return <EmptyState>Предложений нет</EmptyState>;
  if (visible.length === 0 && onlyInStock) {
    return <EmptyState>Нет в наличии — снимите фильтр «Только в наличии»</EmptyState>;
  }

  return (
    <div className="table-responsive">
      <table className="table table-striped table-hover table-sm align-middle">
        <thead>
          <tr>
            <th scope="col">Производитель</th>
            <th scope="col">Номер</th>
            <th scope="col">Название</th>
            <th scope="col" className="text-end">
              Цена
            </th>
            <th scope="col" className="text-end">
              Остаток
            </th>
            <th scope="col">Склад</th>
            <th scope="col">Отгрузка</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((offer) => (
            <tr key={offer.id}>
              <td className="text-nowrap">
                {offer.brand}
                {offer.isOriginal && <span className="badge text-bg-primary ms-2">Оригинал</span>}
              </td>
              <td className="text-nowrap">{offer.number}</td>
              <td>{offer.name}</td>
              <td className="text-end text-nowrap">{formatPrice(offer.price)}</td>
              <td className="text-end text-nowrap">
                {offer.stock > 0 ? (
                  offer.stock
                ) : (
                  <span className="text-body-secondary">нет в наличии</span>
                )}
              </td>
              <td className="text-nowrap">{offer.warehouse}</td>
              <td className="text-nowrap">{formatDate(offer.shipmentDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function OffersTable({ onRetry }) {
  const dispatch = useDispatch();
  const { selected, status, onlyInStock } = useSelector(selectOffers);
  const visible = useSelector(selectVisibleOffers);

  if (!selected) return null;

  return (
    <>
      <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
        <h2 id="offers-title" className="h5 mb-0 me-auto">
          {selected.brand} {selected.number} — предложения
        </h2>
        <div className="form-check mb-0">
          <input
            id="only-in-stock"
            type="checkbox"
            className="form-check-input"
            checked={onlyInStock}
            onChange={() => dispatch(toggleOnlyInStock())}
          />
          <label htmlFor="only-in-stock" className="form-check-label">
            Только в наличии
          </label>
        </div>
        {status === STATUS.SUCCEEDED && (
          <span className="badge text-bg-secondary" data-testid="offers-count">
            {visible.length} шт
          </span>
        )}
      </div>
      <OffersBody onRetry={onRetry} />
    </>
  );
}
