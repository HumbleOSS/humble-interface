import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { selectLastRefresh, selectTimeSinceLastRefresh, selectTokensStatus } from '../store/tokenSlice';

const TokenRefreshStatus: React.FC = () => {
  const lastRefresh = useSelector(selectLastRefresh);
  const timeSinceLastRefresh = useSelector(selectTimeSinceLastRefresh);
  const status = useSelector(selectTokensStatus);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const formatLastRefresh = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (process.env.NODE_ENV === 'development') {
    return (
      <div style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        zIndex: 9999,
        fontFamily: 'monospace'
      }}>
        <div>Token Status: {status}</div>
        {lastRefresh && (
          <>
            <div>Last Refresh: {formatLastRefresh(lastRefresh)}</div>
            <div>Time Since: {timeSinceLastRefresh ? formatTime(timeSinceLastRefresh) : 'N/A'}</div>
          </>
        )}
      </div>
    );
  }

  return null;
};

export default TokenRefreshStatus; 