import React, { useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isInIframe, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // Suppress button when already running as an installed standalone PWA
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    setShowGuide(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void handleClick()}
        className="pointer-events-auto inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#f8f1e4] bg-[#1e150e]/90 hover:bg-[#2c1f14] border border-[#d9a441]/55 rounded-md transition-colors cursor-pointer whitespace-nowrap"
      >
        <Download className="w-4 h-4 text-[#facc15]" aria-hidden="true" />
        <span>{isIOS ? 'Install on iOS' : 'Install App'}</span>
      </button>

      {showGuide && (
        <div
          role="dialog"
          aria-label="Install Sunstone Sprint for Offline Play"
          className="fixed inset-0 z-50 pointer-events-auto flex items-center justify-center bg-[#140d07]/75 px-4"
        >
          <div className="w-full max-w-md rounded-xl bg-[#1b130c] border-2 border-[#eab308] p-6 text-left shadow-[0_20px_60px_rgba(0,0,0,0.85)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-xl font-extrabold text-[#fff8eb]">
                  {isIOS ? 'Install on iPhone / iPad' : 'Install Sunstone Sprint'}
                </h3>
                <p className="mt-1 text-xs font-medium text-[#fde68a]">
                  Play full-screen and completely offline at your school fair
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close install instructions"
                className="p-1.5 rounded-md text-[#dfd0b8] hover:text-[#fff8eb] hover:bg-[#2c1f14] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="mt-4 space-y-2.5 text-sm text-[#e8dcc8] list-decimal list-inside">
                <li>
                  Open this game in <strong className="text-[#fff8eb]">Safari</strong>.
                </li>
                <li>
                  Tap the <strong className="text-[#fff8eb]">Share</strong> button in the toolbar.
                </li>
                <li>
                  Scroll down and tap <strong className="text-[#fff8eb]">Add to Home Screen</strong>.
                </li>
              </ol>
            ) : (
              <ol className="mt-4 space-y-2.5 text-sm text-[#e8dcc8] list-decimal list-inside">
                {isInIframe && (
                  <li>
                    Open the app in its own browser tab first (click{' '}
                    <strong className="text-[#fff8eb]">Open in new tab</strong> or your{' '}
                    <strong className="text-[#fff8eb]">Shared App URL</strong> in Chrome or Edge).
                  </li>
                )}
                <li>
                  Click the <strong className="text-[#fff8eb]">Install App</strong> button here or
                  the <strong className="text-[#fff8eb]">Install icon</strong> at the right end of
                  the Chrome/Edge address bar.
                </li>
                <li>
                  Once installed, launch <strong className="text-[#fff8eb]">Sunstone Sprint</strong>{' '}
                  from your desktop or Start menu — it caches the entire game for{' '}
                  <strong className="text-[#fde68a]">offline play</strong>.
                </li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full rounded-md bg-[#eab308] hover:bg-[#facc15] py-2.5 text-sm font-bold text-[#1a1108] border border-[#fef08a] cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
