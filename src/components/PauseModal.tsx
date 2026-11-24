import React from 'react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onReturnTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onReturnTitle,
}) => {
  return (
    <div
      role="dialog"
      aria-label="Race Paused"
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#140d07]/70 px-6"
    >
      <div className="w-full max-w-[380px] bg-[#1b130c]/98 border-2 border-[#d9a441] rounded-xl p-6 text-center shadow-2xl">
        <h2 className="font-display text-2xl font-bold text-[#fff8eb]">Race Paused</h2>
        <p className="text-sm text-[#cbb694] mt-1">
          Both temple runners are holding their positions.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-2.5 text-sm font-bold text-[#1a1108] bg-[#eab308] hover:bg-[#facc15] rounded-md border border-[#fef08a] cursor-pointer"
          >
            Resume Race
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-2.5 text-sm font-semibold text-[#f8f1e4] bg-[#2c1f14] hover:bg-[#3c2b1c] border border-[#d9a441]/55 rounded-md cursor-pointer"
          >
            Restart Race
          </button>
          <button
            type="button"
            onClick={onReturnTitle}
            className="w-full py-2.5 text-sm font-semibold text-[#e6d5b8] bg-[#1f160f] hover:bg-[#2c1f14] border border-[#6b5134] rounded-md cursor-pointer"
          >
            Main Screen
          </button>
        </div>
      </div>
    </div>
  );
};
