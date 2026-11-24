import * as THREE from 'three';
import { CharacterDef, CharacterId } from '../game/types';
import { ProceduralTexturePack } from './textures';
import type { AnimatedRunnerRig } from './models';

const pixelTexCache = new Map<string, THREE.CanvasTexture>();

function createPixelCanvasTexture(
  key: string,
  width: number,
  height: number,
  painter: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): THREE.CanvasTexture {
  const cached = pixelTexCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  painter(ctx, width, height);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  pixelTexCache.set(key, tex);
  return tex;
}

function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
}

function makePixelMat(
  tex: THREE.CanvasTexture,
  roughness = 0.72,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: tex,
    roughness,
    metalness: 0.04,
  });
}

function makeSolidPixelMat(
  color: number | string,
  roughness = 0.72,
  metalness = 0.05,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
  });
}

interface TeacherStyleSpec {
  skinHex: string;
  skinShadowHex: string;
  skinBlushHex: string;
  hairHex: string;
  hairShadeHex: string;
  hairHighlightHex: string;
  lipHex: string;
  mustache: boolean;
  femaleFace: boolean;
  earrings?: 'hoop' | 'pearl';
  glassesOnHead?: boolean;
  hairStyle: 'ponytail' | 'short_wavy' | 'center_part' | 'long_curly_clip' | 'short_neat' | 'bob' | 'top_bun';
  skirtKind: 'none' | 'maxi_floral' | 'midi_olive';
  pantsHex: string;
  pantsShadeHex: string;
  shoeHex: string;
  shoeSoleHex: string;
  shoeLaces?: boolean;
  shoeStyle: 'sandal' | 'dress' | 'sneaker' | 'flat' | 'maryjane';
  rolledSleeves?: boolean;
  watchColor?: 'silver' | 'brown';
}

const TEACHER_SPECS: Record<CharacterId, TeacherStyleSpec> = {
  moitrey: {
    skinHex: '#cc987b',
    skinShadowHex: '#b37e61',
    skinBlushHex: '#d48d7a',
    hairHex: '#18181b',
    hairShadeHex: '#0d0d10',
    hairHighlightHex: '#2f2f36',
    lipHex: '#9e4747',
    mustache: false,
    femaleFace: true,
    earrings: 'hoop',
    hairStyle: 'ponytail',
    skirtKind: 'none',
    pantsHex: '#18181c',
    pantsShadeHex: '#101014',
    shoeHex: '#dfd1ba',
    shoeSoleHex: '#8c775c',
    shoeStyle: 'sandal',
  },
  anowar: {
    skinHex: '#b88265',
    skinShadowHex: '#9c694e',
    skinBlushHex: '#be7d65',
    hairHex: '#1c1917',
    hairShadeHex: '#100e0d',
    hairHighlightHex: '#332d29',
    lipHex: '#8c5345',
    mustache: false,
    femaleFace: false,
    hairStyle: 'short_wavy',
    skirtKind: 'none',
    pantsHex: '#2c3038',
    pantsShadeHex: '#1f2229',
    shoeHex: '#4f301b',
    shoeSoleHex: '#24140a',
    shoeStyle: 'dress',
  },
  shubham: {
    skinHex: '#c28d70',
    skinShadowHex: '#a57256',
    skinBlushHex: '#c9886e',
    hairHex: '#1d1917',
    hairShadeHex: '#110f0e',
    hairHighlightHex: '#362e2a',
    lipHex: '#8d5347',
    mustache: true,
    femaleFace: false,
    hairStyle: 'center_part',
    skirtKind: 'none',
    pantsHex: '#2e3238',
    pantsShadeHex: '#202328',
    shoeHex: '#5f7b96',
    shoeSoleHex: '#f1f5f9',
    shoeLaces: true,
    shoeStyle: 'sneaker',
    watchColor: 'silver',
  },
  christina: {
    skinHex: '#c99479',
    skinShadowHex: '#ae7a60',
    skinBlushHex: '#d98c7c',
    hairHex: '#1f1815',
    hairShadeHex: '#140f0d',
    hairHighlightHex: '#7d3927',
    lipHex: '#b35558',
    mustache: false,
    femaleFace: true,
    earrings: 'pearl',
    hairStyle: 'long_curly_clip',
    skirtKind: 'maxi_floral',
    pantsHex: '#1e3a5f',
    pantsShadeHex: '#152945',
    shoeHex: '#3d4735',
    shoeSoleHex: '#23291e',
    shoeStyle: 'flat',
  },
  muktar: {
    skinHex: '#bb8569',
    skinShadowHex: '#9e6b51',
    skinBlushHex: '#c38068',
    hairHex: '#18181b',
    hairShadeHex: '#0e0e11',
    hairHighlightHex: '#2e2e34',
    lipHex: '#8f5548',
    mustache: false,
    femaleFace: false,
    hairStyle: 'short_neat',
    skirtKind: 'none',
    pantsHex: '#3c2b23',
    pantsShadeHex: '#2b1e18',
    shoeHex: '#18181c',
    shoeSoleHex: '#f8fafc',
    shoeStyle: 'sneaker',
  },
  veravole: {
    skinHex: '#dbb298',
    skinShadowHex: '#bf9479',
    skinBlushHex: '#e29f90',
    hairHex: '#151519',
    hairShadeHex: '#0b0b0e',
    hairHighlightHex: '#2c2c34',
    lipHex: '#a84f53',
    mustache: false,
    femaleFace: true,
    glassesOnHead: true,
    hairStyle: 'bob',
    skirtKind: 'none',
    pantsHex: '#16161b',
    pantsShadeHex: '#0e0e12',
    shoeHex: '#18181b',
    shoeSoleHex: '#0c0c0f',
    shoeStyle: 'maryjane',
  },
  inzui: {
    skinHex: '#d4a58b',
    skinShadowHex: '#b98970',
    skinBlushHex: '#dc9986',
    hairHex: '#17171b',
    hairShadeHex: '#0d0d10',
    hairHighlightHex: '#2d2d35',
    lipHex: '#aa5758',
    mustache: false,
    femaleFace: true,
    hairStyle: 'top_bun',
    skirtKind: 'midi_olive',
    pantsHex: '#3a3f32',
    pantsShadeHex: '#2a2e24',
    shoeHex: '#16161a',
    shoeSoleHex: '#0d0d10',
    shoeStyle: 'flat',
    rolledSleeves: true,
    watchColor: 'brown',
  },
};

