import * as THREE from 'three';
import { CharacterDef, MonsterDef, ObstacleKind } from '../game/types';
import { ProceduralTexturePack } from './textures';

export interface AnimatedRunnerRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  spinAccessory: THREE.Object3D | null;
  shadowDisc: THREE.Mesh;
  hitFlashMaterials: THREE.MeshStandardMaterial[];
  updateAnimation: (params: {
    dt: number;
    time: number;
    speed: number;
    stridePhase: number;
    y: number;
    grounded: boolean;
    hitFlash: boolean;
    squashX: number;
    squashY: number;
    celebrating: boolean;
    idleMode: boolean;
    lockedPose: boolean;
    previewJumpProgress?: number;
  }) => void;
}

export interface AnimatedMonsterRig {
  root: THREE.Group;
  body: THREE.Group;
  leftEye: THREE.Mesh;
  rightEye: THREE.Mesh;
  update: (time: number, mood: 'idle' | 'asking' | 'happy' | 'grumpy') => void;
}

import { buildTeacherRunnerRig } from './teacherModels';

export function buildRunnerRig(
  charDef: CharacterDef,
  textures: ProceduralTexturePack,
): AnimatedRunnerRig {
  return buildTeacherRunnerRig(charDef, textures);
}

/**
 * Wraps a user-supplied picture (PNG/JPG/WebP) as a crisp 3D double-sided cutout runner standee
 * mounted on a carved golden sun-disc base, with full running bounce, jump, squash, and Victory Dance!
 */
export function buildCustomPictureRunnerRig(
  imageUrl: string,
  accentHex: number,
  textures: ProceduralTexturePack,
): AnimatedRunnerRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd9a441,
    roughness: 0.28,
    metalness: 0.8,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    roughness: 0.4,
    metalness: 0.3,
  });

  // Carved golden runner stand base
  const baseDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.6, 0.12, 16), goldMat);
  baseDisc.position.y = 0.06;
  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.04, 8, 20), trimMat);
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = 0.12;
  bodyPivot.add(baseDisc, baseRing);

  const cardMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.55,
    metalness: 0.05,
    transparent: true,
    alphaTest: 0.15,
    side: THREE.DoubleSide,
  });

  const cardPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 1.85), cardMat);
  cardPlane.position.y = 1.06;
  cardPlane.castShadow = true;
  bodyPivot.add(cardPlane);

  const loader = new THREE.TextureLoader();
  loader.load(imageUrl, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    cardMat.map = tex;
    cardMat.needsUpdate = true;
    const img = tex.image as HTMLImageElement | undefined;
    if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
      const aspect = Math.min(1.8, Math.max(0.55, img.naturalWidth / img.naturalHeight));
      cardPlane.scale.set(aspect / (1.45 / 1.85), 1, 1);
    }
  });

  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.62, 18),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    }),
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.02;
  root.add(shadowDisc);

  const dummyGroup = new THREE.Group();
  const hitFlashMaterials = [cardMat, goldMat];

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
  }) => {
    cardMat.emissive.setHex(hitFlash ? 0xffffff : 0x000000);
    cardMat.emissiveIntensity = hitFlash ? 0.5 : 0;

    const shadowScale = Math.max(0.42, 1 - y * 0.22);
    shadowDisc.scale.setScalar(shadowScale);
    (shadowDisc.material as THREE.MeshBasicMaterial).opacity = 0.55 * shadowScale;

    if (celebrating) {
      const beat = time * 6.5;
      const hop = Math.abs(Math.sin(beat)) * 0.52;
      bodyPivot.position.y = hop;
      bodyPivot.rotation.set(0, time * 4.5, Math.sin(beat) * 0.22);
      bodyPivot.scale.set(1 - hop * 0.12, 1 + hop * 0.16, 1);
      return;
    }

    bodyPivot.rotation.y = 0;
    if (idleMode) {
      bodyPivot.position.y = lockedPose ? Math.abs(Math.sin(time * 6)) * 0.16 : Math.sin(time * 2.4) * 0.04;
      bodyPivot.rotation.set(0, 0, Math.sin(time * 2.4) * 0.04);
      bodyPivot.scale.set(1, 1, 1);
      return;
    }

    bodyPivot.scale.set(squashX, squashY, squashX);
    if (!grounded) {
      bodyPivot.position.y = y;
      bodyPivot.rotation.set(0.15, 0, 0);
    } else {
      const amp = Math.min(1, speed / 5.0);
      bodyPivot.position.y = y + Math.abs(Math.cos(stridePhase)) * 0.16 * amp;
      bodyPivot.rotation.set(0.08 * amp, 0, Math.sin(stridePhase) * 0.11 * amp);
    }
  };

  return {
    root,
    bodyPivot,
    headGroup: dummyGroup,
    leftArm: dummyGroup,
    rightArm: dummyGroup,
    leftLeg: dummyGroup,
    rightLeg: dummyGroup,
    spinAccessory: null,
    shadowDisc,
    hitFlashMaterials,
    updateAnimation,
  };
}

