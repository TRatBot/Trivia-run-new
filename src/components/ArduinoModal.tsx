import React, { useState } from 'react';
import { Copy, Check, Usb, X } from 'lucide-react';
import { ARDUINO_SKETCH_SNIPPET } from '../game/arduino';
import { ArduinoStatus, PlayerId } from '../game/types';

interface ArduinoModalProps {
  status: ArduinoStatus;
  onConnect: (playerId: PlayerId) => void;
  onDisconnect: (playerId: PlayerId) => void;
  onClose: () => void;
}

export const ArduinoModal: React.FC<ArduinoModalProps> = ({
  status,
  onConnect,
  onDisconnect,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(ARDUINO_SKETCH_SNIPPET).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div
      role="dialog"
      aria-label="Arduino Controller Setup"
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#140d07]/75 px-4"
    >
      <div className="w-full max-w-[640px] max-h-[90vh] overflow-y-auto bg-[#1b130c] border-2 border-[#d9a441] rounded-xl p-6 text-[#f8f1e4] shadow-2xl">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="font-display text-xl font-bold text-[#fff8eb]">
              Arduino &amp; Keyboard Controller Setup
            </h2>
            <p className="text-xs text-[#cbb694] mt-1">
              Connect USB Serial Arduino controllers (9600 baud), USB HID gamepads, or play immediately with keyboard backup.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close Arduino setup"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-[#2d2015] text-[#d6c3a3] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Player 1 & Player 2 Serial Connection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-4">
          {([0, 1] as PlayerId[]).map((pId) => {
            const connected = pId === 0 ? status.p1Connected : status.p2Connected;
            const label = pId === 0 ? status.p1Label : status.p2Label;
            const keys =
              pId === 0
                ? 'Backup Keys: A/D · W Jump · S/F Select'
                : 'Backup Keys: ←/→ · ↑ Jump · ↓/Enter Select';

            return (
              <div
                key={pId}
                className="bg-[#251a11] border border-[#664d32] rounded-lg p-3.5 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#fff5e1]">
                      Player {pId + 1} Controller
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        connected ? 'text-[#2dd4bf]' : 'text-[#b9a585]'
                      }`}
                    >
                      {connected ? 'Connected' : 'Ready for USB'}
                    </span>
                  </div>
                  <div className="text-xs text-[#cbb694] mt-1">{label}</div>
                  <div className="text-[11px] text-[#a89272] mt-1">{keys}</div>
                </div>

                {connected ? (
                  <button
                    type="button"
                    onClick={() => onDisconnect(pId)}
                    className="w-full py-2 text-xs font-semibold text-[#fecaca] bg-[#451a1a] hover:bg-[#5c2222] border border-[#ef4444]/60 rounded cursor-pointer"
                  >
                    Disconnect P{pId + 1} Serial
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!status.supported}
                    onClick={() => onConnect(pId)}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-[#1a1108] bg-[#eab308] hover:bg-[#facc15] disabled:opacity-45 disabled:cursor-not-allowed rounded cursor-pointer"
                  >
                    <Usb className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Connect P{pId + 1} Arduino (USB Serial)</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-xs text-[#d6c3a3] mb-4 flex flex-wrap items-center justify-between gap-2 border-y border-[#4a3723] py-2.5">
          <span>
            Last input: <strong className="text-[#fde68a]">{status.lastEvent}</strong>
          </span>
          <span>
            USB HID Gamepads detected: <strong className="font-mono-num">{status.gamepadCount}</strong>
          </span>
        </div>

        {/* Ready-to-upload Arduino Sketch Reference */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-[#fde68a]">
              Arduino Serial Protocol (send LEFT, RIGHT, JUMP, SELECT — or P1:LEFT / P2:JUMP)
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-[#f8f1e4] bg-[#2c1f14] hover:bg-[#3c2a1b] border border-[#6b5134] rounded cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#2dd4bf]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Sketch'}</span>
            </button>
          </div>
          <pre className="text-[11px] font-mono-num bg-[#120c07] border border-[#4a3723] rounded-lg p-3 overflow-x-auto text-[#e5d5bc] leading-relaxed">
            {ARDUINO_SKETCH_SNIPPET}
          </pre>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-bold text-[#1a1108] bg-[#eab308] hover:bg-[#facc15] rounded-md cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