function createTeacherFaceTexture(id: CharacterId, spec: TeacherStyleSpec): THREE.CanvasTexture {
  return createPixelCanvasTexture(`teacher_face_${id}`, 16, 16, (ctx) => {
    // Base skin
    px(ctx, 0, 0, 16, 16, spec.skinHex);
    // Subtle cheek/chin pixel shading for 2.5D depth
    px(ctx, 0, 0, 1, 16, spec.skinShadowHex);
    px(ctx, 15, 0, 1, 16, spec.skinShadowHex);
    px(ctx, 1, 14, 14, 2, spec.skinShadowHex);
    px(ctx, 2, 13, 12, 1, spec.skinHex);

    // Forehead hairline tailored to each teacher
    if (spec.hairStyle === 'center_part') {
      px(ctx, 0, 0, 16, 2, spec.hairHex);
      px(ctx, 0, 2, 7, 2, spec.hairHex);
      px(ctx, 9, 2, 7, 2, spec.hairHex);
      px(ctx, 0, 4, 2, 2, spec.hairHex);
      px(ctx, 14, 4, 2, 2, spec.hairHex);
      px(ctx, 3, 1, 3, 1, spec.hairHighlightHex);
      px(ctx, 10, 1, 3, 1, spec.hairHighlightHex);
    } else if (spec.hairStyle === 'short_neat') {
      // Higher neat forehead like Sir Muktar
      px(ctx, 0, 0, 16, 2, spec.hairHex);
      px(ctx, 0, 2, 2, 2, spec.hairHex);
      px(ctx, 14, 2, 2, 2, spec.hairHex);
    } else if (spec.hairStyle === 'short_wavy') {
      px(ctx, 0, 0, 16, 3, spec.hairHex);
      px(ctx, 2, 3, 3, 1, spec.hairHex);
      px(ctx, 7, 3, 4, 1, spec.hairHex);
      px(ctx, 0, 3, 2, 3, spec.hairHex);
      px(ctx, 14, 3, 2, 3, spec.hairHex);
      px(ctx, 4, 1, 4, 1, spec.hairHighlightHex);
    } else if (spec.hairStyle === 'bob') {
      px(ctx, 0, 0, 16, 2, spec.hairHex);
      px(ctx, 0, 2, 2, 10, spec.hairHex);
      px(ctx, 14, 2, 2, 10, spec.hairHex);
      px(ctx, 2, 2, 1, 3, spec.hairHex);
      px(ctx, 13, 2, 1, 3, spec.hairHex);
    } else if (spec.hairStyle === 'long_curly_clip') {
      px(ctx, 0, 0, 16, 2, spec.hairHex);
      px(ctx, 0, 2, 2, 8, spec.hairHex);
      px(ctx, 14, 2, 2, 8, spec.hairHex);
      px(ctx, 2, 2, 2, 1, spec.hairHex);
      px(ctx, 12, 2, 2, 1, spec.hairHex);
    } else {
      // Pulled-back neat hairline (ponytail / top bun)
      px(ctx, 0, 0, 16, 2, spec.hairHex);
      px(ctx, 0, 2, 2, 3, spec.hairHex);
      px(ctx, 14, 2, 2, 3, spec.hairHex);
    }

    // Eyebrows
    px(ctx, 3, 6, 3, 1, spec.hairShadeHex);
    px(ctx, 10, 6, 3, 1, spec.hairShadeHex);

    // Crisp pixel eyes with tiny white catchlight
    px(ctx, 3, 7, 3, 2, '#f8fafc');
    px(ctx, 4, 7, 2, 2, '#1e1612');
    px(ctx, 4, 7, 1, 1, '#ffffff');

    px(ctx, 10, 7, 3, 2, '#f8fafc');
    px(ctx, 10, 7, 2, 2, '#1e1612');
    px(ctx, 10, 7, 1, 1, '#ffffff');

    if (spec.femaleFace) {
      // Eyelash corner pixel & gentle blush
      px(ctx, 3, 7, 1, 1, '#18181b');
      px(ctx, 12, 7, 1, 1, '#18181b');
      px(ctx, 2, 9, 2, 1, spec.skinBlushHex);
      px(ctx, 12, 9, 2, 1, spec.skinBlushHex);
    }

    // Nose pixel
    px(ctx, 7, 9, 2, 1, spec.skinShadowHex);

    // Mustache for Sir Shubham
    if (spec.mustache) {
      px(ctx, 5, 10, 6, 1, '#1e1613');
      px(ctx, 6, 11, 1, 1, '#1e1613');
      px(ctx, 9, 11, 1, 1, '#1e1613');
      // Smile beneath mustache
      px(ctx, 6, 12, 4, 1, spec.lipHex);
    } else if (id === 'christina') {
      // Bright open joyful smile
      px(ctx, 5, 11, 6, 1, spec.lipHex);
      px(ctx, 6, 11, 4, 1, '#ffffff');
      px(ctx, 6, 12, 4, 1, spec.lipHex);
    } else {
      // Warm pixel smile
      px(ctx, 6, 11, 4, 1, spec.lipHex);
      px(ctx, 5, 11, 1, 1, spec.skinShadowHex);
      px(ctx, 10, 11, 1, 1, spec.skinShadowHex);
    }
  });
}