/**
 * Wraps an uploaded GLB/GLTF 3D model object as a playable Temple Runner rig
 * (auto-scaled to ~1.85m tall and grounded bottom-center!).
 */
export function buildCustomGltfRunnerRig(
  loadedModel: THREE.Object3D,
  textures: ProceduralTexturePack,
): AnimatedRunnerRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const clone = loadedModel.clone(true);
  const box = new THREE.Box3().setFromObject(clone);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const scale = 1.85 / maxDim;
  clone.scale.setScalar(scale);
  clone.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  bodyPivot.add(clone);

  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.6, 18),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    }),
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.02;
  root.add(shadowDisc);

  const dummy = new THREE.Group();
  const updateAnimation: AnimatedRunnerRig['updateAnimation'] = ({
    time,
    speed,
    stridePhase,
    y,
    grounded,
    squashX,
    squashY,
    celebrating,
    idleMode,
    lockedPose,
  }) => {
    const shadowScale = Math.max(0.42, 1 - y * 0.22);
    shadowDisc.scale.setScalar(shadowScale);
    (shadowDisc.material as THREE.MeshBasicMaterial).opacity = 0.55 * shadowScale;

    if (celebrating) {
      const beat = time * 6.5;
      const hop = Math.abs(Math.sin(beat)) * 0.5;
      bodyPivot.position.y = hop;
      bodyPivot.rotation.set(0, time * 4.8, Math.sin(beat) * 0.16);
      bodyPivot.scale.set(1 - hop * 0.1, 1 + hop * 0.14, 1 - hop * 0.1);
      return;
    }

    bodyPivot.rotation.y = 0;
    if (idleMode) {
      bodyPivot.position.y = lockedPose ? Math.abs(Math.sin(time * 6)) * 0.16 : Math.sin(time * 2.4) * 0.04;
      bodyPivot.rotation.set(0, 0, 0);
      bodyPivot.scale.set(1, 1, 1);
      return;
    }

    bodyPivot.scale.set(squashX, squashY, squashX);
    if (!grounded) {
      bodyPivot.position.y = y;
      bodyPivot.rotation.set(0.14, 0, 0);
    } else {
      const amp = Math.min(1, speed / 5.0);
      bodyPivot.position.y = y + Math.abs(Math.cos(stridePhase)) * 0.14 * amp;
      bodyPivot.rotation.set(0.1 * amp, 0, Math.sin(stridePhase) * 0.08 * amp);
    }
  };

  return {
    root,
    bodyPivot,
    headGroup: dummy,
    leftArm: dummy,
    rightArm: dummy,
    leftLeg: dummy,
    rightLeg: dummy,
    spinAccessory: null,
    shadowDisc,
    hitFlashMaterials: [],
    updateAnimation,
  };
}

/**
 * Builds composite 5-10 part 3D obstacle models with unmistakable visual reads
 */
