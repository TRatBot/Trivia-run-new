import * as THREE from 'three';

const ROAD_PAVERS_URL = '/src/assets/images/temple_stone_pavers_1795311215897.jpg';
const CARVED_MASONRY_URL = '/src/assets/images/temple_carved_masonry_1795311218889.jpg';

export interface ProceduralTexturePack {
  roadAlbedo: THREE.CanvasTexture;
  roadBump: THREE.CanvasTexture;
  stoneAlbedo: THREE.CanvasTexture;
  stoneBump: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  runeDisc: THREE.CanvasTexture;
  dispose: () => void;
}

function drawLaneGuideInlays(ctx: CanvasRenderingContext2D, size: number): void {
  const s = size / 512;

  // Clear 3-lane carved gold & turquoise divider inlays so players read lanes effortlessly
  const dividerXs = [Math.round(171 * s), Math.round(341 * s)];
  for (const dx of dividerXs) {
    ctx.fillStyle = 'rgba(42, 28, 14, 0.85)';
    ctx.fillRect(dx - 8 * s, 0, 16 * s, size);
    ctx.fillStyle = '#d9a441';
    ctx.fillRect(dx - 3.5 * s, 0, 7 * s, size);
    for (let y = 16 * s; y < size; y += 64 * s) {
      ctx.fillStyle = '#14b8a6';
      ctx.fillRect(dx - 5.5 * s, y, 11 * s, 22 * s);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(dx - 2 * s, y + 6 * s, 4 * s, 10 * s);
    }
  }

  // Outer carved temple bronze/gold trim strips
  ctx.fillStyle = 'rgba(58, 40, 22, 0.88)';
  ctx.fillRect(0, 0, 22 * s, size);
  ctx.fillRect(size - 22 * s, 0, 22 * s, size);
  ctx.fillStyle = '#d9a441';
  ctx.fillRect(22 * s, 0, 6 * s, size);
  ctx.fillRect(size - 28 * s, 0, 6 * s, size);
}