function createTeacherTorsoFrontTexture(id: CharacterId, spec: TeacherStyleSpec): THREE.CanvasTexture {
  return createPixelCanvasTexture(`teacher_torso_front_${id}`, 16, 20, (ctx) => {
    if (id === 'moitrey') {
      // Bright crimson-red knit cardigan with crisp white pearl buttons
      px(ctx, 0, 0, 16, 20, '#dc2626');
      // Subtle pixel knit ribs & shading
      for (let y = 0; y < 20; y += 2) {
        px(ctx, 0, y, 16, 1, '#c81e1e');
      }
      px(ctx, 0, 0, 1, 20, '#991b1b');
      px(ctx, 15, 0, 1, 20, '#991b1b');
      // V-neck collar showing warm skin + inner dark tee edge
      px(ctx, 5, 0, 6, 2, spec.skinHex);
      px(ctx, 6, 2, 4, 2, spec.skinHex);
      px(ctx, 7, 4, 2, 1, '#1c1917');
      // Center placket & white pearl buttons
      px(ctx, 7, 5, 2, 15, '#b91c1c');
      for (const by of [6, 9, 12, 15, 18]) {
        px(ctx, 7, by, 2, 1, '#fff8f0');
      }
      // Ribbed bottom hem
      px(ctx, 0, 18, 16, 2, '#b91c1c');
      px(ctx, 7, 18, 2, 1, '#fff8f0');
    } else if (id === 'anowar') {
      // Dark charcoal-navy quilted zip jacket worn open over red-and-white plaid shirt
      px(ctx, 0, 0, 16, 20, '#2b3442');
      // Quilted jacket seams
      for (let y = 3; y < 19; y += 4) {
        px(ctx, 0, y, 5, 1, '#1e2530');
        px(ctx, 11, y, 5, 1, '#1e2530');
      }
      // Red-and-white checkered plaid shirt down the open center
      for (let y = 0; y < 19; y++) {
        for (let x = 5; x < 11; x++) {
          const isRed = (x + y) % 2 === 0;
          px(ctx, x, y, 1, 1, isRed ? '#b91c1c' : '#f1f5f9');
        }
      }
      // Shirt collar V at top
      px(ctx, 6, 0, 4, 2, spec.skinHex);
      px(ctx, 5, 0, 1, 3, '#f8fafc');
      px(ctx, 10, 0, 1, 3, '#f8fafc');
      // Jacket zipper edges
      px(ctx, 4, 0, 1, 20, '#475569');
      px(ctx, 11, 0, 1, 20, '#475569');
      // Side pockets
      px(ctx, 1, 13, 3, 1, '#181e27');
      px(ctx, 12, 13, 3, 1, '#181e27');
    } else if (id === 'shubham') {
      // Tan/khaki zip bomber jacket with caramel collar, left-chest mountain patch, olive polo underneath
      px(ctx, 0, 0, 16, 20, '#c29b6c');
      px(ctx, 0, 0, 1, 18, '#a67f52');
      px(ctx, 15, 0, 1, 18, '#a67f52');
      // Olive-sage polo shirt peeking at center and bottom hem!
      px(ctx, 6, 0, 4, 17, '#8f9779');
      px(ctx, 7, 1, 2, 3, '#747c61');
      px(ctx, 0, 17, 16, 3, '#8f9779');
      px(ctx, 0, 19, 16, 1, '#757d62');
      // Neck opening
      px(ctx, 7, 0, 2, 1, spec.skinHex);
      // Warm caramel collar flaps
      px(ctx, 4, 0, 2, 3, '#d99862');
      px(ctx, 10, 0, 2, 3, '#d99862');
      // Jacket vertical zip seam
      px(ctx, 5, 3, 1, 14, '#9b764b');
      px(ctx, 10, 3, 1, 14, '#9b764b');
      // Left-chest circular mountain emblem patch (viewer right = x 11..14)
      px(ctx, 11, 4, 3, 3, '#2d241e');
      px(ctx, 12, 4, 1, 1, '#f8fafc');
      px(ctx, 11, 5, 3, 1, '#e2e8f0');
      // Flap pockets
      px(ctx, 1, 11, 4, 2, '#ab8457');
      px(ctx, 11, 11, 4, 2, '#ab8457');
    } else if (id === 'christina') {
      // Cream/ivory open cardigan over navy-blue & white daisy-floral dress
      px(ctx, 0, 0, 16, 20, '#f3ece0');
      px(ctx, 0, 0, 1, 20, '#dfd4c1');
      px(ctx, 15, 0, 1, 20, '#dfd4c1');
      // Open front revealing navy floral dress bodice
      px(ctx, 5, 0, 6, 20, '#1e3a5f');
      px(ctx, 6, 0, 4, 2, spec.skinHex);
      // Crisp white pixel daisies on navy bodice
      for (const [fx, fy] of [
        [6, 5],
        [9, 7],
        [7, 10],
        [9, 13],
        [6, 16],
        [9, 18],
      ]) {
        px(ctx, fx, fy, 1, 1, '#f8fafc');
        px(ctx, fx + 1, fy + 1, 1, 1, '#93c5fd');
      }
      // Soft cardigan vertical edges
      px(ctx, 4, 0, 1, 20, '#e3d8c6');
      px(ctx, 11, 0, 1, 20, '#e3d8c6');
    } else if (id === 'muktar') {
      // Dark charcoal zip windbreaker with tiny white chest emblem + coral-pink polo collar & bottom hem
      px(ctx, 0, 0, 16, 20, '#27272c');
      px(ctx, 0, 0, 1, 17, '#1b1b20');
      px(ctx, 15, 0, 1, 17, '#1b1b20');
      // Coral-pink polo collar peeking at neck
      px(ctx, 5, 0, 6, 3, '#e16b73');
      px(ctx, 6, 0, 4, 1, spec.skinHex);
      // Center zipper line
      px(ctx, 7, 3, 2, 14, '#18181c');
      // Small white left-chest emblem (viewer right)
      px(ctx, 11, 5, 2, 1, '#f8fafc');
      // Coral-pink shirt hem peeking out cleanly at the bottom!
      px(ctx, 0, 17, 16, 3, '#e16b73');
      px(ctx, 0, 19, 16, 1, '#c9565e');
    } else if (id === 'veravole') {
      // Taupe & white horizontal-striped open cardigan (solid taupe top yoke & bottom hem) over black mock-neck top
      px(ctx, 0, 0, 16, 20, '#a69083');
      // Crisp white horizontal stripes across middle torso (y = 5..16)
      for (let y = 5; y <= 16; y += 2) {
        px(ctx, 0, y, 16, 1, '#f5f0e8');
      }
      // Solid taupe bottom hem
      px(ctx, 0, 17, 16, 3, '#a69083');
      px(ctx, 0, 19, 16, 1, '#8c776b');
      // Black mock-neck inner top down center front
      px(ctx, 6, 0, 4, 20, '#16161b');
      px(ctx, 5, 0, 6, 2, '#16161b');
      // Tiny cardigan buttons along right edge of opening
      for (const by of [6, 10, 14, 18]) {
        px(ctx, 10, by, 1, 1, '#4a3d35');
      }
    } else {
      // Miss Inzui: Black quilted sleeveless puffer vest worn open over crisp white collared button-up shirt
      px(ctx, 0, 0, 16, 20, '#18181c');
      // Horizontal quilting seams on black vest
      for (let y = 4; y < 19; y += 4) {
        px(ctx, 1, y, 4, 1, '#2c2c34');
        px(ctx, 11, y, 4, 1, '#2c2c34');
      }
      // Crisp white collared button-up shirt down center
      px(ctx, 5, 0, 6, 20, '#f8fafc');
      px(ctx, 6, 0, 4, 2, spec.skinHex);
      px(ctx, 5, 1, 2, 2, '#e2e8f0');
      px(ctx, 9, 1, 2, 2, '#e2e8f0');
      // Subtle shirt placket & buttons
      px(ctx, 7, 4, 1, 16, '#cbd5e1');
      for (const by of [5, 9, 13, 17]) {
        px(ctx, 7, by, 1, 1, '#94a3b8');
      }
    }
  });
}

