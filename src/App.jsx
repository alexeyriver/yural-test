import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import BrandList from './components/BrandList.jsx';
import OffersTable from './components/OffersTable.jsx';
import SearchForm from './components/SearchForm.jsx';
import useLatestThunk from './hooks/useLatestThunk.js';
import { searchBrands, selectBrands } from './store/brandsSlice.js';
import { loadOffers, selectOffers } from './store/offersSlice.js';

export default function App() {
  const { query } = useSelector(selectBrands);
  const { selected } = useSelector(selectOffers);
  const runBrands = useLatestThunk();
  const runOffers = useLatestThunk();

  const handleSearch = useCallback((number) => runBrands(searchBrands(number)), [runBrands]);
  const handleSelect = useCallback(
    ({ number, brand }) => runOffers(loadOffers({ number, brand })),
    [runOffers],
  );

  return (
    <div className="container py-4">
      <h1 className="h3 mb-4">Поиск автозапчастей</h1>
      <SearchForm onSearch={handleSearch} />
      <div className="row g-4 mt-1">
        <section className="col-md-4" aria-labelledby="brands-title">
          <h2 id="brands-title" className="h5">
            Производители
          </h2>
          <BrandList onSelect={handleSelect} onRetry={() => handleSearch(query)} />
        </section>
        <section className="col-md-8" aria-labelledby={selected ? 'offers-title' : undefined}>
          <OffersTable onRetry={() => handleSelect(selected)} />
        </section>
      </div>
    </div>
  );
}
