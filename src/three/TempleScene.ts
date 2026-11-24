import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CHARACTERS, MONSTERS, getCharacterById } from '../game/data';
import { LANE_SPACING, RaceEvent } from '../game/raceLogic';
import { CharacterId, CustomCharacterAsset, PlayerId, RaceState } from '../game/types';
import {
  AnimatedMonsterRig,
  AnimatedRunnerRig,
  buildColossalTempleGuardian,
  buildCustomGltfRunnerRig,
  buildCustomPictureRunnerRig,
  buildFinishSunGate,
  buildJungleCliffWaterfall,
  buildJungleFernCluster,
  buildJunglePalm,
  buildMonsterRig,
  buildObstacleMesh,
  buildRuinedAqueductArch,
  buildRunnerRig,
  buildSteppedPyramid,
  buildTempleArchway,
} from './models';
import {
  createProceduralTextures,
  createTempleSkyDome,
  ProceduralTexturePack,
} from './textures';

const TRACK_CENTER_X: [number, number] = [-46, 46];
const ROAD_WIDTH = 7.8;
const PARTICLE_COUNT = 220;

// Module-scope scratch objects to guarantee zero GC inside the render loop
const _mat4 = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _camGoal = new THREE.Vector3();
const _color = new THREE.Color();

interface Particle {
  active: boolean;
  life: number;
  maxLife: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  colorHex: number;
}

interface TrackObjects {
  root: THREE.Group;
  roadMesh: THREE.Mesh;
  parapetLeft: THREE.Mesh;
  parapetRight: THREE.Mesh;
  runnerRigs: Record<CharacterId, AnimatedRunnerRig>;
  obstacleGroup: THREE.Group;
  monsterPlazas: { physicalZ: number; rig: AnimatedMonsterRig }[];
  finishGate: THREE.Group;
  archways: { group: THREE.Group; flames: THREE.Mesh[]; z: number }[];
  palms: THREE.Group[];
  ferns: THREE.Group[];
  pedestalGroup: THREE.Group;
}