function createTeacherTorsoBackTexture(id: CharacterId): THREE.CanvasTexture {
  return createPixelCanvasTexture(`teacher_torso_back_${id}`, 16, 20, (ctx) => {
    if (id === 'moitrey') {
      // Solid bright crimson-red knit cardigan back
      px(ctx, 0, 0, 16, 20, '#dc2626');
      for (let y = 0; y < 20; y += 2) {
        px(ctx, 0, y, 16, 1, '#c81e1e');
      }
      px(ctx, 0, 0, 1, 20, '#991b1b');
      px(ctx, 15, 0, 1, 20, '#991b1b');
      px(ctx, 0, 18, 16, 2, '#b91c1c');
    } else if (id === 'anowar') {
      // Solid dark charcoal-navy quilted jacket back
      px(ctx, 0, 0, 16, 20, '#2b3442');
      for (let y = 3; y < 19; y += 4) {
        px(ctx, 1, y, 14, 1, '#1e2530');
      }
      px(ctx, 0, 0, 16, 2, '#1e2530');
      px(ctx, 0, 18, 16, 2, '#1c222c');
    } else if (id === 'shubham') {
      // Tan/khaki bomber back with caramel collar band, horizontal back seam, subtle sunburst patch, & olive shirt hem peeking!
      px(ctx, 0, 0, 16, 17, '#c29b6c');
      px(ctx, 3, 0, 10, 2, '#d99862'); // caramel collar back
      px(ctx, 0, 6, 16, 1, '#a67f52'); // horizontal upper back yoke seam
      // Iconic stitched sunburst/compass back patch
      px(ctx, 6, 7, 4, 4, '#d6b282');
      px(ctx, 7, 8, 2, 2, '#8b663f');
      px(ctx, 7, 6, 2, 1, '#e6c99f');
      px(ctx, 7, 11, 2, 1, '#e6c99f');
      // Olive polo hem peeking below jacket
      px(ctx, 0, 17, 16, 3, '#8f9779');
      px(ctx, 0, 19, 16, 1, '#757d62');
    } else if (id === 'christina') {
      // Cream/ivory knit cardigan back
      px(ctx, 0, 0, 16, 20, '#f3ece0');
      for (let y = 2; y < 19; y += 3) {
        px(ctx, 1, y, 14, 1, '#e6dccb');
      }
      px(ctx, 0, 0, 1, 20, '#d8ccb8');
      px(ctx, 15, 0, 1, 20, '#d8ccb8');
    } else if (id === 'muktar') {
      // Dark charcoal windbreaker back + coral-pink shirt hem peeking cleanly!
      px(ctx, 0, 0, 16, 17, '#27272c');
      px(ctx, 0, 0, 16, 2, '#1b1b20');
      px(ctx, 1, 6, 14, 1, '#1e1e23');
      px(ctx, 0, 17, 16, 3, '#e16b73');
      px(ctx, 0, 19, 16, 1, '#c9565e');
    } else if (id === 'veravole') {
      // Solid taupe upper shoulder yoke + crisp taupe/white horizontal stripes + solid taupe bottom hem
      px(ctx, 0, 0, 16, 20, '#a69083');
      for (let y = 5; y <= 16; y += 2) {
        px(ctx, 0, y, 16, 1, '#f5f0e8');
      }
      px(ctx, 0, 17, 16, 3, '#a69083');
      px(ctx, 0, 19, 16, 1, '#8c776b');
    } else {
      // Miss Inzui: Black quilted puffer vest back
      px(ctx, 0, 0, 16, 20, '#18181c');
      for (let y = 4; y < 19; y += 4) {
        px(ctx, 1, y, 14, 1, '#2c2c34');
      }
      px(ctx, 3, 0, 10, 2, '#24242b'); // stand-up vest collar
    }
  });
}

function createTeacherSleeveTexture(
  id: CharacterId,
  spec: TeacherStyleSpec,
  isLeftArm: boolean,
): THREE.CanvasTexture {
  return createPixelCanvasTexture(`teacher_sleeve_${id}_${isLeftArm ? 'L' : 'R'}`, 8, 16, (ctx) => {
    if (id === 'moitrey') {
      px(ctx, 0, 0, 8, 12, '#dc2626');
      for (let y = 0; y < 12; y += 2) px(ctx, 0, y, 8, 1, '#c81e1e');
      px(ctx, 0, 12, 8, 4, spec.skinHex);
    } else if (id === 'anowar') {
      px(ctx, 0, 0, 8, 12, '#2b3442');
      px(ctx, 0, 4, 8, 1, '#1e2530');
      px(ctx, 0, 8, 8, 1, '#1e2530');
      px(ctx, 0, 12, 8, 4, spec.skinHex);
    } else if (id === 'shubham') {
      px(ctx, 0, 0, 8, 11, '#c29b6c');
      px(ctx, 0, 10, 8, 1, '#a67f52'); // cuff
      px(ctx, 0, 11, 8, 5, spec.skinHex);
      if (isLeftArm && spec.watchColor === 'silver') {
        px(ctx, 0, 11, 8, 2, '#cbd5e1');
        px(ctx, 2, 11, 4, 2, '#334155'); // digital watch face
      }
    } else if (id === 'christina') {
      px(ctx, 0, 0, 8, 12, '#f3ece0');
      px(ctx, 0, 11, 8, 1, '#dcd0bc');
      px(ctx, 0, 12, 8, 4, spec.skinHex);
    } else if (id === 'muktar') {
      px(ctx, 0, 0, 8, 12, '#27272c');
      px(ctx, 0, 11, 8, 1, '#18181c');
      px(ctx, 0, 12, 8, 4, spec.skinHex);
    } else if (id === 'veravole') {
      // Solid taupe shoulder cap + taupe/white horizontal stripes down sleeve!
      px(ctx, 0, 0, 8, 12, '#a69083');
      for (let y = 3; y <= 10; y += 2) {
        px(ctx, 0, y, 8, 1, '#f5f0e8');
      }
      px(ctx, 0, 11, 8, 1, '#8c776b');
      px(ctx, 0, 12, 8, 4, spec.skinHex);
    } else {
      // Miss Inzui: Crisp white shirt sleeve rolled up to mid-forearm + brown leather watch on left wrist
      px(ctx, 0, 0, 8, 9, '#f8fafc');
      px(ctx, 0, 8, 8, 1, '#cbd5e1'); // rolled cuff
      px(ctx, 0, 9, 8, 7, spec.skinHex);
      if (isLeftArm && spec.watchColor === 'brown') {
        px(ctx, 0, 12, 8, 2, '#6b4226');
        px(ctx, 2, 12, 3, 2, '#d4af37'); // watch dial
      }
    }
  });
}