export function buildObstacleMesh(
  kind: ObstacleKind,
  textures: ProceduralTexturePack,
): THREE.Group {
  const group = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.stoneAlbedo,
    bumpMap: textures.stoneBump,
    bumpScale: 0.07,
    roughness: 0.82,
    metalness: 0.05,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd9a441,
    roughness: 0.3,
    metalness: 0.78,
  });
  const jadeMat = new THREE.MeshStandardMaterial({
    color: 0x15805d,
    roughness: 0.32,
    metalness: 0.25,
  });
  const mossMat = new THREE.MeshStandardMaterial({
    color: 0x2e6f40,
    roughness: 0.9,
    metalness: 0.0,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x6b4322,
    roughness: 0.86,
    metalness: 0.04,
  });

  if (kind === 'low_pillar') {
    const cradleL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.3, 0.92), stoneMat);
    cradleL.position.set(-0.72, 0.15, 0);
    const cradleR = cradleL.clone();
    cradleR.position.x = 0.72;
    group.add(cradleL, cradleR);

    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 1.92, 14), stoneMat);
    drum.rotation.z = Math.PI / 2;
    drum.position.y = 0.44;
    drum.castShadow = true;
    drum.receiveShadow = true;
    group.add(drum);

    const ringGeo = new THREE.TorusGeometry(0.4, 0.055, 8, 16);
    const ringL = new THREE.Mesh(ringGeo, goldMat);
    ringL.rotation.y = Math.PI / 2;
    ringL.position.set(-0.68, 0.44, 0);
    const ringR = ringL.clone();
    ringR.position.x = 0.68;
    group.add(ringL, ringR);

    const mossCap = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.12, 0.44), mossMat);
    mossCap.position.set(0.1, 0.82, 0);
    group.add(mossCap);
  } else if (kind === 'tall_totem') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.54, 0.38, 1.28), stoneMat);
    base.position.y = 0.19;
    base.castShadow = true;
    base.receiveShadow = true;

    const mid = new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.38, 0.98), stoneMat);
    mid.position.y = 1.05;
    mid.castShadow = true;

    const maskPlate = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.88, 0.2), jadeMat);
    maskPlate.position.set(0, 1.25, 0.47);
    const maskPlateBack = maskPlate.clone();
    maskPlateBack.position.z = -0.47;

    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xea580c,
      emissiveIntensity: 0.9,
      roughness: 0.22,
    });
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.08), eyeMat);
    eyeL.position.set(-0.22, 1.38, 0.57);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.22;
    const eyeLBack = eyeL.clone();
    eyeLBack.position.z = -0.57;
    const eyeRBack = eyeR.clone();
    eyeRBack.position.z = -0.57;

    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.84, 0.52, 0.48, 6), goldMat);
    crown.position.y = 1.98;
    crown.castShadow = true;

    const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.25, 0), jadeMat);
    finial.position.y = 2.38;

    group.add(base, mid, maskPlate, maskPlateBack, eyeL, eyeR, eyeLBack, eyeRBack, crown, finial);
  } else if (kind === 'vine_hurdle') {
    const postGeo = new THREE.BoxGeometry(0.48, 1.18, 0.48);
    const postL = new THREE.Mesh(postGeo, stoneMat);
    postL.position.set(-3.35, 0.59, 0);
    postL.castShadow = true;
    const postR = postL.clone();
    postR.position.x = 3.35;

    const capGeo = new THREE.CylinderGeometry(0.32, 0.36, 0.22, 8);
    const capL = new THREE.Mesh(capGeo, goldMat);
    capL.position.set(-3.35, 1.24, 0);
    const capR = capL.clone();
    capR.position.x = 3.35;

    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 6.7, 12), woodMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.y = 0.72;
    bar.castShadow = true;

    for (const lx of [-2.3, 0, 2.3]) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.55, 12), goldMat);
      band.rotation.z = Math.PI / 2;
      band.position.set(lx, 0.72, 0);
      group.add(band);
    }

    const vine = new THREE.Mesh(new THREE.BoxGeometry(6.1, 0.2, 0.16), mossMat);
    vine.position.set(0, 0.54, 0.12);

    group.add(postL, postR, capL, capR, bar, vine);
  } else if (kind === 'broken_path_lane' || kind === 'broken_path_full') {
    const isFull = kind === 'broken_path_full';
    const pitWidth = isFull ? 7.5 : 2.15;
    const pitDepth = isFull ? 7.4 : 6.8;

    const abyssMat = new THREE.MeshBasicMaterial({ color: 0x071316 });
    const mistGlowMat = new THREE.MeshBasicMaterial({
      color: 0x0d7a74,
      transparent: true,
      opacity: 0.72,
    });
    const hazardMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.65,
      roughness: 0.35,
    });

    // Deep canyon chasm void spanning the collapsed section of the stone causeway
    const chasm = new THREE.Mesh(new THREE.BoxGeometry(pitWidth, 0.08, pitDepth), abyssMat);
    chasm.position.y = 0.025;
    group.add(chasm);

    // Shimmering turquoise river-mist glow rising from the broken gorge below
    const mist = new THREE.Mesh(
      new THREE.PlaneGeometry(pitWidth * 0.82, pitDepth * 0.62),
      mistGlowMat,
    );
    mist.rotation.x = -Math.PI / 2;
    mist.position.y = 0.075;
    group.add(mist);

    // Jagged cracked stone lips & tilted collapsed slabs at front (+Z) and back (-Z) edges
    const slabCount = isFull ? 5 : 2;
    const spacing = pitWidth / slabCount;
    for (const edgeSign of [1, -1]) {
      const edgeZ = edgeSign * (pitDepth * 0.5);
      for (let i = 0; i < slabCount; i++) {
        const sx = -pitWidth * 0.5 + spacing * (i + 0.5);
        const slab = new THREE.Mesh(
          new THREE.BoxGeometry(spacing * 0.88, 0.24, 0.85),
          stoneMat,
        );
        slab.position.set(sx, 0.04, edgeZ - edgeSign * 0.24);
        slab.rotation.x = edgeSign * (0.28 + (i % 2) * 0.14);
        slab.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.08;
        group.add(slab);
      }

      // Bright amber-gold cracked-ledge hazard lip on front edge for instant high-speed readability
      if (edgeSign === 1) {
        const warnLip = new THREE.Mesh(
          new THREE.BoxGeometry(pitWidth * 0.96, 0.09, 0.24),
          hazardMat,
        );
        warnLip.position.set(0, 0.08, edgeZ + 0.18);
        group.add(warnLip);
      }
    }

    // Snapped wooden support beams jutting out over the broken gap
    for (const side of [-1, 1]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 1.55), woodMat);
      beam.position.set(side * (pitWidth * 0.34), 0.09, pitDepth * 0.36);
      beam.rotation.x = 0.22;
      beam.rotation.y = side * 0.16;
      group.add(beam);
    }

    // Broken rubble boulders on left/right gap corners
    for (const side of [-1, 1]) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), stoneMat);
      rock.position.set(side * (pitWidth * 0.44), 0.22, pitDepth * 0.48);
      group.add(rock);
    }
  }

  return group;
}

