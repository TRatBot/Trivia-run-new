import React from 'react';
import { Crown, Medal, Trash2, Trophy, X } from 'lucide-react';
import { getCharacterById } from '../game/data';
import { formatRaceTime } from '../game/leaderboard';
import { CharacterId, CustomCharacterAsset, LeaderboardEntry } from '../game/types';
import { CharacterPortrait } from './CharacterPortrait';

interface LeaderboardModalProps {
  entries: LeaderboardEntry[];
  customAssets: Partial<Record<CharacterId, CustomCharacterAsset>>;
  onClear: () => void;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  entries,
  customAssets,
  onClear,
  onClose,
}) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Top 5 Fastest Race Times Leaderboard"
      data-testid="leaderboard-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#120b06]/72 px-4"
    >
      <div className="w-full max-w-[600px] bg-[#1b130c] border-2 border-[#eab308] rounded-xl shadow-[0_24px_64px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#25190e] border-b border-[#d9a441]/45">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#eab308]/20 border border-[#facc15] flex items-center justify-center">
              <Trophy className="w-5 h-5 text-[#facc15]" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-display text-xl font-extrabold text-[#fff8eb] leading-tight">
                Temple Hall of Speed
              </h2>
              <p className="text-xs text-[#d6c3a3]">
                Top 5 Fastest 3,000 m Race Times (Saved Locally)
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close leaderboard"
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center text-[#e7d8be] hover:bg-[#382617] cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {entries.length === 0 ? (
            <div className="py-10 px-4 text-center rounded-lg bg-[#140e09] border border-[#5e472d]/70">
              <Trophy className="w-10 h-10 text-[#d9a441]/60 mx-auto mb-3" aria-hidden="true" />
              <h3 className="font-display text-base font-bold text-[#fff5e1]">
                No Records Carved Yet
              </h3>
              <p className="text-xs text-[#cbb694] mt-1 max-w-[360px] mx-auto">
                Finish a 3,000 m temple race and enter the winner’s name on the victory screen to claim the #1 fastest time.
              </p>
            </div>
          ) : (
            <ol className="space-y-2.5" aria-label="Top 5 fastest race entries">
              {entries.map((entry, idx) => {
                const rank = idx + 1;
                const charDef = getCharacterById(entry.characterId);
                const isFirst = rank === 1;
                return (
                  <li
                    key={entry.id}
                    className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border ${
                      isFirst
                        ? 'bg-[#2c200e] border-[#facc15] shadow-[0_0_16px_rgba(250,204,21,0.18)]'
                        : 'bg-[#22170e] border-[#5e472d]/80'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-md flex items-center justify-center font-mono-num text-sm font-extrabold shrink-0 ${
                          rank === 1
                            ? 'bg-[#facc15] text-[#1a1108]'
                            : rank === 2
                            ? 'bg-[#cbd5e1] text-[#1a1108]'
                            : rank === 3
                            ? 'bg-[#d97706] text-[#fff8eb]'
                            : 'bg-[#332417] text-[#e7d8be]'
                        }`}
                      >
                        {rank === 1 ? (
                          <Crown className="w-4 h-4" aria-hidden="true" />
                        ) : rank <= 3 ? (
                          <Medal className="w-4 h-4" aria-hidden="true" />
                        ) : (
                          `#${rank}`
                        )}
                      </div>

                      <div
                        className="w-9 h-9 rounded-md overflow-hidden border shrink-0 bg-[#120d09]"
                        style={{ borderColor: charDef.primaryHex }}
                      >
                        <CharacterPortrait
                          character={charDef}
                          customAsset={customAssets[charDef.id]}
                          fit="cover"
                          focus="top"
                          className="w-full h-full"
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-display text-sm font-bold text-[#fff8eb] truncate">
                            {entry.playerName}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#140e09] border border-[#d9a441]/35 text-[#fde68a] shrink-0">
                            {entry.mode === 'demo' ? 'Sprint' : 'Marathon'}
                          </span>
                        </div>
                        <div className="text-xs text-[#cbb694] truncate">
                          {entry.characterName} · {entry.riddlesCorrect}/{entry.riddlesTotal} Riddles
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`font-mono-num text-lg font-extrabold ${
                          isFirst ? 'text-[#facc15]' : 'text-[#5eead4]'
                        }`}
                      >
                        {formatRaceTime(entry.timeSeconds)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#150f09] border-t border-[#d9a441]/35">
          {entries.length > 0 ? (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#fca5a5] hover:text-white bg-[#2c1515] hover:bg-[#3f1c1c] border border-[#f87171]/40 rounded-md cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Clear Records</span>
            </button>
          ) : (
            <span className="text-xs text-[#a89375]">Fastest times automatically rank #1–#5</span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-bold text-[#1a1108] bg-[#eab308] hover:bg-[#facc15] rounded-md border border-[#fef08a] cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
