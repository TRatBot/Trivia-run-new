import React from 'react';
import { ImagePlus, RotateCcw, X } from 'lucide-react';
import { CHARACTERS } from '../game/data';
import { CharacterId, CustomCharacterAsset } from '../game/types';
import { CharacterPortrait } from './CharacterPortrait';

interface CustomModelsModalProps {
  customAssets: Partial<Record<CharacterId, CustomCharacterAsset>>;
  onUploadAsset: (charId: CharacterId, file: File) => void;
  onResetAsset: (charId: CharacterId) => void;
  onClose: () => void;
}

export const CustomModelsModal: React.FC<CustomModelsModalProps> = ({
  customAssets,
  onUploadAsset,
  onResetAsset,
  onClose,
}) => {
  return (
    <div
      role="dialog"
      aria-label="Custom Runner Models and Pictures"
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#140d07]/75 px-4"
    >
      <div className="w-full max-w-[680px] max-h-[90vh] overflow-y-auto bg-[#1b130c] border-2 border-[#d9a441] rounded-xl p-6 text-[#f8f1e4] shadow-2xl">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="font-display text-xl font-bold text-[#fff8eb]">
              Custom Runner Pictures &amp; 3D Models
            </h2>
            <p className="text-xs text-[#cbb694] mt-1">
              Swap any of the 6 runners with another character picture (.png, .jpg, .webp) or ready-made 3D model (.glb, .gltf).
            </p>
          </div>
          <button
            type="button"
            aria-label="Close custom models dialog"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-[#2d2015] text-[#d6c3a3] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {CHARACTERS.map((ch) => {
            const asset = customAssets[ch.id];
            const inputId = `upload-runner-${ch.id}`;

            return (
              <div
                key={ch.id}
                className="bg-[#251a11] border border-[#664d32] rounded-lg p-3.5 flex flex-col justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-16 rounded-md bg-[#16100a] border border-[#5c452d] flex items-center justify-center overflow-hidden shrink-0">
                    <CharacterPortrait
                      character={ch}
                      customAsset={asset}
                      fit="cover"
                      focus="top"
                      className="w-full h-full"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-[#fff5e1]">
                      {ch.name} · {ch.title}
                    </div>
                    <div className="text-xs text-[#cbb694] truncate">
                      {asset
                        ? `${asset.kind === 'glb' ? '3D Model' : 'Picture'}: ${asset.fileName}`
                        : 'Built-in 3D Character Model'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label
                    htmlFor={inputId}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-[#1a1108] bg-[#eab308] hover:bg-[#facc15] rounded cursor-pointer whitespace-nowrap"
                  >
                    <ImagePlus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{asset ? 'Replace Picture / GLB' : 'Upload Picture / GLB'}</span>
                  </label>
                  <input
                    id={inputId}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,.glb,.gltf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        onUploadAsset(ch.id, file);
                      }
                      e.target.value = '';
                    }}
                  />

                  {asset && (
                    <button
                      type="button"
                      aria-label={`Reset ${ch.name} to default`}
                      onClick={() => onResetAsset(ch.id)}
                      className="p-2 text-xs text-[#f8f1e4] bg-[#2e2015] hover:bg-[#3f2c1d] border border-[#6b5134] rounded cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
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
