import React from 'react';
import { Trophy, Usb } from 'lucide-react';
import { ArduinoStatus } from '../game/types';
import { PWAInstallButton } from './PWAInstallButton';

interface TitleOverlayProps {
  onStartSelect: () => void;
  onQuickStart: () => void;
  onOpenArduino: () => void;
  onOpenLeaderboard: () => void;
  leaderboardCount: number;
  arduinoStatus: ArduinoStatus;
}

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  onStartSelect,
  onQuickStart,
  onOpenArduino,
  onOpenLeaderboard,
  leaderboardCount,
  arduinoStatus,
}) => {
  const connectedBoards =
    (arduinoStatus.p1Connected ? 1 : 0) + (arduinoStatus.p2Connected ? 1 : 0);

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between px-8 py-8">
      {/* Top quiet utility bar (right corner only, keeps upper sky negative space open) */}
      <div className="flex justify-end items-center gap-2.5 flex-wrap">
        <button
          type="button"
          onClick={onOpenLeaderboard}
          className="pointer-events-auto inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#f8f1e4] bg-[#1e150e]/90 hover:bg-[#2c1f14] border border-[#d9a441]/55 rounded-md transition-colors cursor-pointer whitespace-nowrap"
        >
          <Trophy className="w-4 h-4 text-[#facc15]" aria-hidden="true" />
          <span>Leaderboard{leaderboardCount > 0 ? ` (${leaderboardCount})` : ''}</span>
        </button>
        <PWAInstallButton />
        <button
          type="button"
          onClick={onOpenArduino}
          className="pointer-events-auto inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#f8f1e4] bg-[#1e150e]/90 hover:bg-[#2c1f14] border border-[#d9a441]/55 rounded-md transition-colors cursor-pointer whitespace-nowrap"
        >
          <Usb className="w-4 h-4 text-[#facc15]" aria-hidden="true" />
          <span>
            {connectedBoards > 0
              ? `Arduino Connected (${connectedBoards}/2)`
              : 'Arduino Setup'}
          </span>
        </button>
      </div>

      {/* Focal Centerpiece Title Lockup positioned over calm golden temple sky */}
      <div className="flex flex-col items-center text-center -mt-10">
        {/* Bespoke Carved Sun-Crest SVG Title Lockup */}
        <svg
          viewBox="0 0 640 210"
          className="w-full max-w-[580px] h-auto drop-shadow-[0_10px_28px_rgba(18,12,6,0.75)]"
          role="img"
          aria-label="Sunstone Sprint — Two-Player Temple Runner Race"
        >
          {/* Radiant Sun Medallion Crest */}
          <g transform="translate(320, 48)">
            <circle cx="0" cy="0" r="28" fill="#1e150e" stroke="#e6b84c" strokeWidth="3.5" />
            <circle cx="0" cy="0" r="19" fill="#0f766e" stroke="#fde047" strokeWidth="2" />
            <polygon points="0,-13 4,-3 14,0 4,3 0,13 -4,3 -14,0 -4,-3" fill="#fde047" />
            {/* Sunburst Rays */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
              <line
                key={deg}
                x1="0"
                y1="-33"
                x2="0"
                y2={deg % 60 === 0 ? '-44' : '-39'}
                stroke="#fde047"
                strokeWidth={deg % 60 === 0 ? '3' : '2'}
                strokeLinecap="round"
                transform={`rotate(${deg})`}
              />
            ))}
          </g>

          {/* Horizontal Carved Temple Bars flanking Sun Crest */}
          <path d="M 70 48 L 265 48" stroke="#e6b84c" strokeWidth="2.5" opacity="0.9" />
          <path d="M 375 48 L 570 48" stroke="#e6b84c" strokeWidth="2.5" opacity="0.9" />
          <rect x="64" y="43" width="10" height="10" transform="rotate(45 69 48)" fill="#14b8a6" stroke="#fde047" strokeWidth="1.5" />
          <rect x="566" y="43" width="10" height="10" transform="rotate(45 571 48)" fill="#14b8a6" stroke="#fde047" strokeWidth="1.5" />

          {/* Main Carved Monumental Wordmark */}
          <text
            x="320"
            y="138"
            textAnchor="middle"
            className="font-display"
            fontSize="58"
            fontWeight="800"
            letterSpacing="4"
            fill="#fff8eb"
            stroke="#24160b"
            strokeWidth="8"
            paintOrder="stroke fill"
          >
            SUNSTONE SPRINT
          </text>

          {/* Subtle Subtitle carved beneath */}
          <text
            x="320"
            y="176"
            textAnchor="middle"
            fontFamily="Plus Jakarta Sans, sans-serif"
            fontSize="16"
            fontWeight="700"
            letterSpacing="3.5"
            fill="#fde68a"
            stroke="#1e140a"
            strokeWidth="4"
            paintOrder="stroke fill"
          >
            TWO-PLAYER TEMPLE RACE · 3,000 M
          </text>
        </svg>

        {/* Primary & Secondary Actions (max 2 buttons) */}
        <div className="mt-5 flex items-center gap-4 pointer-events-auto">
          <button
            type="button"
            data-start="true"
            onClick={onStartSelect}
            className="px-8 py-3.5 text-base font-bold tracking-wide text-[#1a1108] bg-[#eab308] hover:bg-[#facc15] active:scale-[0.98] rounded-md border-2 border-[#fef08a] shadow-[0_8px_24px_rgba(18,12,6,0.55)] transition-transform cursor-pointer whitespace-nowrap"
          >
            Choose Runners
          </button>
          <button
            type="button"
            onClick={onQuickStart}
            className="px-6 py-3.5 text-base font-semibold text-[#f8f1e4] bg-[#21160d]/92 hover:bg-[#312114] border border-[#d9a441]/60 rounded-md shadow-[0_6px_18px_rgba(18,12,6,0.45)] transition-colors cursor-pointer whitespace-nowrap"
          >
            Quick Race
          </button>
        </div>
      </div>

      {/* Bottom Safe-Margin Flat Control Hint Line */}
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="px-4 py-1.5 rounded bg-[#16100a]/82 border border-[#d9a441]/35 text-sm font-semibold text-[#fff7e6] tracking-wide">
          Player 1: A / D Move · W Jump · S Select &nbsp;&nbsp;|&nbsp;&nbsp; Player 2: ← / → Move · ↑ Jump · ↓ / Enter Select &nbsp;&nbsp;|&nbsp;&nbsp; Press Enter or Space to Start
        </p>
      </div>
    </div>
  );
};