/**
 * Builds an imposing composite 11-part Ancient Trivia Guardian Monster with orbiting rune stones
 */
export function buildMonsterRig(
  monster: MonsterDef,
  textures: ProceduralTexturePack,
): AnimatedMonsterRig {
  const root = new THREE.Group();

  const runePlane = new THREE.Mesh(
    new THREE.CircleGeometry(3.2, 24),
    new THREE.MeshBasicMaterial({
      map: textures.runeDisc,
      transparent: true,
      depthWrite: false,
      opacity: 0.92,
    }),
  );
  runePlane.rotation.x = -Math.PI / 2;
  runePlane.position.y = 0.03;
  root.add(runePlane);

  const primaryMat = new THREE.MeshStandardMaterial({
    color: monster.primaryColor,
    map: textures.stoneAlbedo,
    bumpMap: textures.stoneBump,
    bumpScale: 0.06,
    roughness: 0.72,
    metalness: 0.14,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: monster.accentColor,
    roughness: 0.28,
    metalness: 0.78,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: monster.eyeColor,
    emissive: monster.eyeColor,
    emissiveIntensity: 1.15,
    roughness: 0.18,
  });

  const body = new THREE.Group();
  body.position.y = 0.35;
  root.add(body);

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.42, 0.45, 8), primaryMat);
  plinth.position.y = 0.22;
  plinth.castShadow = true;
  body.add(plinth);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.68, 1.48, 1.22), primaryMat);
  torso.position.y = 1.25;
  torso.castShadow = true;
  body.add(torso);

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 0.88, 0.36, 8), accentMat);
  collar.position.y = 2.02;
  body.add(collar);

  const head = new THREE.Mesh(new THREE.BoxGeometry(1.52, 1.16, 1.26), primaryMat);
  head.position.y = 2.75;
  head.castShadow = true;
  body.add(head);

  const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.14), eyeMat);
  leftEye.position.set(-0.36, 2.86, 0.63);
  const rightEye = leftEye.clone();
  rightEye.position.x = 0.36;
  body.add(leftEye, rightEye);

  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.22, 0.12), accentMat);
  mouth.position.set(0, 2.42, 0.62);
  body.add(mouth);

  // Orbiting glowing ancient rune stones
  const runeOrbit = new THREE.Group();
  runeOrbit.position.y = 1.95;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const stone = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), eyeMat);
    stone.position.set(Math.cos(a) * 1.9, Math.sin(a * 2) * 0.25, Math.sin(a) * 1.9);
    runeOrbit.add(stone);
  }
  body.add(runeOrbit);

  if (monster.archetype === 'jaguar') {
    const earGeo = new THREE.ConeGeometry(0.28, 0.56, 6);
    const earL = new THREE.Mesh(earGeo, primaryMat);
    earL.position.set(-0.58, 3.55, 0.05);
    earL.rotation.z = 0.25;
    const earR = earL.clone();
    earR.position.x = 0.58;
    earR.rotation.z = -0.25;
    const sunCrest = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.09, 8, 16), accentMat);
    sunCrest.position.set(0, 3.65, -0.05);
    body.add(earL, earR, sunCrest);
  } else if (monster.archetype === 'owl') {
    const wingGeo = new THREE.BoxGeometry(0.95, 1.15, 0.22);
    const wingL = new THREE.Mesh(wingGeo, accentMat);
    wingL.position.set(-1.25, 1.45, 0);
    wingL.rotation.z = 0.3;
    const wingR = wingL.clone();
    wingR.position.x = 1.25;
    wingR.rotation.z = -0.3;
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.44, 4), accentMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 2.66, 0.76);
    body.add(wingL, wingR, beak);
  } else {
    for (let i = -3; i <= 3; i++) {
      const plume = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.85, 0.14), i % 2 === 0 ? accentMat : eyeMat);
      const a = i * 0.26;
      plume.position.set(Math.sin(a) * 1.15, 3.25 + Math.cos(a) * 0.55, -0.08);
      plume.rotation.z = -a;
      body.add(plume);
    }
  }

  const update: AnimatedMonsterRig['update'] = (time, mood) => {
    runePlane.rotation.z = time * 0.6;
    runeOrbit.rotation.y = time * 1.35;
    if (mood === 'happy') {
      body.position.x = THREE.MathUtils.lerp(body.position.x, 4.6, 0.08);
      body.position.y = 0.35 + Math.abs(Math.sin(time * 8)) * 0.35;
      body.rotation.y = Math.sin(time * 6) * 0.25;
    } else if (mood === 'grumpy') {
      body.position.x = THREE.MathUtils.lerp(body.position.x, 0, 0.12);
      body.position.y = 0.4 + Math.sin(time * 3) * 0.08;
      body.rotation.y = Math.sin(time * 14) * 0.22;
    } else {
      body.position.x = THREE.MathUtils.lerp(body.position.x, 0, 0.12);
      body.position.y = 0.35 + Math.sin(time * 2.8) * 0.14;
      body.rotation.y = Math.sin(time * 1.2) * 0.08;
    }
  };

  return { root, body, leftEye, rightEye, update };
}

