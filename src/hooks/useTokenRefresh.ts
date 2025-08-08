import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store/store';
import { getTokens } from '../store/tokenSlice';

const ONE_HOUR_MS = 60 * 60 * 1000; // 1 hour in milliseconds

export const useTokenRefresh = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { lastRefresh, status } = useSelector((state: RootState) => state.tokens);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const shouldRefresh = () => {
    if (!lastRefresh) return true;
    const timeSinceLastRefresh = Date.now() - lastRefresh;
    return timeSinceLastRefresh >= ONE_HOUR_MS;
  };

  const startHourlyRefresh = () => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up hourly interval
    intervalRef.current = setInterval(() => {
      dispatch(getTokens());
    }, ONE_HOUR_MS);
  };

  useEffect(() => {
    // Check if we need to refresh on mount
    if (shouldRefresh()) {
      dispatch(getTokens());
    }

    // Start the hourly refresh cycle
    startHourlyRefresh();

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [dispatch, lastRefresh]);

  // Restart interval when lastRefresh changes
  useEffect(() => {
    if (lastRefresh) {
      startHourlyRefresh();
    }
  }, [lastRefresh]);

  return {
    lastRefresh,
    status,
    shouldRefresh: shouldRefresh(),
  };
}; 