function drawGrayscaleBumpFromImage(
  targetCanvas: HTMLCanvasElement,
  img: HTMLImageElement,
): void {
  const w = targetCanvas.width;
  const h = targetCanvas.height;
  const ctx = targetCanvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = Math.min(255, Math.max(0, Math.round((d[i] * 0.35 + d[i + 1] * 0.45 + d[i + 2] * 0.2 - 115) * 1.45 + 128)));
    d[i] = lum;
    d[i + 1] = lum;
    d[i + 2] = lum;
    d[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTexturePack {
  // 1. Temple Causeway Sandstone Pavers (starts immediately with procedural base, then composites generated carved sandstone pavers!)
  const roadCanvas = document.createElement('canvas');
  roadCanvas.width = 512;
  roadCanvas.height = 512;
  const rctx = roadCanvas.getContext('2d')!;

  rctx.fillStyle = '#ad8758';
  rctx.fillRect(0, 0, 512, 512);
  const rows = 8;
  const cols = 6;
  const tileW = 512 / cols;
  const tileH = 512 / rows;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (tileW * 0.5);
    for (let c = -1; c <= cols; c++) {
      const shade = ((r * 37 + c * 19) % 24) - 12;
      rctx.fillStyle = `rgb(${174 + shade},${138 + shade},${92 + shade})`;
      rctx.fillRect(c * tileW + offset + 3, r * tileH + 3, tileW - 6, tileH - 6);
      rctx.strokeStyle = '#573f26';
      rctx.lineWidth = 4;
      rctx.strokeRect(c * tileW + offset + 1, r * tileH + 1, tileW - 2, tileH - 2);
    }
  }
  drawLaneGuideInlays(rctx, 512);

  const roadAlbedo = new THREE.CanvasTexture(roadCanvas);
  roadAlbedo.colorSpace = THREE.SRGBColorSpace;
  roadAlbedo.wrapS = THREE.RepeatWrapping;
  roadAlbedo.wrapT = THREE.RepeatWrapping;
  roadAlbedo.anisotropy = maxAnisotropy;

  // 2. Road Bump Map (linear)
  const roadBumpCanvas = document.createElement('canvas');
  roadBumpCanvas.width = 256;
  roadBumpCanvas.height = 256;
  const rbctx = roadBumpCanvas.getContext('2d')!;
  rbctx.fillStyle = '#b0b0b0';
  rbctx.fillRect(0, 0, 256, 256);
  for (let r = 0; r < 8; r++) {
    const off = (r % 2) * (256 / 12);
    for (let c = -1; c <= 6; c++) {
      rbctx.strokeStyle = '#303030';
      rbctx.lineWidth = 3;
      rbctx.strokeRect(c * (256 / 6) + off, r * 32, 256 / 6, 32);
    }
  }
  const roadBump = new THREE.CanvasTexture(roadBumpCanvas);
  roadBump.wrapS = THREE.RepeatWrapping;
  roadBump.wrapT = THREE.RepeatWrapping;
  roadBump.anisotropy = maxAnisotropy;

  // 3. Carved Ancient Masonry Albedo + Bump for pillars, totems, archways, ziggurats
  const stoneCanvas = document.createElement('canvas');
  stoneCanvas.width = 512;
  stoneCanvas.height = 512;
  const sctx = stoneCanvas.getContext('2d')!;
  sctx.fillStyle = '#b08e60';
  sctx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 64) {
    const shift = ((y / 64) % 2) * 64;
    for (let x = -64; x < 512; x += 128) {
      const v = ((x * 13 + y * 7) % 18) - 9;
      sctx.fillStyle = `rgb(${176 + v},${144 + v},${102 + v})`;
      sctx.fillRect(x + shift + 3, y + 3, 122, 58);
      sctx.strokeStyle = '#5e462b';
      sctx.lineWidth = 3;
      sctx.strokeRect(x + shift + 1, y + 1, 126, 62);
    }
  }

  const stoneAlbedo = new THREE.CanvasTexture(stoneCanvas);
  stoneAlbedo.colorSpace = THREE.SRGBColorSpace;
  stoneAlbedo.wrapS = THREE.RepeatWrapping;
  stoneAlbedo.wrapT = THREE.RepeatWrapping;
  stoneAlbedo.anisotropy = maxAnisotropy;

  const stoneBumpCanvas = document.createElement('canvas');
  stoneBumpCanvas.width = 256;
  stoneBumpCanvas.height = 256;
  const sbctx = stoneBumpCanvas.getContext('2d')!;
  sbctx.drawImage(stoneCanvas, 0, 0, 256, 256);
  const stoneBump = new THREE.CanvasTexture(stoneBumpCanvas);
  stoneBump.wrapS = THREE.RepeatWrapping;
  stoneBump.wrapT = THREE.RepeatWrapping;
  stoneBump.anisotropy = maxAnisotropy;

  // Upgrade road & stone canvases seamlessly with our high-detail generated carved sandstone images
  const roadImg = new Image();
  roadImg.onload = () => {
    rctx.drawImage(roadImg, 0, 0, 512, 512);
    // Slight warm unifying glaze + crisp carved lane dividers
    rctx.fillStyle = 'rgba(218, 175, 108, 0.14)';
    rctx.fillRect(0, 0, 512, 512);
    drawLaneGuideInlays(rctx, 512);
    roadAlbedo.needsUpdate = true;

    drawGrayscaleBumpFromImage(roadBumpCanvas, roadImg);
    roadBump.needsUpdate = true;
  };
  roadImg.src = ROAD_PAVERS_URL;

  const masonryImg = new Image();
  masonryImg.onload = () => {
    sctx.drawImage(masonryImg, 0, 0, 512, 512);
    stoneAlbedo.needsUpdate = true;

    drawGrayscaleBumpFromImage(stoneBumpCanvas, masonryImg);
    stoneBump.needsUpdate = true;
  };
  masonryImg.src = CARVED_MASONRY_URL;

  // 4. Soft Radial Contact Shadow Disc
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const shctx = shadowCanvas.getContext('2d')!;
  const grad = shctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(18, 12, 6, 0.72)');
  grad.addColorStop(0.55, 'rgba(18, 12, 6, 0.34)');
  grad.addColorStop(1, 'rgba(18, 12, 6, 0)');
  shctx.fillStyle = grad;
  shctx.fillRect(0, 0, 128, 128);
  const contactShadow = new THREE.CanvasTexture(shadowCanvas);

  // 5. Glowing Ancient Trivia Plaza Rune Disc
  const runeCanvas = document.createElement('canvas');
  runeCanvas.width = 256;
  runeCanvas.height = 256;
  const rnctx = runeCanvas.getContext('2d')!;
  rnctx.clearRect(0, 0, 256, 256);
  const rgrad = rnctx.createRadialGradient(128, 128, 10, 128, 128, 120);
  rgrad.addColorStop(0, 'rgba(45, 212, 191, 0.58)');
  rgrad.addColorStop(0.65, 'rgba(234, 179, 8, 0.36)');
  rgrad.addColorStop(1, 'rgba(234, 179, 8, 0)');
  rnctx.fillStyle = rgrad;
  rnctx.fillRect(0, 0, 256, 256);

  rnctx.strokeStyle = '#fde047';
  rnctx.lineWidth = 6;
  rnctx.beginPath();
  rnctx.arc(128, 128, 104, 0, Math.PI * 2);
  rnctx.stroke();

  rnctx.strokeStyle = '#2dd4bf';
  rnctx.lineWidth = 4;
  rnctx.beginPath();
  rnctx.arc(128, 128, 78, 0, Math.PI * 2);
  rnctx.stroke();

  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    rnctx.beginPath();
    rnctx.moveTo(128 + Math.cos(a) * 80, 128 + Math.sin(a) * 80);
    rnctx.lineTo(128 + Math.cos(a) * 102, 128 + Math.sin(a) * 102);
    rnctx.stroke();
  }

  const runeDisc = new THREE.CanvasTexture(runeCanvas);
  runeDisc.colorSpace = THREE.SRGBColorSpace;
  runeDisc.anisotropy = maxAnisotropy;

  return {
    roadAlbedo,
    roadBump,
    stoneAlbedo,
    stoneBump,
    contactShadow,
    runeDisc,
    dispose: () => {
      roadAlbedo.dispose();
      roadBump.dispose();
      stoneAlbedo.dispose();
      stoneBump.dispose();
      contactShadow.dispose();
      runeDisc.dispose();
    },
  };
}