function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class TempleSceneController {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private isSoftwareGl: boolean;
  private textures: ProceduralTexturePack;
  private envRenderTarget: THREE.WebGLRenderTarget;
  private skyDome: THREE.Mesh;
  private gltfLoader = new GLTFLoader();

  private titleCamera: THREE.PerspectiveCamera;
  private playerCameras: [THREE.PerspectiveCamera, THREE.PerspectiveCamera];
  private sunLight: THREE.DirectionalLight;

  private tracks: [TrackObjects, TrackObjects];
  private builtObstacleSeed = -1;
  private builtMode = '';

  // Zero-GC pooled InstancedMesh particles + drifting golden temple fireflies
  private particles: Particle[] = [];
  private particleMesh: THREE.InstancedMesh;
  private particleCursor = 0;
  private fireflyPoints: THREE.Points | null = null;
  private dustCooldown: [number, number] = [0, 0];
  private previewJumpTimer: [number, number] = [0, 0];

  private frameId = 0;
  private disposed = false;
  private lastTimeMs = 0;
  private elapsedVisualTime = 0;
  private resizeObserver: ResizeObserver;

  private getState: () => RaceState;
  private onTick: (dt: number) => void;

  constructor(
    container: HTMLElement,
    getState: () => RaceState,
    onTick: (dt: number) => void,
  ) {
    this.container = container;
    this.getState = getState;
    this.onTick = onTick;
    this.isSoftwareGl = detectSoftwareGl();

    // 1. Modern WebGLRenderer with ACESFilmicToneMapping + Software-WebGL guard
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.96;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2),
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setScissorTest(false);

    const w = Math.max(container.clientWidth, 320);
    const h = Math.max(container.clientHeight, 240);
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';
    this.container.appendChild(this.renderer.domElement);

    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
    });

    // 2. Scene, Golden-Hour Sky Dome & Horizon-Matched Atmospheric Fog
    this.scene = new THREE.Scene();
    const skyColor = new THREE.Color(0xdcb985);
    this.scene.background = skyColor;
    this.scene.fog = new THREE.FogExp2(0xdcb985, 0.0076);

    this.skyDome = createTempleSkyDome();
    this.scene.add(this.skyDome);

    // 3. Mandatory Studio Environment Reflection (RoomEnvironment on every device)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.envRenderTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRenderTarget.texture;
    this.scene.environmentIntensity = 0.55;
    pmremGenerator.dispose();

    // 4. Warm Key Sun Light + Cool Sky/Ground Hemisphere Fill + Turquoise Rim
    const hemi = new THREE.HemisphereLight(0x8ecae6, 0x45331d, 0.62);
    hemi.position.set(0, 60, 0);
    this.scene.add(hemi);

    this.sunLight = new THREE.DirectionalLight(0xffe4ad, 1.38);
    this.sunLight.position.set(28, 48, 30);
    if (!this.isSoftwareGl) {
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.set(1024, 1024);
      this.sunLight.shadow.camera.near = 2;
      this.sunLight.shadow.camera.far = 140;
      const d = 32;
      this.sunLight.shadow.camera.left = -d;
      this.sunLight.shadow.camera.right = d;
      this.sunLight.shadow.camera.top = d;
      this.sunLight.shadow.camera.bottom = -d;
      this.sunLight.shadow.bias = -0.0005;
      this.sunLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.sunLight);

    const rimLight = new THREE.DirectionalLight(0x70d6cc, 0.48);
    rimLight.position.set(-25, 22, -40);
    this.scene.add(rimLight);

    // 5. Procedural + Generated Carved Sandstone Textures
    const maxAniso = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    this.textures = createProceduralTextures(maxAniso);

    // 6. Cameras
    this.titleCamera = new THREE.PerspectiveCamera(54, w / h, 0.2, 290);
    this.playerCameras = [
      new THREE.PerspectiveCamera(58, (w * 0.5) / h, 0.2, 260),
      new THREE.PerspectiveCamera(58, (w * 0.5) / h, 0.2, 260),
    ];

    // 7. Rich Jungle Gorge, Shimmering Turquoise River & Stepped Mayan Pyramids
    this.buildValleyBackdrop();

    // 8. Build Parallel Temple Tracks for Player 1 and Player 2
    this.tracks = [this.buildTrack(0), this.buildTrack(1)];
    this.syncTrackCourse(this.getState());

    // 9. Pooled InstancedMesh Particle System
    const pGeo = new THREE.DodecahedronGeometry(0.18, 0);
    const pMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
      metalness: 0.25,
    });
    this.particleMesh = new THREE.InstancedMesh(pGeo, pMat, PARTICLE_COUNT);
    this.particleMesh.frustumCulled = false;
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.particles.push({
        active: false,
        life: 0,
        maxLife: 1,
        x: 0,
        y: -100,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        size: 1,
        colorHex: 0xffffff,
      });
      _mat4.makeScale(0, 0, 0);
      this.particleMesh.setMatrixAt(i, _mat4);
      this.particleMesh.setColorAt(i, _color.setHex(0xffffff));
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.particleMesh);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.titleCamera);
    }

    // 10. Live ResizeObserver
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);

    // 11. Start Render Loop
    this.lastTimeMs = performance.now();
    this.tick();
  }

  /** Swap a character slot on both tracks with a custom uploaded picture or GLB 3D model (or null to restore default) */
  public setCustomCharacterAsset(
    charId: CharacterId,
    asset: CustomCharacterAsset | null,
  ): void {
    const charDef = getCharacterById(charId);

    const replaceOnBothTracks = (factory: () => AnimatedRunnerRig) => {
      for (let p = 0; p < 2; p++) {
        const track = this.tracks[p];
        const prev = track.runnerRigs[charId];
        if (prev) {
          track.root.remove(prev.root);
        }
        const nextRig = factory();
        nextRig.root.visible = false;
        track.root.add(nextRig.root);
        track.runnerRigs[charId] = nextRig;
      }
      this.renderScene(this.getState());
    };

    if (!asset) {
      replaceOnBothTracks(() => buildRunnerRig(charDef, this.textures));
      return;
    }

    if (asset.kind === 'image') {
      replaceOnBothTracks(() =>
        buildCustomPictureRunnerRig(asset.url, charDef.primaryColor, this.textures),
      );
      return;
    }

    if (asset.kind === 'glb') {
      this.gltfLoader.load(
        asset.url,
        (gltf) => {
          if (this.disposed) return;
          replaceOnBothTracks(() => buildCustomGltfRunnerRig(gltf.scene, this.textures));
        },
        undefined,
        () => {
          // Graceful fallback to built-in model if invalid file
          replaceOnBothTracks(() => buildRunnerRig(charDef, this.textures));
        },
      );
    }
  }

  private buildValleyBackdrop(): void {
    // Deep emerald jungle valley floor
    const valleyMat = new THREE.MeshStandardMaterial({
      color: 0x1f4730,
      roughness: 0.94,
      metalness: 0.0,
    });
    const valleyFloor = new THREE.Mesh(new THREE.PlaneGeometry(460, 2600), valleyMat);
    valleyFloor.rotation.x = -Math.PI / 2;
    valleyFloor.position.set(0, -14.5, -950);
    this.scene.add(valleyFloor);

    // Shimmering turquoise jungle rivers flowing beneath both temple viaducts
    const riverMat = new THREE.MeshStandardMaterial({
      color: 0x168a84,
      roughness: 0.18,
      metalness: 0.45,
    });
    for (const rx of [-66, -24, 24, 66]) {
      const river = new THREE.Mesh(new THREE.PlaneGeometry(14, 2400), riverMat);
      river.rotation.x = -Math.PI / 2;
      river.position.set(rx, -13.9, -950);
      this.scene.add(river);
    }

    // Stepped Ancient Mayan Ziggurat Pyramids flanking both temple causeways
    const pyramidSpots: [number, number, number][] = [
      [-76, -14, -55],
      [-20, -14, -120],
      [-78, -14, -220],
      [-20, -14, -340],
      [-76, -14, -470],
      [-20, -14, -620],
      [-78, -14, -820],
      [76, -14, -55],
      [20, -14, -120],
      [78, -14, -220],
      [20, -14, -340],
      [76, -14, -470],
      [20, -14, -620],
      [78, -14, -820],
    ];
    for (let i = 0; i < pyramidSpots.length; i++) {
      const [px, py, pz] = pyramidSpots[i];
      const ziggurat = buildSteppedPyramid(this.textures);
      ziggurat.position.set(px, py, pz);
      ziggurat.rotation.y = (i % 4) * (Math.PI / 2);
      const s = 0.96 + (i % 3) * 0.2;
      ziggurat.scale.set(s, s * 1.08, s);
      this.scene.add(ziggurat);
    }

    // Colossal Carved Sun-Temple Guardian Monoliths overlooking the canyon tracks
    const guardianSpots: [number, number, number, number][] = [
      [-64, -13.5, -88, 0.55],
      [-28, -13.5, -185, -0.55],
      [-64, -13.5, -310, 0.5],
      [-28, -13.5, -450, -0.5],
      [-64, -13.5, -610, 0.55],
      [28, -13.5, -88, 0.55],
      [64, -13.5, -185, -0.55],
      [28, -13.5, -310, 0.5],
      [64, -13.5, -450, -0.5],
      [28, -13.5, -610, 0.55],
    ];
    for (const [gx, gy, gz, rotY] of guardianSpots) {
      const guardian = buildColossalTempleGuardian(this.textures);
      guardian.position.set(gx, gy, gz);
      guardian.rotation.y = rotY;
      this.scene.add(guardian);
    }

    // Cascading Turquoise Jungle Cliff Waterfalls flanking the gorges
    const waterfallSpots: [number, number, number, number][] = [
      [-84, -14, -145, Math.PI * 0.35],
      [-12, -14, -255, -Math.PI * 0.35],
      [-84, -14, -415, Math.PI * 0.35],
      [-12, -14, -565, -Math.PI * 0.35],
      [-84, -14, -740, Math.PI * 0.35],
      [12, -14, -145, Math.PI * 0.35],
      [84, -14, -255, -Math.PI * 0.35],
      [12, -14, -415, Math.PI * 0.35],
      [84, -14, -565, -Math.PI * 0.35],
      [12, -14, -740, Math.PI * 0.35],
    ];
    for (const [wx, wy, wz, rotY] of waterfallSpots) {
      const waterfall = buildJungleCliffWaterfall(this.textures);
      waterfall.position.set(wx, wy, wz);
      waterfall.rotation.y = rotY;
      this.scene.add(waterfall);
    }

    // Ruined Ancient Stone Aqueduct Arches rising out of the jungle mist
    const aqueductSpots: [number, number, number, number][] = [
      [-70, -14, -32, 0.25],
      [-23, -14, -230, -0.25],
      [-70, -14, -515, 0.2],
      [23, -14, -32, -0.25],
      [70, -14, -230, 0.25],
      [23, -14, -515, -0.2],
    ];
    for (const [ax, ay, az, rotY] of aqueductSpots) {
      const aqueduct = buildRuinedAqueductArch(this.textures);
      aqueduct.position.set(ax, ay, az);
      aqueduct.rotation.y = rotY;
      this.scene.add(aqueduct);
    }

    // Sculpted Emerald Jungle Mountain Peaks & Canyon Ridges (instanced for speed)
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x3b4d38,
      roughness: 0.9,
      metalness: 0.04,
    });
    const peakMat = new THREE.MeshStandardMaterial({
      color: 0x1e5c39,
      roughness: 0.86,
      metalness: 0.02,
    });
    const baseGeo = new THREE.CylinderGeometry(8.5, 19, 24, 7);
    const peakGeo = new THREE.ConeGeometry(12.5, 22, 6);
    const ridgeCount = 44;
    const baseInstances = new THREE.InstancedMesh(baseGeo, rockMat, ridgeCount);
    const peakInstances = new THREE.InstancedMesh(peakGeo, peakMat, ridgeCount);
    const xs = [-96, -10, 10, 96];
    let idx = 0;
    for (let z = -20; z >= -1180 && idx < ridgeCount; z -= 105) {
      for (const mx of xs) {
        if (idx >= ridgeCount) break;
        const sx = 1.05 + ((idx * 17) % 40) / 100;
        const sy = 0.95 + ((idx * 23) % 55) / 100;
        const rz = z - (idx % 3) * 20;
        _pos.set(mx, -7 + sy * 5.5, rz);
        _quat.setFromEuler(new THREE.Euler(0, idx * 0.85, 0));
        _scale.set(sx, sy, sx);
        _mat4.compose(_pos, _quat, _scale);
        baseInstances.setMatrixAt(idx, _mat4);

        _pos.set(mx, 4.5 + sy * 9.5, rz);
        _quat.setFromEuler(new THREE.Euler(0, idx * 1.15, 0));
        _scale.set(sx * 0.95, sy * 1.12, sx * 0.95);
        _mat4.compose(_pos, _quat, _scale);
        peakInstances.setMatrixAt(idx, _mat4);
        idx++;
      }
    }
    baseInstances.computeBoundingSphere();
    peakInstances.computeBoundingSphere();
    this.scene.add(baseInstances, peakInstances);

    // Floating Golden Temple Fireflies / Sunlit Jungle Motes along both corridors
    const fireflyCount = 260;
    const positions = new Float32Array(fireflyCount * 3);
    for (let i = 0; i < fireflyCount; i++) {
      const trackCenter = i % 2 === 0 ? TRACK_CENTER_X[0] : TRACK_CENTER_X[1];
      const spreadX = ((i * 73) % 100) / 100 - 0.5;
      const spreadY = ((i * 41) % 100) / 100;
      const spreadZ = ((i * 97) % 1000) / 1000;
      positions[i * 3] = trackCenter + spreadX * 26;
      positions[i * 3 + 1] = 1.2 + spreadY * 10.5;
      positions[i * 3 + 2] = 10 - spreadZ * 900;
    }
    const fireflyGeo = new THREE.BufferGeometry();
    fireflyGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const fireflyMat = new THREE.PointsMaterial({
      color: 0xfde047,
      size: 0.42,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.fireflyPoints = new THREE.Points(fireflyGeo, fireflyMat);
    this.scene.add(this.fireflyPoints);
  }

  private buildTrack(playerId: PlayerId): TrackObjects {
    const root = new THREE.Group();
    root.position.set(TRACK_CENTER_X[playerId], 0, 0);
    this.scene.add(root);

    // Repeating carved stone temple road using shared generated paver texture
    const roadLen = 1400;
    const roadTex = this.textures.roadAlbedo;
    roadTex.repeat.set(1, roadLen / 8.5);
    const roadBumpTex = this.textures.roadBump;
    roadBumpTex.repeat.set(1, roadLen / 8.5);

    const roadMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: roadTex,
      bumpMap: roadBumpTex,
      bumpScale: 0.08,
      roughness: 0.78,
      metalness: 0.05,
    });
    const roadMesh = new THREE.Mesh(new THREE.BoxGeometry(ROAD_WIDTH, 1.2, roadLen), roadMat);
    roadMesh.position.set(0, -0.6, -roadLen * 0.5 + 30);
    roadMesh.receiveShadow = true;
    root.add(roadMesh);

    // Low carved stone side parapets along both edges of the temple causeway
    const parapetMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.textures.stoneAlbedo,
      bumpMap: this.textures.stoneBump,
      bumpScale: 0.06,
      roughness: 0.84,
      metalness: 0.04,
    });
    const parapetGeo = new THREE.BoxGeometry(0.66, 0.82, roadLen);
    const parapetLeft = new THREE.Mesh(parapetGeo, parapetMat);
    parapetLeft.position.set(-ROAD_WIDTH * 0.5 - 0.32, 0.38, -roadLen * 0.5 + 30);
    const parapetRight = new THREE.Mesh(parapetGeo, parapetMat);
    parapetRight.position.set(ROAD_WIDTH * 0.5 + 0.32, 0.38, -roadLen * 0.5 + 30);
    root.add(parapetLeft, parapetRight);

    // Build all 4 composite character rigs once and toggle visibility cleanly when selected
    const runnerRigs = {} as Record<CharacterId, AnimatedRunnerRig>;
    for (const ch of CHARACTERS) {
      const rig = buildRunnerRig(ch, this.textures);
      rig.root.visible = false;
      root.add(rig.root);
      runnerRigs[ch.id] = rig;
    }

    // Raised stone character-select staging pedestal at start of track
    const pedestalGroup = new THREE.Group();
    pedestalGroup.position.set(0, 0, 2.5);
    const pedBase = new THREE.Mesh(new THREE.CylinderGeometry(1.72, 2.05, 0.44, 8), parapetMat);
    pedBase.position.y = 0.22;
    const pedGold = new THREE.Mesh(
      new THREE.CylinderGeometry(1.78, 1.78, 0.08, 8),
      new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.28, metalness: 0.82 }),
    );
    pedGold.position.y = 0.44;
    pedestalGroup.add(pedBase, pedGold);
    root.add(pedestalGroup);

    // Repeating Temple Archways & Torch Braziers
    const archways: TrackObjects['archways'] = [];
    for (let i = 0; i < 10; i++) {
      const { group, flames } = buildTempleArchway(this.textures);
      const z = -i * 28 - 14;
      group.position.set(0, 0, z);
      root.add(group);
      archways.push({ group, flames, z });
    }

    // Lush flanking arched Jungle Palm groves
    const palms: THREE.Group[] = [];
    for (let i = 0; i < 20; i++) {
      const palm = buildJunglePalm();
      const side = i % 2 === 0 ? -1 : 1;
      const z = -i * 14 - 4;
      palm.position.set(side * (6.2 + (i % 3) * 1.4), -0.6, z);
      palm.rotation.y = i * 1.3;
      const s = 0.88 + (i % 4) * 0.1;
      palm.scale.setScalar(s);
      root.add(palm);
      palms.push(palm);
    }

    // Lush tropical fern clusters hugging the outer causeway parapet
    const ferns: THREE.Group[] = [];
    for (let i = 0; i < 18; i++) {
      const fern = buildJungleFernCluster();
      const side = i % 2 === 0 ? -1 : 1;
      const z = -i * 16 - 6;
      fern.position.set(side * (ROAD_WIDTH * 0.5 + 0.85), 0.1, z);
      fern.rotation.y = i * 0.9;
      root.add(fern);
      ferns.push(fern);
    }

    const obstacleGroup = new THREE.Group();
    root.add(obstacleGroup);

    const finishGate = buildFinishSunGate(this.textures);
    root.add(finishGate);

    return {
      root,
      roadMesh,
      parapetLeft,
      parapetRight,
      runnerRigs,
      obstacleGroup,
      monsterPlazas: [],
      finishGate,
      archways,
      palms,
      ferns,
      pedestalGroup,
    };
  }

  public syncTrackCourse(state: RaceState): void {
    if (this.builtObstacleSeed === state.seed && this.builtMode === state.config.mode) {
      return;
    }
    this.builtObstacleSeed = state.seed;
    this.builtMode = state.config.mode;

    const scaleZ = state.config.worldUnitsPerPhysicalMeter;
    const finishWorldZ = -state.config.physicalTargetMeters * scaleZ;

    for (let p = 0; p < 2; p++) {
      const track = this.tracks[p];

      while (track.obstacleGroup.children.length > 0) {
        track.obstacleGroup.remove(track.obstacleGroup.children[0]);
      }
      for (const mp of track.monsterPlazas) {
        track.root.remove(mp.rig.root);
      }
      track.monsterPlazas = [];

      for (const obs of state.obstacles) {
        const mesh = buildObstacleMesh(obs.kind, this.textures);
        const worldX = obs.spansAllLanes ? 0 : obs.lane * LANE_SPACING;
        const worldZ = -obs.physicalZ * scaleZ;
        mesh.position.set(worldX, 0, worldZ);
        mesh.userData.physicalZ = obs.physicalZ;
        track.obstacleGroup.add(mesh);
      }

      state.config.triviaTriggerDisplayMeters.forEach((dispMeters, idx) => {
        const physicalZ = dispMeters / state.config.displayMultiplier;
        const monsterDef = MONSTERS[idx % MONSTERS.length];
        const rig = buildMonsterRig(monsterDef, this.textures);
        rig.root.position.set(0, 0, -physicalZ * scaleZ - 5.2);
        track.root.add(rig.root);
        track.monsterPlazas.push({ physicalZ, rig });
      });

      track.finishGate.position.set(0, 0, finishWorldZ);
    }
  }

  public triggerEventEffects(event: RaceEvent, state: RaceState): void {
    const scaleZ = state.config.worldUnitsPerPhysicalMeter;
    const spawnBurst = (
      playerId: PlayerId,
      count: number,
      colors: number[],
      speedScale: number,
      upBoost: number,
      yOffset = 0.5,
    ) => {
      const p = state.players[playerId];
      const baseX = TRACK_CENTER_X[playerId] + p.laneX;
      const baseY = p.y + yOffset;
      const baseZ = -p.physicalDistance * scaleZ;

      for (let i = 0; i < count; i++) {
        const slot = this.particles[this.particleCursor];
        this.particleCursor = (this.particleCursor + 1) % PARTICLE_COUNT;
        const angle = Math.random() * Math.PI * 2;
        const horiz = (0.4 + Math.random() * 0.9) * speedScale;
        slot.active = true;
        slot.life = 0;
        slot.maxLife = 0.45 + Math.random() * 0.55;
        slot.x = baseX + (Math.random() - 0.5) * 0.6;
        slot.y = baseY + Math.random() * 0.35;
        slot.z = baseZ + (Math.random() - 0.5) * 0.6;
        slot.vx = Math.cos(angle) * horiz;
        slot.vy = upBoost * (0.6 + Math.random() * 0.85);
        slot.vz = Math.sin(angle) * horiz;
        slot.size = 0.65 + Math.random() * 0.75;
        slot.colorHex = colors[i % colors.length];
      }
    };

    if (event.type === 'jump' || event.type === 'land') {
      spawnBurst(event.playerId, 7, [0xe6c999, 0xc9a675, 0xfef3c7], 2.4, 2.2, 0.15);
    } else if (event.type === 'select_preview' || (event.type === 'select_lock' && event.locked)) {
      this.previewJumpTimer[event.playerId] = 0.72;
      const ch = getCharacterById(state.players[event.playerId].characterId);
      const baseX = TRACK_CENTER_X[event.playerId];
      for (let i = 0; i < 16; i++) {
        const slot = this.particles[this.particleCursor];
        this.particleCursor = (this.particleCursor + 1) % PARTICLE_COUNT;
        const angle = (i / 16) * Math.PI * 2;
        slot.active = true;
        slot.life = 0;
        slot.maxLife = 0.55 + Math.random() * 0.35;
        slot.x = baseX + Math.cos(angle) * 0.65;
        slot.y = 0.75 + Math.random() * 0.5;
        slot.z = 2.5 + Math.sin(angle) * 0.65;
        slot.vx = Math.cos(angle) * (2.2 + Math.random() * 1.4);
        slot.vy = 3.8 + Math.random() * 2.5;
        slot.vz = Math.sin(angle) * (2.2 + Math.random() * 1.4);
        slot.size = 0.55 + Math.random() * 0.45;
        slot.colorHex = i % 2 === 0 ? ch.primaryColor : 0xfacc15;
      }
    } else if (event.type === 'obstacle_hit') {
      const isChasm =
        event.obstacle.kind === 'broken_path_lane' ||
        event.obstacle.kind === 'broken_path_full';
      const colors = isChasm
        ? [0x2dd4bf, 0x0f766e, 0xc9a675, 0xf59e0b]
        : [0xc9a675, 0x8b6a3e, 0xf59e0b, 0x3f7a44];
      spawnBurst(event.playerId, 20, colors, 5.2, 5.8, isChasm ? 0.45 : 0.8);
    } else if (event.type === 'trivia_correct') {
      spawnBurst(event.playerId, 24, [0xfacc15, 0x2dd4bf, 0xfef08a, 0x34d399], 4.5, 6.8, 1.4);
    } else if (event.type === 'race_win') {
      spawnBurst(event.winnerId, 48, [0xfacc15, 0x2dd4bf, 0xf97316, 0xef4444, 0xffffff], 6.4, 9.5, 1.8);
    }
  }

  private updateParticles(dt: number): void {
    let anyChanged = false;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      anyChanged = true;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        _mat4.makeScale(0, 0, 0);
        this.particleMesh.setMatrixAt(i, _mat4);
        continue;
      }
      p.vy -= 14.5 * dt;
      p.x += p.vx * dt;
      p.y = Math.max(0.08, p.y + p.vy * dt);
      p.z += p.vz * dt;

      const t = 1 - p.life / p.maxLife;
      const s = p.size * t;
      _pos.set(p.x, p.y, p.z);
      _quat.setFromEuler(new THREE.Euler(p.life * 5, p.life * 3.5, 0));
      _scale.set(s, s, s);
      _mat4.compose(_pos, _quat, _scale);
      this.particleMesh.setMatrixAt(i, _mat4);
      this.particleMesh.setColorAt(i, _color.setHex(p.colorHex));
    }
    if (anyChanged) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
      if (this.particleMesh.instanceColor) {
        this.particleMesh.instanceColor.needsUpdate = true;
      }
    }
  }

  private updateWorldVisuals(state: RaceState, dt: number): void {
    const scaleZ = state.config.worldUnitsPerPhysicalMeter;
    const isSelect = state.phase === 'select';
    const isTitle = state.phase === 'title';

    for (let pIdx = 0; pIdx < 2; pIdx++) {
      const pId = pIdx as PlayerId;
      const player = state.players[pId];
      const track = this.tracks[pId];

      const playerWorldZ = isSelect ? 2.5 : -player.physicalDistance * scaleZ;
      const playerWorldX = isSelect ? 0 : player.laneX;

      track.pedestalGroup.visible = isSelect;

      const roadAnchorZ = Math.floor(playerWorldZ / 85) * 85 - 500;
      track.roadMesh.position.z = roadAnchorZ;
      track.parapetLeft.position.z = roadAnchorZ;
      track.parapetRight.position.z = roadAnchorZ;

      const spanArch = track.archways.length * 28;
      for (const arch of track.archways) {
        while (arch.group.position.z > playerWorldZ + 26) {
          arch.group.position.z -= spanArch;
        }
        while (arch.group.position.z < playerWorldZ - spanArch + 26) {
          arch.group.position.z += spanArch;
        }
        const flicker = 0.86 + Math.sin(this.elapsedVisualTime * 11 + arch.z) * 0.22;
        for (const flame of arch.flames) {
          flame.scale.set(1, flicker, 1);
        }
      }

      const spanPalm = track.palms.length * 14;
      for (let i = 0; i < track.palms.length; i++) {
        const palm = track.palms[i];
        while (palm.position.z > playerWorldZ + 22) {
          palm.position.z -= spanPalm;
        }
        while (palm.position.z < playerWorldZ - spanPalm + 22) {
          palm.position.z += spanPalm;
        }
        palm.rotation.z = Math.sin(this.elapsedVisualTime * 1.4 + i) * 0.035;
      }

      const spanFern = track.ferns.length * 16;
      for (let i = 0; i < track.ferns.length; i++) {
        const fern = track.ferns[i];
        while (fern.position.z > playerWorldZ + 22) {
          fern.position.z -= spanFern;
        }
        while (fern.position.z < playerWorldZ - spanFern + 22) {
          fern.position.z += spanFern;
        }
      }

      for (const ch of CHARACTERS) {
        const rig = track.runnerRigs[ch.id];
        const isActive = ch.id === player.characterId;
        rig.root.visible = isActive && !isTitle;
        if (!isActive) continue;

        if (isSelect) {
          this.previewJumpTimer[pId] = Math.max(0, this.previewJumpTimer[pId] - dt);
          const previewJumpProgress =
            this.previewJumpTimer[pId] > 0 ? 1 - this.previewJumpTimer[pId] / 0.72 : 0;
          rig.root.position.set(0, 0.48, 2.5);
          rig.root.rotation.y = Math.sin(this.elapsedVisualTime * 0.85 + pIdx) * 0.35;
          rig.updateAnimation({
            dt,
            time: this.elapsedVisualTime,
            speed: 0,
            stridePhase: 0,
            y: 0,
            grounded: true,
            hitFlash: false,
            squashX: 1,
            squashY: 1,
            celebrating: false,
            idleMode: true,
            lockedPose: state.select.locked[pId],
            previewJumpProgress,
          });
        } else {
          rig.root.position.set(playerWorldX, 0, playerWorldZ);
          const celebrating = state.phase === 'gameover' && state.winnerId === pId;
          const targetYaw = celebrating ? 0 : Math.PI;
          const bankZ = (player.lane * LANE_SPACING - player.laneX) * 0.14;
          rig.root.rotation.y = targetYaw;
          rig.root.rotation.z = celebrating ? 0 : bankZ;

          rig.updateAnimation({
            dt,
            time: this.elapsedVisualTime,
            speed: player.activeTrivia ? 0 : player.speed,
            stridePhase: player.stridePhase,
            y: player.y,
            grounded: player.grounded,
            hitFlash: player.hitFlashTimer > 0,
            squashX: player.squashX,
            squashY: player.squashY,
            celebrating,
            idleMode: state.phase === 'countdown' || Boolean(player.activeTrivia),
            lockedPose: false,
          });
        }
      }

      for (let mIdx = 0; mIdx < track.monsterPlazas.length; mIdx++) {
        const mp = track.monsterPlazas[mIdx];
        let mood: 'idle' | 'asking' | 'happy' | 'grumpy' = 'idle';
        if (mIdx < player.nextTriviaIndex) {
          mood = 'happy';
        } else if (player.activeTrivia && player.activeTrivia.encounterIndex === mIdx) {
          mood = player.activeTrivia.outcome === 'wrong_penalty' ? 'grumpy' : 'asking';
        }
        mp.rig.update(this.elapsedVisualTime, mood);
      }

      const cam = this.playerCameras[pId];
      const worldCenterX = TRACK_CENTER_X[pId];

      if (isSelect) {
        cam.position.set(worldCenterX, 2.08, 6.25);
        cam.fov = 43;
        cam.updateProjectionMatrix();
        _lookTarget.set(worldCenterX, 1.32, 2.5);
        cam.lookAt(_lookTarget);
      } else if (state.phase === 'gameover' && state.winnerId === pId) {
        const orbitAngle = this.elapsedVisualTime * 0.65;
        _camGoal.set(
          worldCenterX + playerWorldX + Math.sin(orbitAngle) * 4.4,
          2.55,
          playerWorldZ + Math.cos(orbitAngle) * 4.4,
        );
        const alpha = 1 - Math.exp(-5 * dt);
        cam.position.lerp(_camGoal, alpha);
        _lookTarget.set(worldCenterX + playerWorldX, 1.38, playerWorldZ);
        cam.lookAt(_lookTarget);
      } else if (player.activeTrivia) {
        _camGoal.set(worldCenterX + playerWorldX * 0.4 + 1.35, 3.3, playerWorldZ + 5.8);
        const alpha = 1 - Math.exp(-6 * dt);
        cam.position.lerp(_camGoal, alpha);
        _lookTarget.set(worldCenterX, 2.15, playerWorldZ - 4.8);
        cam.lookAt(_lookTarget);
      } else {
        const shake = player.cameraShake * player.cameraShake;
        const shakeX = (Math.random() - 0.5) * shake * 0.55;
        const shakeY = (Math.random() - 0.5) * shake * 0.4;

        _camGoal.set(
          worldCenterX + playerWorldX * 0.66 + shakeX,
          3.65 + player.y * 0.35 + shakeY,
          playerWorldZ + 6.0,
        );
        const alpha = 1 - Math.exp(-11 * dt);
        if (cam.position.distanceTo(_camGoal) > 25) {
          cam.position.copy(_camGoal);
        } else {
          cam.position.lerp(_camGoal, alpha);
        }

        const targetFov = 56 + (player.speed / Math.max(1, state.config.baseSpeed)) * 8.0;
        if (Math.abs(cam.fov - targetFov) > 0.08) {
          cam.fov += (targetFov - cam.fov) * (1 - Math.exp(-8 * dt));
          cam.updateProjectionMatrix();
        }

        _lookTarget.set(worldCenterX + playerWorldX * 0.38, 1.48 + player.y * 0.2, playerWorldZ - 11.5);
        cam.lookAt(_lookTarget);
      }

      // High-speed sandstone footstep dust puffs
      if (state.phase === 'playing' && player.grounded && !player.activeTrivia && player.speed > 5.5) {
        this.dustCooldown[pId] -= dt;
        if (this.dustCooldown[pId] <= 0) {
          this.dustCooldown[pId] = 0.12;
          const slot = this.particles[this.particleCursor];
          this.particleCursor = (this.particleCursor + 1) % PARTICLE_COUNT;
          slot.active = true;
          slot.life = 0;
          slot.maxLife = 0.34;
          slot.x = worldCenterX + playerWorldX + (Math.random() - 0.5) * 0.45;
          slot.y = 0.14;
          slot.z = playerWorldZ + 0.45;
          slot.vx = (Math.random() - 0.5) * 1.1;
          slot.vy = 1.2 + Math.random() * 1.1;
          slot.vz = 1.6 + Math.random() * 1.2;
          slot.size = 0.38 + Math.random() * 0.25;
          slot.colorHex = 0xd9b882;
        }
      }
    }

    if (this.fireflyPoints) {
      this.fireflyPoints.position.y = Math.sin(this.elapsedVisualTime * 0.9) * 0.65;
      this.fireflyPoints.position.x = Math.cos(this.elapsedVisualTime * 0.5) * 0.45;
    }

    if (isTitle) {
      const flyZ = -((this.elapsedVisualTime * 8.5) % 140) - 10;
      const swayX = Math.sin(this.elapsedVisualTime * 0.45) * 1.65;
      this.titleCamera.position.set(TRACK_CENTER_X[0] + swayX, 4.6, flyZ);
      _lookTarget.set(TRACK_CENTER_X[0], 2.2, flyZ - 26);
      this.titleCamera.lookAt(_lookTarget);
    }

    if (state.phase === 'gameover' && state.winnerId !== null && Math.random() < dt * 3.8) {
      this.triggerEventEffects({ type: 'race_win', winnerId: state.winnerId }, state);
    }

    this.updateParticles(dt);
  }

  private renderScene(state: RaceState): void {
    const w = this.renderer.domElement.clientWidth || this.container.clientWidth || 1280;
    const h = this.renderer.domElement.clientHeight || this.container.clientHeight || 720;

    if (state.phase === 'title') {
      this.skyDome.position.copy(this.titleCamera.position);
      this.renderer.setScissorTest(false);
      this.renderer.setViewport(0, 0, w, h);
      this.titleCamera.aspect = w / Math.max(h, 1);
      this.titleCamera.updateProjectionMatrix();
      this.renderer.render(this.scene, this.titleCamera);
      return;
    }

    const halfW = Math.floor(w / 2);
    const rightW = w - halfW;
    const aspectL = halfW / Math.max(h, 1);
    const aspectR = rightW / Math.max(h, 1);

    this.renderer.setScissorTest(true);

    // Left viewport: Player 1
    this.skyDome.position.copy(this.playerCameras[0].position);
    this.playerCameras[0].aspect = aspectL;
    this.playerCameras[0].updateProjectionMatrix();
    this.renderer.setViewport(0, 0, halfW, h);
    this.renderer.setScissor(0, 0, halfW, h);
    this.renderer.render(this.scene, this.playerCameras[0]);

    // Right viewport: Player 2
    this.skyDome.position.copy(this.playerCameras[1].position);
    this.playerCameras[1].aspect = aspectR;
    this.playerCameras[1].updateProjectionMatrix();
    this.renderer.setViewport(halfW, 0, rightW, h);
    this.renderer.setScissor(halfW, 0, rightW, h);
    this.renderer.render(this.scene, this.playerCameras[1]);

    this.renderer.setScissorTest(false);
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const status = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (status === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = (): void => {
    if (this.disposed) return;

    const now = performance.now();
    const rawDt = (now - this.lastTimeMs) / 1000;
    this.lastTimeMs = now;
    const clampedDt = Math.min(Math.max(rawDt, 0.001), 0.05);

    this.elapsedVisualTime += clampedDt;
    this.onTick(clampedDt);

    const state = this.getState();
    this.syncTrackCourse(state);
    this.updateWorldVisuals(state, clampedDt);
    this.renderScene(state);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private handleResize(): void {
    if (this.disposed) return;
    const w = Math.max(this.container.clientWidth, 320);
    const h = Math.max(this.container.clientHeight, 240);
    this.renderer.setSize(w, h, false);
    this.renderScene(this.getState());
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.resizeObserver.disconnect();
    if (this.fireflyPoints) {
      this.fireflyPoints.geometry.dispose();
      (this.fireflyPoints.material as THREE.Material).dispose();
    }
    this.textures.dispose();
    this.envRenderTarget.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