/**
 * Builds a carved Temple Stone Archway with stepped capitals, hanging vines,
 * turquoise-and-gold sun keystone, and dual-layer flickering torch braziers.
 */
export function buildTempleArchway(textures: ProceduralTexturePack): {
  group: THREE.Group;
  flames: THREE.Mesh[];
} {
  const group = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.stoneAlbedo,
    bumpMap: textures.stoneBump,
    bumpScale: 0.07,
    roughness: 0.84,
    metalness: 0.04,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xc28a26,
    roughness: 0.34,
    metalness: 0.74,
  });
  const jadeMat = new THREE.MeshStandardMaterial({
    color: 0x0f766e,
    roughness: 0.36,
    metalness: 0.25,
  });
  const vineMat = new THREE.MeshStandardMaterial({
    color: 0x265e39,
    roughness: 0.86,
  });
  const outerFlameMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xea580c,
    emissiveIntensity: 0.85,
    roughness: 0.4,
  });
  const innerFlameMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.95,
    roughness: 0.3,
  });

  const colGeo = new THREE.BoxGeometry(1.18, 6.2, 1.18);
  const colL = new THREE.Mesh(colGeo, stoneMat);
  colL.position.set(-4.5, 3.1, 0);
  const colR = colL.clone();
  colR.position.x = 4.5;

  // Stepped plinth bases & flared capitals
  const baseGeo = new THREE.BoxGeometry(1.62, 0.85, 1.62);
  const baseL = new THREE.Mesh(baseGeo, stoneMat);
  baseL.position.set(-4.5, 0.42, 0);
  const baseR = baseL.clone();
  baseR.position.x = 4.5;

  const capGeo = new THREE.BoxGeometry(1.58, 0.55, 1.58);
  const capL = new THREE.Mesh(capGeo, stoneMat);
  capL.position.set(-4.5, 5.7, 0);
  const capR = capL.clone();
  capR.position.x = 4.5;

  // Multi-tier carved lintel
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(10.8, 1.18, 1.45), stoneMat);
  lintel.position.set(0, 6.5, 0);
  const crownStep = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.52, 1.15), stoneMat);
  crownStep.position.set(0, 7.3, 0);

  const frieze = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.32, 1.54), goldMat);
  frieze.position.set(0, 6.5, 0);

  // Sun-disc keystone with turquoise inlaid heart
  const keystone = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.76, 0.28, 16), goldMat);
  keystone.rotation.x = Math.PI / 2;
  keystone.position.set(0, 6.68, 0.72);
  const keystoneCore = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.32, 14), jadeMat);
  keystoneCore.rotation.x = Math.PI / 2;
  keystoneCore.position.set(0, 6.68, 0.74);

  // Hanging jungle vines draped over the lintel corners
  for (const vx of [-3.2, -2.5, 2.7, 3.4]) {
    const vine = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.2 + (Math.abs(vx) % 1), 0.14), vineMat);
    vine.position.set(vx, 5.65, 0.74);
    group.add(vine);
  }

  // Twin torch braziers with inner/outer layered flames
  const flames: THREE.Mesh[] = [];
  for (const sx of [-3.75, 3.75]) {
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 0.4), stoneMat);
    bracket.position.set(sx + (sx < 0 ? -0.25 : 0.25), 2.15, 0.45);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.2, 0.36, 10), goldMat);
    bowl.position.set(sx, 2.38, 0.45);
    const outerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.66, 8), outerFlameMat);
    outerFlame.position.set(sx, 2.84, 0.45);
    const innerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.42, 7), innerFlameMat);
    innerFlame.position.set(sx, 2.74, 0.46);
    group.add(bracket, bowl, outerFlame, innerFlame);
    flames.push(outerFlame, innerFlame);
  }

  group.add(colL, colR, baseL, baseR, capL, capR, lintel, crownStep, frieze, keystone, keystoneCore);
  return { group, flames };
}