/** Procedural golden-hour tropical temple Sky Dome with layered sunset clouds, rich teal-to-amber sky, and glowing sun disc */
export function createTempleSkyDome(): THREE.Mesh {
  const skyGeo = new THREE.SphereGeometry(220, 28, 18);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x1b526b) },
      upperMidColor: { value: new THREE.Color(0x6b8c8e) },
      midColor: { value: new THREE.Color(0xd89359) },
      horizonColor: { value: new THREE.Color(0xe6be83) },
      sunDir: { value: new THREE.Vector3(0.28, 0.25, -0.92).normalize() },
      sunColor: { value: new THREE.Color(0xfff4c4) },
    },
    vertexShader: `
      varying vec3 vWorldDir;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vWorldDir = normalize(position);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 upperMidColor;
      uniform vec3 midColor;
      uniform vec3 horizonColor;
      uniform vec3 sunDir;
      uniform vec3 sunColor;
      varying vec3 vWorldDir;

      float cloudNoise(vec2 p) {
        float a = sin(p.x * 2.1 + sin(p.y * 1.7)) * 0.5 + 0.5;
        float b = sin(p.x * 4.7 - p.y * 3.1 + 1.4) * 0.5 + 0.5;
        float c = cos(p.x * 8.3 + p.y * 5.9) * 0.5 + 0.5;
        return a * 0.55 + b * 0.3 + c * 0.15;
      }

      void main() {
        vec3 dir = normalize(vWorldDir);
        float h = clamp(dir.y, 0.0, 1.0);
        vec3 col = mix(horizonColor, midColor, smoothstep(0.0, 0.22, h));
        col = mix(col, upperMidColor, smoothstep(0.18, 0.48, h));
        col = mix(col, topColor, smoothstep(0.42, 0.85, h));

        // Layered sunlit tropical clouds across the upper sky
        if (dir.y > 0.04) {
          vec2 uv = dir.xz / (dir.y + 0.28);
          float n = cloudNoise(uv * 0.95);
          float cloudMask = smoothstep(0.56, 0.84, n) * smoothstep(0.04, 0.24, dir.y) * (1.0 - smoothstep(0.58, 0.92, dir.y));
          float sunEdge = pow(max(dot(dir, sunDir), 0.0), 4.0);
          vec3 cloudCol = mix(vec3(0.95, 0.78, 0.58), vec3(1.0, 0.94, 0.76), sunEdge);
          col = mix(col, cloudCol, cloudMask * 0.48);
        }

        // Radiant sun halo & crisp solar disc
        float sunAmt = max(dot(dir, sunDir), 0.0);
        col += vec3(1.0, 0.78, 0.42) * pow(sunAmt, 6.0) * 0.22;
        col += sunColor * pow(sunAmt, 24.0) * 0.45;
        col += sunColor * smoothstep(0.996, 0.999, sunAmt) * 0.9;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  return new THREE.Mesh(skyGeo, skyMat);
}
