import { useCallback, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';

// Диспатчит thunk, отменяя предыдущий запущенный через этот же хук; при размонтировании — тоже
export default function useLatestThunk() {
  const dispatch = useDispatch();
  const last = useRef(null);

  useEffect(() => () => last.current?.abort(), []);

  return useCallback(
    (thunkAction) => {
      last.current?.abort();
      last.current = dispatch(thunkAction);
      return last.current;
    },
    [dispatch],
  );
}