/** Builds a lush composite Jungle Palm Tree with curved segmented trunk, coconuts, and 8 arched multi-segment fronds */
export function buildJunglePalm(): THREE.Group {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x6b4b32,
    roughness: 0.9,
    metalness: 0.02,
  });
  const barkRingMat = new THREE.MeshStandardMaterial({
    color: 0x4f3522,
    roughness: 0.92,
  });
  const leafDarkMat = new THREE.MeshStandardMaterial({
    color: 0x1e563b,
    roughness: 0.68,
    metalness: 0.03,
    side: THREE.DoubleSide,
  });
  const leafLightMat = new THREE.MeshStandardMaterial({
    color: 0x347d4e,
    roughness: 0.62,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });

  // 5 gently curving trunk segments with bark collars
  let y = 0;
  let x = 0;
  for (let i = 0; i < 5; i++) {
    const rTop = 0.25 - i * 0.026;
    const rBot = 0.31 - i * 0.026;
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, 1.38, 8), trunkMat);
    seg.position.set(x, y + 0.68, 0);
    seg.rotation.z = -0.055 * i;
    group.add(seg);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(rTop + 0.01, 0.03, 6, 10), barkRingMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x + 0.03 * i, y + 1.3, 0);
    group.add(ring);

    y += 1.32;
    x += 0.095 * i;
  }

  // Crown + coconut cluster + 8 curved arched fronds (2 segments each so they droop gracefully!)
  const crown = new THREE.Group();
  crown.position.set(x, y, 0);

  for (let c = 0; c < 3; c++) {
    const a = (c / 3) * Math.PI * 2;
    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), barkRingMat);
    nut.position.set(Math.cos(a) * 0.24, -0.15, Math.sin(a) * 0.24);
    crown.add(nut);
  }

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + (i % 2) * 0.14;
    const mat = i % 2 === 0 ? leafLightMat : leafDarkMat;
    const frondPivot = new THREE.Group();
    frondPivot.rotation.y = a;

    // Inner rising frond segment
    const inner = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.06, 0.62), mat);
    inner.position.set(0.75, 0.28, 0);
    inner.rotation.z = 0.28;
    frondPivot.add(inner);

    // Outer gracefully drooping tip segment
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.36, 1.85, 4), mat);
    tip.scale.set(1, 1, 0.2);
    tip.position.set(2.1, 0.1, 0);
    tip.rotation.z = -1.92;
    frondPivot.add(tip);

    crown.add(frondPivot);
  }
  group.add(crown);
  return group;
}

/** Lush tropical fern cluster flanking temple causeway parapets */
export function buildJungleFernCluster(): THREE.Group {
  const group = new THREE.Group();
  const fernMat = new THREE.MeshStandardMaterial({
    color: 0x2a6b43,
    roughness: 0.72,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.35, 4), fernMat);
    leaf.scale.set(1, 1, 0.18);
    leaf.position.set(Math.cos(a) * 0.45, 0.42, Math.sin(a) * 0.45);
    leaf.rotation.y = -a + Math.PI / 2;
    leaf.rotation.x = 0.95;
    group.add(leaf);
  }
  return group;
}