function createTeacherLegTexture(id: CharacterId, spec: TeacherStyleSpec): THREE.CanvasTexture {
  return createPixelCanvasTexture(`teacher_leg_${id}`, 8, 16, (ctx) => {
    if (spec.skirtKind === 'midi_olive') {
      // Olive skirt covers top, warm skin calves below, black flat shoe at bottom
      px(ctx, 0, 0, 8, 9, spec.pantsHex);
      px(ctx, 0, 9, 8, 4, spec.skinHex);
      px(ctx, 0, 13, 8, 2, spec.shoeHex);
      px(ctx, 0, 15, 8, 1, spec.shoeSoleHex);
    } else if (spec.skirtKind === 'maxi_floral') {
      // Navy floral dress reaches low ankle + dark olive flat
      px(ctx, 0, 0, 8, 12, '#1e3a5f');
      px(ctx, 2, 3, 1, 1, '#f8fafc');
      px(ctx, 5, 7, 1, 1, '#f8fafc');
      px(ctx, 3, 10, 1, 1, '#93c5fd');
      px(ctx, 0, 12, 8, 1, spec.skinHex);
      px(ctx, 0, 13, 8, 2, spec.shoeHex);
      px(ctx, 0, 15, 8, 1, spec.shoeSoleHex);
    } else {
      // Full-length trousers + distinct footwear
      px(ctx, 0, 0, 8, 13, spec.pantsHex);
      px(ctx, 0, 0, 1, 13, spec.pantsShadeHex);
      px(ctx, 7, 0, 1, 13, spec.pantsShadeHex);
      if (id === 'shubham') {
        // Subtle faded jeans highlight
        px(ctx, 2, 3, 4, 6, '#3b414a');
      }
      if (spec.shoeStyle === 'sandal') {
        px(ctx, 0, 13, 8, 1, spec.skinHex);
        px(ctx, 1, 14, 6, 1, spec.shoeHex);
        px(ctx, 0, 15, 8, 1, spec.shoeSoleHex);
      } else if (spec.shoeStyle === 'maryjane') {
        px(ctx, 0, 13, 8, 1, spec.skinHex);
        px(ctx, 2, 13, 4, 1, spec.shoeHex); // Mary-Jane strap
        px(ctx, 0, 14, 8, 2, spec.shoeHex);
      } else {
        px(ctx, 0, 13, 8, 2, spec.shoeHex);
        if (spec.shoeLaces) {
          px(ctx, 3, 13, 2, 2, '#f8fafc');
        }
        px(ctx, 0, 15, 8, 1, spec.shoeSoleHex);
      }
    }
  });
}

function createFloralSkirtTexture(): THREE.CanvasTexture {
  return createPixelCanvasTexture('teacher_skirt_christina', 24, 20, (ctx) => {
    px(ctx, 0, 0, 24, 20, '#1e3a5f');
    // Subtle tiered maxi pleats
    px(ctx, 0, 6, 24, 1, '#162c49');
    px(ctx, 0, 13, 24, 1, '#162c49');
    for (let x = 3; x < 24; x += 6) {
      px(ctx, x, 0, 1, 20, '#172e4c');
    }
    // Scattered crisp white & pale-blue pixel daisies
    const flowers = [
      [2, 2], [7, 4], [12, 2], [18, 3], [21, 5],
      [4, 8], [10, 9], [15, 8], [20, 10], [1, 11],
      [3, 15], [8, 16], [13, 15], [17, 17], [22, 15],
      [6, 18], [15, 18],
    ];
    for (const [fx, fy] of flowers) {
      px(ctx, fx, fy, 1, 1, '#f8fafc');
      px(ctx, fx + 1, fy, 1, 1, '#dbeafe');
      px(ctx, fx, fy + 1, 1, 1, '#93c5fd');
    }
  });
}

function createOliveSkirtTexture(): THREE.CanvasTexture {
  return createPixelCanvasTexture('teacher_skirt_inzui', 20, 16, (ctx) => {
    px(ctx, 0, 0, 20, 16, '#3a3f32');
    for (let x = 2; x < 20; x += 4) {
      px(ctx, x, 0, 1, 16, '#2d3126');
    }
    px(ctx, 0, 14, 20, 2, '#2a2e24');
  });
}

function createHairTexture(id: CharacterId, spec: TeacherStyleSpec): THREE.CanvasTexture {
  return createPixelCanvasTexture(`teacher_hair_${id}`, 12, 12, (ctx) => {
    px(ctx, 0, 0, 12, 12, spec.hairHex);
    for (let x = 0; x < 12; x += 3) {
      px(ctx, x, 0, 1, 12, spec.hairShadeHex);
    }
    px(ctx, 2, 2, 8, 1, id === 'christina' ? '#332620' : spec.hairHighlightHex);
  });
}

