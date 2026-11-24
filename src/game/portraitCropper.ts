import { CharacterDef } from './types';

const imagePromiseCache = new Map<string, Promise<HTMLImageElement>>();
const croppedUrlCache = new Map<string, string>();
const croppedUrlPromiseCache = new Map<string, Promise<string>>();

export function loadSheetImage(url: string): Promise<HTMLImageElement> {
  const existing = imagePromiseCache.get(url);
  if (existing) return existing;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = url;
  });
  imagePromiseCache.set(url, promise);
  return promise;
}

export function getCachedPortraitDataUrl(characterId: string): string | null {
  return croppedUrlCache.get(characterId) ?? null;
}

/**
 * Crops the character's exact vertical panel from the uploaded character sheet
 * onto an offscreen canvas with zero aspect distortion and caches the result.
 */
export function getCroppedPortraitCanvas(
  img: HTMLImageElement,
  character: CharacterDef,
  targetAspect?: number,
): HTMLCanvasElement {
  const sx = Math.round(character.portraitCrop.x * img.naturalWidth);
  const sy = Math.round(character.portraitCrop.y * img.naturalHeight);
  const sw = Math.max(16, Math.round(character.portraitCrop.w * img.naturalWidth));
  const fullSh = Math.max(16, Math.round(character.portraitCrop.h * img.naturalHeight));

  // If a target aspect ratio (width / height) is given (e.g. 3D standee card),
  // crop from the top of the character panel so faces & proportions stay 100% un-stretched.
  const sh =
    targetAspect && targetAspect > 0
      ? Math.min(fullSh, Math.max(16, Math.round(sw / targetAspect)))
      : fullSh;

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  }
  return canvas;
}

export function getCroppedPortraitDataUrl(character: CharacterDef): Promise<string> {
  const cached = croppedUrlCache.get(character.id);
  if (cached) return Promise.resolve(cached);

  const pending = croppedUrlPromiseCache.get(character.id);
  if (pending) return pending;

  const promise = loadSheetImage(character.portraitUrl).then((img) => {
    const canvas = getCroppedPortraitCanvas(img, character);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    croppedUrlCache.set(character.id, dataUrl);
    return dataUrl;
  });

  croppedUrlPromiseCache.set(character.id, promise);
  return promise;
}