/** Multi-tier Stepped Mayan Ziggurat Pyramid landmark for the jungle valley backdrop */
export function buildSteppedPyramid(textures: ProceduralTexturePack): THREE.Group {
  const group = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xc29e70,
    map: textures.stoneAlbedo,
    roughness: 0.88,
    metalness: 0.03,
  });
  const mossMat = new THREE.MeshStandardMaterial({
    color: 0x2e5e3b,
    roughness: 0.92,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xc9922c,
    roughness: 0.35,
    metalness: 0.75,
  });

  // 5 stepped stone terraces
  const tiers = 5;
  for (let i = 0; i < tiers; i++) {
    const w = 22 - i * 3.6;
    const h = 3.2;
    const tier = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), stoneMat);
    tier.position.y = i * h + h * 0.5;
    group.add(tier);

    // Subtle moss trim strip on lower terraces
    if (i < 3) {
      const moss = new THREE.Mesh(new THREE.BoxGeometry(w + 0.15, 0.35, w + 0.15), mossMat);
      moss.position.y = i * h + 0.35;
      group.add(moss);
    }
  }

  // Central stone staircase ramp
  const stair = new THREE.Mesh(new THREE.BoxGeometry(4.2, 16.2, 12), stoneMat);
  stair.position.set(0, 7.6, 5.5);
  stair.rotation.x = 0.48;
  group.add(stair);

  // Summit shrine sanctuary + golden sun roof ornament
  const shrine = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.4, 4.8), stoneMat);
  shrine.position.y = tiers * 3.2 + 1.7;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.75, 5.4), goldMat);
  roof.position.y = tiers * 3.2 + 3.65;
  group.add(shrine, roof);

  return group;
}

/** Monumental Golden Sun Temple Finish Gate at 3,000 m */
export function buildFinishSunGate(textures: ProceduralTexturePack): THREE.Group {
  const group = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.stoneAlbedo,
    bumpMap: textures.stoneBump,
    bumpScale: 0.06,
    roughness: 0.75,
    metalness: 0.08,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    emissive: 0x92400e,
    emissiveIntensity: 0.3,
    roughness: 0.24,
    metalness: 0.85,
  });
  const turquoiseMat = new THREE.MeshStandardMaterial({
    color: 0x14b8a6,
    emissive: 0x0f766e,
    emissiveIntensity: 0.5,
    roughness: 0.3,
    metalness: 0.25,
  });

  for (const sx of [-4.6, 4.6]) {
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.2, 1.9), stoneMat);
    pedestal.position.set(sx, 0.6, 0);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.96, 7.6, 4), stoneMat);
    tower.rotation.y = Math.PI / 4;
    tower.position.set(sx, 4.8, 0);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.78, 1.5, 4), goldMat);
    cap.rotation.y = Math.PI / 4;
    cap.position.set(sx, 9.3, 0);
    group.add(pedestal, tower, cap);
  }

  const beam = new THREE.Mesh(new THREE.BoxGeometry(11.4, 1.4, 1.6), goldMat);
  beam.position.set(0, 7.9, 0);
  const sunWheel = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.22, 10, 20), goldMat);
  sunWheel.position.set(0, 9.6, 0);
  const sunCore = new THREE.Mesh(new THREE.CircleGeometry(1.18, 20), turquoiseMat);
  sunCore.position.set(0, 9.6, 0.05);
  const sunCoreBack = sunCore.clone();
  sunCoreBack.rotation.y = Math.PI;
  sunCoreBack.position.z = -0.05;

  for (let i = -3; i <= 3; i++) {
    const tile = new THREE.Mesh(
      new THREE.BoxGeometry(1.05, 0.06, 1.1),
      i % 2 === 0 ? goldMat : turquoiseMat,
    );
    tile.position.set(i * 1.05, 0.03, 0);
    group.add(tile);
  }

  group.add(beam, sunWheel, sunCore, sunCoreBack);
  return group;
}