export function buildTeacherRunnerRig(
  charDef: CharacterDef,
  textures: ProceduralTexturePack,
): AnimatedRunnerRig {
  const id = charDef.id;
  const spec = TEACHER_SPECS[id] ?? TEACHER_SPECS.moitrey;

  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const hitFlashMaterials: THREE.MeshStandardMaterial[] = [];
  const track = (m: THREE.MeshStandardMaterial) => {
    hitFlashMaterials.push(m);
    return m;
  };

  // Pixel textures
  const faceTex = createTeacherFaceTexture(id, spec);
  const torsoFrontTex = createTeacherTorsoFrontTexture(id, spec);
  const torsoBackTex = createTeacherTorsoBackTexture(id);
  const sleeveLeftTex = createTeacherSleeveTexture(id, spec, true);
  const sleeveRightTex = createTeacherSleeveTexture(id, spec, false);
  const legTex = createTeacherLegTexture(id, spec);
  const hairTex = createHairTexture(id, spec);

  const skinMat = track(makeSolidPixelMat(spec.skinHex, 0.72));
  const hairMat = track(makePixelMat(hairTex, 0.65));
  const hairDarkMat = track(makeSolidPixelMat(spec.hairShadeHex, 0.68));
  const faceMat = track(makePixelMat(faceTex, 0.68));
  const torsoFrontMat = track(makePixelMat(torsoFrontTex, 0.78));
  const torsoBackMat = track(makePixelMat(torsoBackTex, 0.78));
  const torsoSideMat = track(makePixelMat(torsoBackTex, 0.8));
  const sleeveLMat = track(makePixelMat(sleeveLeftTex, 0.76));
  const sleeveRMat = track(makePixelMat(sleeveRightTex, 0.76));
  const legMat = track(makePixelMat(legTex, 0.78));
  const shoeMat = track(makeSolidPixelMat(spec.shoeHex, 0.65));
  const soleMat = track(makeSolidPixelMat(spec.shoeSoleHex, 0.7));

  // Articulated 2.5D Voxel Hierarchy
  // Total standing height ~1.78 units (matches existing camera framing & obstacle jump height)
  const pelvisGroup = new THREE.Group();
  pelvisGroup.position.y = 0.78;
  bodyPivot.add(pelvisGroup);

  const spineGroup = new THREE.Group();
  spineGroup.position.y = 0.04;
  pelvisGroup.add(spineGroup);

  // ── TORSO (2.5D blocky pixel proportions) ──
  const torsoW = spec.femaleFace ? 0.44 : 0.48;
  const torsoH = 0.54;
  const torsoD = 0.24;
  // BoxGeometry face order: +X, -X, +Y, -Y, +Z (front!), -Z (back!)
  const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(torsoW, torsoH, torsoD), [
    torsoSideMat,
    torsoSideMat,
    torsoSideMat,
    torsoSideMat,
    torsoFrontMat,
    torsoBackMat,
  ]);
  torsoMesh.position.y = torsoH * 0.5;
  torsoMesh.castShadow = true;
  spineGroup.add(torsoMesh);

  // Subtle 2.5D layered lapels / vest panels protruding slightly in +Z for extra depth!
  if (id === 'inzui') {
    const vestLeft = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.52, 0.04), hairDarkMat);
    vestLeft.position.set(0.14, torsoH * 0.5, torsoD * 0.5 + 0.015);
    const vestRight = vestLeft.clone();
    vestRight.position.x = -0.14;
    spineGroup.add(vestLeft, vestRight);
  } else if (id === 'shubham') {
    const collarMat = track(makeSolidPixelMat('#d99862', 0.75));
    const collarL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.09, 0.06), collarMat);
    collarL.position.set(0.11, torsoH - 0.03, torsoD * 0.5 + 0.01);
    const collarR = collarL.clone();
    collarR.position.x = -0.11;
    spineGroup.add(collarL, collarR);
  } else if (id === 'christina') {
    // Cream cardigan layered open edges
    const cardMat = track(makeSolidPixelMat('#f3ece0', 0.8));
    const flapL = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.54, 0.03), cardMat);
    flapL.position.set(0.15, torsoH * 0.5, torsoD * 0.5 + 0.012);
    const flapR = flapL.clone();
    flapR.position.x = -0.15;
    spineGroup.add(flapL, flapR);
  }

  // ── NECK & PIXEL HEAD ──
  const headGroup = new THREE.Group();
  headGroup.position.set(0, torsoH + 0.02, 0);
  spineGroup.add(headGroup);

  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.14), skinMat);
  neck.position.y = 0.03;
  headGroup.add(neck);

  const headSize = 0.38;
  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(headSize, headSize, headSize), [
    spec.hairStyle === 'bob' || spec.hairStyle === 'long_curly_clip' ? hairMat : skinMat,
    spec.hairStyle === 'bob' || spec.hairStyle === 'long_curly_clip' ? hairMat : skinMat,
    hairMat,
    skinMat,
    faceMat,
    hairMat,
  ]);
  headMesh.position.y = 0.06 + headSize * 0.5;
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Cute pixel ears
  const earGeo = new THREE.BoxGeometry(0.05, 0.09, 0.07);
  const leftEar = new THREE.Mesh(earGeo, skinMat);
  leftEar.position.set(headSize * 0.5 + 0.01, 0.23, 0);
  const rightEar = new THREE.Mesh(earGeo, skinMat);
  rightEar.position.set(-headSize * 0.5 - 0.01, 0.23, 0);
  headGroup.add(leftEar, rightEar);

  // Earrings (hoops for Miss Moitrey, pearl drops for Miss Christina)
  if (spec.earrings === 'hoop') {
    const hoopMat = track(makeSolidPixelMat('#f1f5f9', 0.3, 0.8));
    const hL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.05), hoopMat);
    hL.position.set(headSize * 0.5 + 0.02, 0.17, 0.01);
    const hR = hL.clone();
    hR.position.x = -hL.position.x;
    headGroup.add(hL, hR);
  } else if (spec.earrings === 'pearl') {
    const pearlMat = track(makeSolidPixelMat('#fffdf7', 0.25, 0.3));
    const pL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.04), pearlMat);
    pL.position.set(headSize * 0.5 + 0.03, 0.16, 0.01);
    const pR = pL.clone();
    pR.position.x = -pL.position.x;
    headGroup.add(pL, pR);
  }

  // ── SIGNATURE 3D VOXEL HAIRSTYLES & HEAD ACCESSORIES ──
  const swayingHairGroups: THREE.Object3D[] = [];
  const headTopY = 0.06 + headSize;

  // Hair cap on top & back of head for crisp 2.5D volume
  const topHair = new THREE.Mesh(
    new THREE.BoxGeometry(headSize + 0.04, 0.09, headSize + 0.04),
    hairMat,
  );
  topHair.position.set(0, headTopY + 0.01, -0.01);
  headGroup.add(topHair);

  const backHair = new THREE.Mesh(
    new THREE.BoxGeometry(headSize + 0.04, headSize + 0.02, 0.08),
    hairMat,
  );
  backHair.position.set(0, 0.06 + headSize * 0.5, -headSize * 0.5 - 0.02);
  headGroup.add(backHair);

  if (spec.hairStyle === 'ponytail') {
    // Miss Moitrey: Neat mid-low ponytail + dark scrunchie on back
    const scrunchie = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.1, 0.08),
      track(makeSolidPixelMat('#27272a', 0.6)),
    );
    scrunchie.position.set(0, 0.17, -headSize * 0.5 - 0.06);
    headGroup.add(scrunchie);

    const ponyPivot = new THREE.Group();
    ponyPivot.position.set(0, 0.17, -headSize * 0.5 - 0.09);
    const ponyUpper = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.24, 0.09), hairMat);
    ponyUpper.position.set(0, -0.11, -0.02);
    const ponyTip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.07), hairDarkMat);
    ponyTip.position.set(0, -0.27, -0.03);
    ponyPivot.add(ponyUpper, ponyTip);
    headGroup.add(ponyPivot);
    swayingHairGroups.push(ponyPivot);
  } else if (spec.hairStyle === 'short_wavy') {
    // Sir Anowar: Layered short dark wavy voxel crown + sideburns
    const wave = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.07, 0.34), hairMat);
    wave.position.set(0, headTopY + 0.06, 0.01);
    const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.22), hairMat);
    sideL.position.set(headSize * 0.5 + 0.01, 0.31, -0.05);
    const sideR = sideL.clone();
    sideR.position.x = -sideL.position.x;
    headGroup.add(wave, sideL, sideR);
  } else if (spec.hairStyle === 'center_part') {
    // Sir Shubham: Medium-short center-parted dark fringes on left & right brow
    const fringeL = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.11, 0.07), hairMat);
    fringeL.position.set(0.12, headTopY - 0.04, headSize * 0.5 + 0.01);
    const fringeR = fringeL.clone();
    fringeR.position.x = -0.12;
    const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.26), hairMat);
    sideL.position.set(headSize * 0.5 + 0.01, 0.29, -0.04);
    const sideR = sideL.clone();
    sideR.position.x = -sideL.position.x;
    headGroup.add(fringeL, fringeR, sideL, sideR);
  } else if (spec.hairStyle === 'long_curly_clip') {
    // Miss Christina: Long curly hair with chestnut-reddish ombre ends + white pearl claw clip at back!
    const ombreMat = track(makeSolidPixelMat('#7a3724', 0.68));
    const sideUpperL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.22), hairMat);
    sideUpperL.position.set(headSize * 0.5 + 0.02, 0.26, -0.04);
    const sideUpperR = sideUpperL.clone();
    sideUpperR.position.x = -sideUpperL.position.x;
    const sideOmbreL = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.16, 0.22), ombreMat);
    sideOmbreL.position.set(headSize * 0.5 + 0.02, 0.04, -0.04);
    const sideOmbreR = sideOmbreL.clone();
    sideOmbreR.position.x = -sideOmbreL.position.x;
    headGroup.add(sideUpperL, sideUpperR, sideOmbreL, sideOmbreR);

    // Pearl claw clip at back of head
    const clipMat = track(makeSolidPixelMat('#fffbf0', 0.25, 0.35));
    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.06), clipMat);
    clip.position.set(0, 0.27, -headSize * 0.5 - 0.07);
    headGroup.add(clip);

    // Flowing curly ombre hair cascade down the back
    const curlsPivot = new THREE.Group();
    curlsPivot.position.set(0, 0.22, -headSize * 0.5 - 0.05);
    const curlsUpper = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.1), hairMat);
    curlsUpper.position.set(0, -0.12, -0.02);
    const curlsLower = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.11), ombreMat);
    curlsLower.position.set(0, -0.34, -0.03);
    curlsPivot.add(curlsUpper, curlsLower);
    headGroup.add(curlsPivot);
    swayingHairGroups.push(curlsPivot);
  } else if (spec.hairStyle === 'short_neat') {
    // Sir Muktar: Crisp short trimmed hair
    const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.2), hairMat);
    sideL.position.set(headSize * 0.5 + 0.005, 0.32, -0.06);
    const sideR = sideL.clone();
    sideR.position.x = -sideL.position.x;
    headGroup.add(sideL, sideR);
  } else if (spec.hairStyle === 'bob') {
    // Miss Veravole: Shoulder-length straight jet-black bob + iconic glasses perched on top of head!
    const bobSideL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.44, 0.26), hairMat);
    bobSideL.position.set(headSize * 0.5 + 0.02, 0.2, -0.04);
    const bobSideR = bobSideL.clone();
    bobSideR.position.x = -bobSideL.position.x;
    headGroup.add(bobSideL, bobSideR);

    const bobBackPivot = new THREE.Group();
    bobBackPivot.position.set(0, 0.24, -headSize * 0.5 - 0.03);
    const bobBack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.08), hairMat);
    bobBack.position.set(0, -0.15, -0.01);
    bobBackPivot.add(bobBack);
    headGroup.add(bobBackPivot);
    swayingHairGroups.push(bobBackPivot);

    if (spec.glassesOnHead) {
      const frameMat = track(makeSolidPixelMat('#e2e8f0', 0.25, 0.85));
      const lensMat = track(makeSolidPixelMat('#93c5fd', 0.15, 0.2));
      const glassesGroup = new THREE.Group();
      glassesGroup.position.set(0, headTopY + 0.07, 0.08);
      glassesGroup.rotation.x = -0.22;
      const lensL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.03), lensMat);
      lensL.position.x = 0.08;
      const lensR = lensL.clone();
      lensR.position.x = -0.08;
      const rimL = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.08, 0.02), frameMat);
      rimL.position.set(0.08, 0, -0.005);
      const rimR = rimL.clone();
      rimR.position.x = -0.08;
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.02), frameMat);
      glassesGroup.add(rimL, rimR, lensL, lensR, bridge);
      headGroup.add(glassesGroup);
    }
  } else if (spec.hairStyle === 'top_bun') {
    // Miss Inzui: Neat high top-bun perched on top of her head
    const bun = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.16), hairMat);
    bun.position.set(0, headTopY + 0.1, -0.04);
    const bunTie = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.18), hairDarkMat);
    bunTie.position.set(0, headTopY + 0.04, -0.04);
    headGroup.add(bunTie, bun);
  }

  // ── ARMS (Voxel articulated shoulder + forearm) ──
  const buildArm = (isLeft: boolean) => {
    const sign = isLeft ? 1 : -1;
    const shoulder = new THREE.Group();
    shoulder.position.set(sign * (torsoW * 0.5 + 0.085), torsoH - 0.07, 0);
    spineGroup.add(shoulder);

    const mat = isLeft ? sleeveLMat : sleeveRMat;
    const armMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.46, 0.14), mat);
    armMesh.position.y = -0.2;
    armMesh.castShadow = true;
    shoulder.add(armMesh);

    return shoulder;
  };
  const leftArm = buildArm(true);
  const rightArm = buildArm(false);

  // ── SKIRT OVERLAY FOR MISS CHRISTINA & MISS INZUI ──
  let skirtGroup: THREE.Group | null = null;
  if (spec.skirtKind === 'maxi_floral') {
    skirtGroup = new THREE.Group();
    skirtGroup.position.set(0, 0.04, 0);
    const skirtMat = track(makePixelMat(createFloralSkirtTexture(), 0.78));
    const upperSkirt = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.28), skirtMat);
    upperSkirt.position.y = -0.17;
    upperSkirt.castShadow = true;
    const lowerSkirt = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.32, 0.32), skirtMat);
    lowerSkirt.position.y = -0.47;
    lowerSkirt.castShadow = true;
    skirtGroup.add(upperSkirt, lowerSkirt);
    pelvisGroup.add(skirtGroup);
  } else if (spec.skirtKind === 'midi_olive') {
    skirtGroup = new THREE.Group();
    skirtGroup.position.set(0, 0.04, 0);
    const skirtMat = track(makePixelMat(createOliveSkirtTexture(), 0.8));
    const upperSkirt = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.28, 0.28), skirtMat);
    upperSkirt.position.y = -0.14;
    upperSkirt.castShadow = true;
    const lowerSkirt = new THREE.Mesh(new THREE.BoxGeometry(0.51, 0.24, 0.32), skirtMat);
    lowerSkirt.position.y = -0.38;
    lowerSkirt.castShadow = true;
    skirtGroup.add(upperSkirt, lowerSkirt);
    pelvisGroup.add(skirtGroup);
  }

  // ── LEGS & PIXEL SHOES ──
  const buildLeg = (isLeft: boolean) => {
    const sign = isLeft ? 1 : -1;
    const hip = new THREE.Group();
    hip.position.set(sign * 0.11, 0.02, 0);
    pelvisGroup.add(hip);

    const legW = spec.skirtKind !== 'none' ? 0.14 : 0.17;
    const legMesh = new THREE.Mesh(new THREE.BoxGeometry(legW, 0.72, 0.17), legMat);
    legMesh.position.y = -0.36;
    legMesh.castShadow = true;
    hip.add(legMesh);

    // Distinct 2.5D shoe toe box + sole protruding forward (+Z)
    const shoeToe = new THREE.Mesh(new THREE.BoxGeometry(legW + 0.01, 0.09, 0.23), shoeMat);
    shoeToe.position.set(0, -0.71, 0.04);
    shoeToe.castShadow = true;
    hip.add(shoeToe);

    const sole = new THREE.Mesh(new THREE.BoxGeometry(legW + 0.02, 0.035, 0.24), soleMat);
    sole.position.set(0, -0.765, 0.04);
    hip.add(sole);

    return hip;
  };
  const leftLeg = buildLeg(true);
  const rightLeg = buildLeg(false);

  // Soft Grounded Contact Shadow Disc
  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.56, 18),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.56,
    }),
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.02;
  root.add(shadowDisc);

  const updateAnimation: AnimatedRunnerRig['updateAnimation'] = ({
    time,
    speed,
    stridePhase,
    y,
    grounded,
    hitFlash,
    squashX,
    squashY,
    celebrating,
    idleMode,
    lockedPose,
    previewJumpProgress = 0,
  }) => {
    for (const m of hitFlashMaterials) {
      m.emissive.setHex(hitFlash ? 0xffffff : 0x000000);
      m.emissiveIntensity = hitFlash ? 0.55 : 0;
    }

    const previewJumpHeight =
      previewJumpProgress > 0 && previewJumpProgress < 1
        ? Math.sin(previewJumpProgress * Math.PI) * 0.92
        : 0;
    const effectiveY = Math.max(y, previewJumpHeight);

    const shadowScale = Math.max(0.42, 1 - effectiveY * 0.22);
    shadowDisc.scale.setScalar(shadowScale);
    (shadowDisc.material as THREE.MeshBasicMaterial).opacity = 0.56 * shadowScale;

    bodyPivot.scale.set(squashX, squashY, squashX);
    pelvisGroup.position.set(0, 0.78, 0);
    pelvisGroup.rotation.set(0, 0, 0);
    spineGroup.rotation.set(0, 0, 0);
    headGroup.rotation.set(0, 0, 0);
    if (skirtGroup) skirtGroup.rotation.set(0, 0, 0);

    if (celebrating) {
      const beat = time * 7.2;
      const bounce = Math.abs(Math.sin(beat)) * 0.34;
      bodyPivot.position.y = bounce;
      bodyPivot.rotation.set(0, Math.sin(beat * 0.5) * 0.45, Math.sin(beat) * 0.07);
      spineGroup.rotation.z = Math.sin(beat) * 0.1;
      headGroup.rotation.z = -Math.sin(beat) * 0.12;
      leftArm.rotation.set(-2.5 + Math.sin(beat) * 0.35, 0, 0.35);
      rightArm.rotation.set(-2.5 - Math.sin(beat) * 0.35, 0, -0.35);
      leftLeg.rotation.set(Math.sin(beat) * 0.38, 0, 0);
      rightLeg.rotation.set(-Math.sin(beat) * 0.38, 0, 0);
      for (const h of swayingHairGroups) {
        h.rotation.x = 0.2 + Math.abs(Math.sin(beat)) * 0.25;
      }
      return;
    }

    if (idleMode) {
      if (previewJumpProgress > 0 && previewJumpProgress < 1) {
        const arc = Math.sin(previewJumpProgress * Math.PI);
        bodyPivot.position.y = previewJumpHeight;
        bodyPivot.rotation.set(0, previewJumpProgress * Math.PI * 2, 0);
        leftArm.rotation.set(-2.1 * arc, 0, 0.35 * arc);
        rightArm.rotation.set(-2.1 * arc, 0, -0.35 * arc);
        leftLeg.rotation.set(-0.55 * arc, 0, 0);
        rightLeg.rotation.set(0.45 * arc, 0, 0);
        return;
      }

      const breathe = Math.sin(time * 2.8);
      bodyPivot.position.y = Math.max(0, breathe * 0.025);
      bodyPivot.rotation.set(0, lockedPose ? 0.1 : Math.sin(time * 0.85) * 0.28, 0);
      spineGroup.rotation.x = 0.03 + breathe * 0.02;
      headGroup.rotation.y = Math.sin(time * 1.1) * 0.1;
      if (lockedPose) {
        leftArm.rotation.set(-0.45, 0, 0.22);
        rightArm.rotation.set(-1.75 + Math.sin(time * 5) * 0.18, 0, -0.25);
      } else {
        leftArm.rotation.set(0.08 + breathe * 0.05, 0, 0.1);
        rightArm.rotation.set(-0.08 - breathe * 0.05, 0, -0.1);
      }
      leftLeg.rotation.set(0.06, 0, 0.04);
      rightLeg.rotation.set(-0.06, 0, -0.04);
      for (const h of swayingHairGroups) {
        h.rotation.x = 0.04 + breathe * 0.03;
      }
      return;
    }

    // Active Racing Animation (Running & Jumping)
    const speedRatio = Math.min(1.2, Math.max(0.25, speed / 9.0));
    bodyPivot.rotation.set(0, 0, 0);

    if (!grounded) {
      // Crisp athletic leap pose
      bodyPivot.position.y = 0.05;
      spineGroup.rotation.x = 0.22;
      headGroup.rotation.x = -0.14;
      leftLeg.rotation.set(-0.78, 0, 0.06);
      rightLeg.rotation.set(0.62, 0, -0.06);
      leftArm.rotation.set(-1.35, 0, 0.32);
      rightArm.rotation.set(0.65, 0, -0.32);
      if (skirtGroup) skirtGroup.rotation.x = 0.22;
      for (const h of swayingHairGroups) {
        h.rotation.x = 0.45;
      }
      return;
    }

    const s = Math.sin(stridePhase);
    const c = Math.cos(stridePhase);
    const bounce = Math.abs(c) * 0.08 * speedRatio;
    bodyPivot.position.y = bounce;

    // Slight energetic forward sprint lean + torso twist
    spineGroup.rotation.x = 0.16 * speedRatio;
    spineGroup.rotation.y = -s * 0.14 * speedRatio;
    pelvisGroup.rotation.y = s * 0.12 * speedRatio;
    headGroup.rotation.x = -0.12 * speedRatio;
    headGroup.rotation.y = s * 0.08 * speedRatio;

    const legAmp = (spec.skirtKind !== 'none' ? 0.68 : 0.88) * speedRatio;
    leftLeg.rotation.set(s * legAmp, 0, 0);
    rightLeg.rotation.set(-s * legAmp, 0, 0);

    const armAmp = 0.85 * speedRatio;
    leftArm.rotation.set(-s * armAmp, 0, 0.12);
    rightArm.rotation.set(s * armAmp, 0, -0.12);

    if (skirtGroup) {
      skirtGroup.rotation.x = 0.08 + Math.abs(s) * 0.12 * speedRatio;
      skirtGroup.rotation.z = s * 0.06 * speedRatio;
    }

    for (const h of swayingHairGroups) {
      h.rotation.x = 0.18 * speedRatio + Math.abs(c) * 0.22 * speedRatio;
      h.rotation.z = s * 0.12 * speedRatio;
    }
  };

  return {
    root,
    bodyPivot,
    headGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    spinAccessory: null,
    shadowDisc,
    hitFlashMaterials,
    updateAnimation,
  };
}
