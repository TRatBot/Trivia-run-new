import React, { useEffect, useState } from 'react';
import {
  getCachedPortraitDataUrl,
  getCroppedPortraitDataUrl,
} from '../game/portraitCropper';
import { CharacterDef, CustomCharacterAsset } from '../game/types';

interface CharacterPortraitProps {
  character: CharacterDef;
  customAsset?: CustomCharacterAsset;
  alt?: string;
  className?: string;
  fit?: 'cover' | 'contain';
  focus?: 'top' | 'center';
}

/**
 * Renders either the player's custom uploaded picture or the exact cropped portrait
 * slice from the uploaded 6-character sheet without any aspect-ratio distortion.
 */
export const CharacterPortrait: React.FC<CharacterPortraitProps> = ({
  character,
  customAsset,
  alt,
  className = '',
  fit = 'cover',
  focus = 'top',
}) => {
  const [croppedUrl, setCroppedUrl] = useState<string | null>(() =>
    getCachedPortraitDataUrl(character.id),
  );

  useEffect(() => {
    if (customAsset?.kind === 'image') return;
    const cached = getCachedPortraitDataUrl(character.id);
    if (cached) {
      setCroppedUrl(cached);
      return;
    }
    let cancelled = false;
    getCroppedPortraitDataUrl(character)
      .then((url) => {
        if (!cancelled) setCroppedUrl(url);
      })
      .catch(() => {
        // Fallback color block remains visible if image fails to load
      });
    return () => {
      cancelled = true;
    };
  }, [character, customAsset]);

  const src = customAsset?.kind === 'image' ? customAsset.url : croppedUrl;
  const fitClass = fit === 'contain' ? 'object-contain' : 'object-cover';
  const posClass = focus === 'top' ? 'object-top' : 'object-center';

  if (!src) {
    return (
      <div
        className={`flex items-center justify-center font-display font-bold text-white/90 ${className}`}
        style={{ backgroundColor: character.primaryHex }}
        aria-label={alt ?? character.name}
      >
        {character.name.slice(0, 1)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt ?? `${character.name} (${character.title})`}
      referrerPolicy="no-referrer"
      className={`${fitClass} ${posClass} ${className}`}
    />
  );
};
