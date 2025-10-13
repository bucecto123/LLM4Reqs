import React from 'react';
import { useAuthState, useTokenRefresh } from '../hooks/useAuth.jsx';
import { Clock, RefreshCw, AlertTriangle } from 'lucide-react';

export default function TokenStatus({ className = '' }) {
  const { tokenExpiry, isExpired, willExpireSoon, timeUntilExpiry } = useAuthState();
  const { refresh, isRefreshing, lastRefresh } = useTokenRefresh();

  if (!tokenExpiry) return null;

  const formatTimeRemaining = (ms) => {
    const minutes = Math.floor(ms / (1000 * 60));
    if (minutes < 1) return 'Less than 1 minute';
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getStatusColor = () => {
    if (isExpired) return 'text-red-600 bg-red-50';
    if (willExpireSoon) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getStatusIcon = () => {
    if (isExpired) return <AlertTriangle size={14} />;
    if (willExpireSoon) return <Clock size={14} />;
    return <Clock size={14} />;
  };

  return (
    <div className={`flex items-center space-x-2 px-2 py-1 rounded-md text-xs ${getStatusColor()} ${className}`}>
      {getStatusIcon()}
      <span>
        {isExpired ? 'Token expired' : `Token expires in ${formatTimeRemaining(timeUntilExpiry)}`}
      </span>
      {(willExpireSoon || isExpired) && (
        <button
          onClick={refresh}
          disabled={isRefreshing}
          className="ml-1 p-1 rounded hover:bg-black/10 disabled:opacity-50"
          title="Refresh token"
        >
          <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      )}
      {lastRefresh && (
        <span className="text-xs opacity-75">
          Last refreshed: {lastRefresh.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}