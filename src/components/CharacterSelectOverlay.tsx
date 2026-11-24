import React from 'react';
import { Check, ImagePlus, Lock, Play, Sparkles, Usb } from 'lucide-react';
import { CHARACTERS } from '../game/data';
import {
  CharacterId,
  CustomCharacterAsset,
  HudSnapshot,
  PlayerId,
  RaceMode,
} from '../game/types';
import { CharacterPortrait } from './CharacterPortrait';

interface CharacterSelectOverlayProps {
  hud: HudSnapshot;
  customAssets: Partial<Record<CharacterId, CustomCharacterAsset>>;
  onSelectCard: (playerId: PlayerId, charIndex: number, lockImmediately: boolean) => void;
  onToggleLock: (playerId: PlayerId) => void;
  onPreviewJump: (playerId: PlayerId) => void;
  onStartRace: () => void;
  onChangeMode: (mode: RaceMode) => void;
  onBackToTitle: () => void;
  onOpenArduino: () => void;
  onOpenCustomModels: () => void;
}

export const CharacterSelectOverlay: React.FC<CharacterSelectOverlayProps> = ({
  hud,
  customAssets,
  onSelectCard,
  onToggleLock,
  onPreviewJump,
  onStartRace,
  onChangeMode,
  onBackToTitle,
  onOpenArduino,
  onOpenCustomModels,
}) => {
  const isCountdown = hud.phase === 'countdown';
  const bothLocked = hud.select.locked[0] && hud.select.locked[1] && !isCountdown;
  const p1Char = CHARACTERS[hud.select.cursors[0]];
  const p2Char = CHARACTERS[hud.select.cursors[1]];

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between">
      {/* Thin bronze split-screen divider */}
      <div
        className="fixed top-0 bottom-0 left-1/2 -translate-x-1/2 w-[3px] bg-[#d9a441]/75 pointer-events-none"
        aria-hidden="true"
      />

      {/* Top Bar: Back, Mode Segmented Control, Custom Models, Arduino */}
      <div className="relative z-10 flex items-center justify-between px-5 py-3.5 pointer-events-auto">
        <button
          type="button"
          onClick={onBackToTitle}
          className="px-4 py-2 text-sm font-semibold text-[#f8f1e4] bg-[#1e150e]/92 hover:bg-[#2d2015] border border-[#d9a441]/50 rounded-md cursor-pointer whitespace-nowrap"
        >
          Back
        </button>

        <div className="flex items-center gap-2.5 bg-[#1c140d]/95 border border-[#d9a441]/60 rounded-lg px-2 py-1.5 shadow-lg">
          <button
            type="button"
            onClick={() => onChangeMode('demo')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              hud.mode === 'demo'
                ? 'bg-[#eab308] text-[#1a1108]'
                : 'text-[#e8d9be] hover:text-white'
            }`}
          >
            Fair Sprint · 3,000 m (10 Riddles Each)
          </button>
          <button
            type="button"
            onClick={() => onChangeMode('full')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              hud.mode === 'full'
                ? 'bg-[#eab308] text-[#1a1108]'
                : 'text-[#e8d9be] hover:text-white'
            }`}
          >
            Full Marathon · 3,000 m (10 Riddles Each)
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenCustomModels}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-[#f8f1e4] bg-[#1e150e]/92 hover:bg-[#2d2015] border border-[#d9a441]/50 rounded-md cursor-pointer whitespace-nowrap"
          >
            <ImagePlus className="w-4 h-4 text-[#2dd4bf]" aria-hidden="true" />
            <span>Custom Models</span>
          </button>
          <button
            type="button"
            onClick={onOpenArduino}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-[#f8f1e4] bg-[#1e150e]/92 hover:bg-[#2d2015] border border-[#d9a441]/50 rounded-md cursor-pointer whitespace-nowrap"
          >
            <Usb className="w-4 h-4 text-[#facc15]" aria-hidden="true" />
            <span>Arduino</span>
          </button>
        </div>
      </div>

      {/* Middle Showcase Row: Outer Full-Art Portrait Previews flanking the unobstructed center 3D pedestals */}
      {!isCountdown && (
        <div className="relative flex-1 flex items-center justify-between px-5 py-2 min-h-0">
          {([0, 1] as PlayerId[]).map((pId) => {
            const char = CHARACTERS[hud.select.cursors[pId]];
            const isLocked = hud.select.locked[pId];
            const jumpKey = pId === 0 ? 'W' : '↑';

            return (
              <aside
                key={pId}
                aria-label={`Player ${pId + 1} live character preview`}
                data-testid={`player-preview-${pId}`}
                className="pointer-events-auto hidden lg:flex w-[206px] bg-[#19120c]/94 border-2 rounded-xl overflow-hidden shadow-[0_14px_34px_rgba(0,0,0,0.72)] flex-col"
                style={{ borderColor: isLocked ? '#2dd4bf' : char.primaryHex }}
              >
                <div className="relative h-[206px] w-full bg-[#110c08] overflow-hidden">
                  <CharacterPortrait
                    character={char}
                    customAsset={customAssets[char.id]}
                    fit="cover"
                    focus="top"
                    className="w-full h-full"
                  />
                  <div
                    className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#140e09] via-[#140e09]/75 to-transparent pointer-events-none"
                    aria-hidden="true"
                  />
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-[#140d08]/88 border border-[#d9a441]/50 text-[10px] font-bold uppercase tracking-wider text-[#fde68a]">
                      P{pId + 1} Preview
                    </span>
                    {isLocked && (
                      <span className="px-1.5 py-0.5 rounded bg-[#0f766e] text-[10px] font-bold uppercase text-white">
                        Ready
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-2 left-2.5 right-2.5">
                    <div className="font-display text-lg font-extrabold text-[#fff8eb] leading-tight">
                      {char.name}
                    </div>
                    <div className="text-[11px] font-semibold text-[#fde68a] truncate">
                      {char.title}
                    </div>
                  </div>
                </div>

                <div className="p-2.5 bg-[#1b130c] flex flex-col gap-2">
                  <p className="text-[11px] text-[#efe2cb] leading-snug italic">
                    “{char.summary}”
                  </p>
                  <button
                    type="button"
                    onClick={() => onPreviewJump(pId)}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 text-xs font-bold text-[#fff5e1] bg-[#2a1d13] hover:bg-[#3a281a] border border-[#d9a441]/55 rounded-md cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#facc15]" aria-hidden="true" />
                    <span>Preview Jump ({jumpKey})</span>
                  </button>
                </div>
              </aside>
            );
          })}

          {/* Centered Matchup Ready & Start Race CTA once both players preview and lock in */}
          {bothLocked && (
            <div
              role="region"
              aria-label="Both runners locked and ready to start"
              data-testid="start-race-banner"
              className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-[#1a120b]/96 border-2 border-[#facc15] rounded-xl px-6 py-4 text-center shadow-[0_18px_48px_rgba(0,0,0,0.88)] min-w-[310px]"
            >
              <div className="text-[11px] font-bold uppercase tracking-widest text-[#5eead4]">
                Both Runners Ready
              </div>
              <div className="mt-2 flex items-center justify-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-12 rounded-md overflow-hidden border border-[#facc15]/70 shrink-0">
                    <CharacterPortrait
                      character={p1Char}
                      customAsset={customAssets[p1Char.id]}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="text-left">
                    <div className="text-[10px] text-[#cbb694] uppercase font-bold">P1</div>
                    <div className="font-display text-sm font-bold text-[#fff8eb]">{p1Char.name}</div>
                  </div>
                </div>

                <span className="font-display text-base font-extrabold text-[#facc15] px-1">
                  VS
                </span>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-[10px] text-[#cbb694] uppercase font-bold">P2</div>
                    <div className="font-display text-sm font-bold text-[#fff8eb]">{p2Char.name}</div>
                  </div>
                  <div className="w-10 h-12 rounded-md overflow-hidden border border-[#2dd4bf]/70 shrink-0">
                    <CharacterPortrait
                      character={p2Char}
                      customAsset={customAssets[p2Char.id]}
                      className="w-full h-full"
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                data-start="true"
                onClick={onStartRace}
                className="mt-3.5 w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-extrabold text-[#1a1108] bg-[#eab308] hover:bg-[#facc15] border border-[#fef08a] rounded-lg shadow-lg cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                <span>Start Race!</span>
              </button>
              <div className="mt-1.5 text-[11px] text-[#cbb694]">
                Press Space / Enter to start · or click Unlock to swap
              </div>
            </div>
          )}
        </div>
      )}

      {/* Countdown Banner Overlay */}
      {isCountdown && (
        <div className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-[#140d07]/45 pointer-events-none">
          <div className="bg-[#1b130c]/95 border-2 border-[#eab308] rounded-xl px-14 py-8 text-center shadow-2xl">
            <div className="text-sm font-bold tracking-widest uppercase text-[#fde68a]">
              Temple Gates Opening
            </div>
            <div className="font-display text-8xl font-extrabold text-[#facc15] mt-1 font-mono-num">
              {hud.countdownValue > 0 ? hud.countdownValue : 'GO!'}
            </div>
            <div className="text-sm text-[#e7d8be] mt-2">
              {hud.players[0].characterName} vs {hud.players[1].characterName}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Split-Screen 6-Character Picker Dock */}
      <div className="grid grid-cols-2 gap-6 px-5 pb-4">
        {([0, 1] as PlayerId[]).map((pId) => {
          const otherId: PlayerId = pId === 0 ? 1 : 0;
          const cursorIdx = hud.select.cursors[pId];
          const isLocked = hud.select.locked[pId];
          const currentChar = CHARACTERS[cursorIdx];
          const controlsText =
            pId === 0
              ? 'A / D Preview · W Test Jump · S or F Lock In'
              : '← / → Preview · ↑ Test Jump · ↓ or Enter Lock In';

          return (
            <section
              key={pId}
              aria-label={`Player ${pId + 1} character selection`}
              className="pointer-events-auto bg-[#1b130c]/94 border border-[#d9a441]/55 rounded-xl p-3.5 shadow-xl"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <h2 className="font-display text-base font-bold text-[#fff5e1] truncate">
                    Player {pId + 1} · {currentChar.name} ({currentChar.title})
                  </h2>
                  <p className="text-xs text-[#f2dfb8] leading-snug mt-0.5 line-clamp-2 italic">
                    “{currentChar.summary}”
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleLock(pId)}
                  className={`px-3.5 py-2 text-xs font-bold rounded-md border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    isLocked
                      ? 'bg-[#0f766e] text-white border-[#5eead4] hover:bg-[#115e59]'
                      : 'bg-[#eab308] text-[#1a1108] border-[#fef08a] hover:bg-[#facc15]'
                  }`}
                >
                  {isLocked ? 'Unlock / Change' : `Lock In ${currentChar.name}`}
                </button>
              </div>

              {/* 7 Unique Teacher Portrait Buttons (click previews immediately without auto-starting!) */}
              <div className="grid grid-cols-4 xl:grid-cols-7 gap-1.5">
                {CHARACTERS.map((ch, idx) => {
                  const isSelected = cursorIdx === idx;
                  const takenByOpponent =
                    hud.select.locked[otherId] && hud.select.cursors[otherId] === idx;

                  return (
                    <button
                      key={ch.id}
                      type="button"
                      disabled={takenByOpponent || isCountdown}
                      aria-label={`Player ${pId + 1} preview ${ch.name} the ${ch.title}${
                        takenByOpponent ? ' (taken)' : ''
                      }`}
                      onClick={() => onSelectCard(pId, idx, false)}
                      className={`relative text-left p-1.5 rounded-lg border transition-transform cursor-pointer flex flex-col ${
                        takenByOpponent
                          ? 'bg-[#17110c]/70 border-[#4a3b2c]/50 opacity-45 cursor-not-allowed'
                          : isSelected
                          ? isLocked
                            ? 'bg-[#123c36] border-[#2dd4bf] ring-2 ring-[#2dd4bf]/70'
                            : 'bg-[#312214] border-[#facc15] ring-2 ring-[#facc15]/65 -translate-y-0.5'
                          : 'bg-[#241910] border-[#664d32] hover:border-[#d9a441]'
                      }`}
                    >
                      <div className="relative w-full aspect-[3/4] rounded-md overflow-hidden bg-[#120d09] mb-1.5 border border-white/10">
                        <CharacterPortrait
                          character={ch}
                          customAsset={customAssets[ch.id]}
                          fit="cover"
                          focus="top"
                          className="w-full h-full"
                        />
                        {takenByOpponent && (
                          <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                            <Lock className="w-4 h-4 text-[#fde68a]" aria-hidden="true" />
                          </div>
                        )}
                        {!takenByOpponent && isSelected && isLocked && (
                          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#0f766e] border border-[#5eead4] flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" aria-hidden="true" />
                          </div>
                        )}
                      </div>
                      <div className="text-[11px] font-bold text-[#fff6e5] leading-tight truncate">
                        {ch.name}
                      </div>
                      <div className="text-[10px] text-[#cbb694] truncate">
                        {takenByOpponent ? `P${otherId + 1} Pick` : ch.title}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] text-[#cbb694]">
                <span>{controlsText}</span>
                <span className="font-semibold text-[#fde68a]">
                  {isLocked ? 'Locked & Ready' : 'Previewing · Click Lock In when ready'}
                </span>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
