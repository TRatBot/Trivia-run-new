import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-md bg-[#1e150e]/95 border border-[#eab308] px-3.5 py-2 text-xs font-semibold text-[#fde68a] shadow-lg"
    >
      <WifiOff className="w-3.5 h-3.5 text-[#facc15] shrink-0" aria-hidden="true" />
      <span>Offline Mode — Playing from local cache</span>
    </div>
  );
};
