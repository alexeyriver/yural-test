import { useCallback, useEffect, useRef, useState } from 'react';
import useDebounce from '../hooks/useDebounce.js';

export const DEBOUNCE_MS = 500;
export const MIN_LENGTH = 3;

export default function SearchForm({ onSearch }) {
  const [value, setValue] = useState('');
  const number = value.trim();
  const debounced = useDebounce(number, DEBOUNCE_MS);
  // Не повторяем запрос, если Enter уже отправил этот же артикул до срабатывания debounce
  const lastSearched = useRef('');

  const search = useCallback(
    (query) => {
      if (query.length < MIN_LENGTH || query === lastSearched.current) return;
      lastSearched.current = query;
      onSearch(query);
    },
    [onSearch],
  );

  useEffect(() => {
    search(debounced);
  }, [debounced, search]);

  const handleSubmit = (event) => {
    event.preventDefault();
    search(number);
  };

  return (
    <form className="row g-2 align-items-end" role="search" onSubmit={handleSubmit}>
      <div className="col-sm">
        <label htmlFor="article" className="form-label">
          Артикул
        </label>
        <input
          id="article"
          className="form-control"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Например, 01089"
          autoComplete="off"
          autoFocus
        />
      </div>
      <div className="col-sm-auto">
        <button type="submit" className="btn btn-primary" disabled={number.length < MIN_LENGTH}>
          Найти
        </button>
      </div>
      <div className="col-12 form-text mt-1">
        Поиск начнётся автоматически от {MIN_LENGTH} символов
      </div>
    </form>
  );
}