/** Towering Emerald Jungle Cliff with Cascading Turquoise Waterfall & Frothy Mist Base */
export function buildJungleCliffWaterfall(textures: ProceduralTexturePack): THREE.Group {
  const group = new THREE.Group();
  const cliffMat = new THREE.MeshStandardMaterial({
    color: 0x5c513c,
    map: textures.stoneAlbedo,
    roughness: 0.92,
    metalness: 0.02,
  });
  const mossCapMat = new THREE.MeshStandardMaterial({
    color: 0x26633d,
    roughness: 0.88,
  });
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x2dd4bf,
    emissive: 0x0f766e,
    emissiveIntensity: 0.55,
    roughness: 0.18,
    metalness: 0.25,
    transparent: true,
    opacity: 0.88,
  });
  const foamMat = new THREE.MeshStandardMaterial({
    color: 0xe6fffa,
    emissive: 0x99f6e4,
    emissiveIntensity: 0.5,
    roughness: 0.4,
    transparent: true,
    opacity: 0.85,
  });

  // Layered canyon rock cliff body
  const cliffLower = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 13.5, 20, 7), cliffMat);
  cliffLower.position.y = 10;
  const cliffUpper = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 8.8, 12, 7), cliffMat);
  cliffUpper.position.set(-0.8, 25, -0.5);
  const mossTop = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 6.4, 1.4, 7), mossCapMat);
  mossTop.position.set(-0.8, 31.2, -0.5);
  group.add(cliffLower, cliffUpper, mossTop);

  // Cascading turquoise waterfall sheet + white foam splash plumes
  const cascade = new THREE.Mesh(new THREE.BoxGeometry(3.8, 29, 0.65), waterMat);
  cascade.position.set(0, 15.2, 7.6);
  cascade.rotation.x = -0.14;
  group.add(cascade);

  for (const fx of [-1.0, 0.2, 1.1]) {
    const streak = new THREE.Mesh(new THREE.BoxGeometry(0.42, 26, 0.72), foamMat);
    streak.position.set(fx, 14.8, 7.72);
    streak.rotation.x = -0.14;
    group.add(streak);
  }

  for (let i = 0; i < 5; i++) {
    const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4 + (i % 2) * 0.55, 1), foamMat);
    puff.position.set((i - 2) * 1.15, 0.8 + (i % 2) * 0.4, 9.6);
    group.add(puff);
  }

  return group;
}

/** Colossal Ancient Carved Temple Guardian Monolith overlooking the jungle canyon */
export function buildColossalTempleGuardian(textures: ProceduralTexturePack): THREE.Group {
  const group = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xa88a62,
    map: textures.stoneAlbedo,
    roughness: 0.86,
    metalness: 0.05,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd9a441,
    roughness: 0.3,
    metalness: 0.8,
  });
  const eyeGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.0,
    roughness: 0.2,
  });
  const jadeMat = new THREE.MeshStandardMaterial({
    color: 0x0f766e,
    roughness: 0.35,
    metalness: 0.25,
  });

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(8.5, 5, 8.5), stoneMat);
  plinth.position.y = 2.5;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(6.4, 11, 5.2), stoneMat);
  torso.position.y = 10.5;
  const chestDisk = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.6, 14), goldMat);
  chestDisk.rotation.x = Math.PI / 2;
  chestDisk.position.set(0, 11.5, 2.75);
  const head = new THREE.Mesh(new THREE.BoxGeometry(5.6, 5.8, 5.0), stoneMat);
  head.position.y = 19;
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.65, 0.4), eyeGlowMat);
  eyeL.position.set(-1.35, 19.6, 2.55);
  const eyeR = eyeL.clone();
  eyeR.position.x = 1.35;
  const crownBase = new THREE.Mesh(new THREE.BoxGeometry(7.2, 1.5, 4.6), goldMat);
  crownBase.position.y = 22.6;
  const crownGem = new THREE.Mesh(new THREE.OctahedronGeometry(1.6, 0), jadeMat);
  crownGem.position.set(0, 24.8, 0.6);
  group.add(plinth, torso, chestDisk, head, eyeL, eyeR, crownBase, crownGem);
  return group;
}

/** Weathered Ruined Jungle Aqueduct Arch bridging the valley sides */
export function buildRuinedAqueductArch(textures: ProceduralTexturePack): THREE.Group {
  const group = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xb39368,
    map: textures.stoneAlbedo,
    roughness: 0.88,
  });
  const mossMat = new THREE.MeshStandardMaterial({
    color: 0x2a613c,
    roughness: 0.92,
  });

  for (const px of [-9, 0, 9]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(2.8, 22, 2.8), stoneMat);
    pillar.position.set(px, 11, 0);
    group.add(pillar);
  }
  const deck = new THREE.Mesh(new THREE.BoxGeometry(23, 2.4, 3.2), stoneMat);
  deck.position.y = 22.4;
  const mossDeck = new THREE.Mesh(new THREE.BoxGeometry(21, 0.55, 3.4), mossMat);
  mossDeck.position.y = 23.75;
  group.add(deck, mossDeck);
  return group;
}
