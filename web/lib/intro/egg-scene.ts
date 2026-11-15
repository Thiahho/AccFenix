/*
 * Real-time 3D egg intro (three.js). Loaded through a dynamic import only on a first visit, see intro-scene.tsx.
 *
 * Beats (lib/intro/timeline.ts): the egg drops in with squash & stretch, rocks on its base, a crack runs around the
 * shell, the halves split with flying shards and a glossy jiggling yolk, then the camera dives into the yolk while the
 * page settles underneath. The canvas is transparent: the brand-red gradient behind it is the CSS overlay.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  crackHeight,
  easeInOutCubic,
  easeInQuad,
  easeOutCubic,
  eggRadius,
  INTRO,
  phase,
  seeded,
  spring,
} from "@/lib/intro/timeline";

/** Brand mark printed on the shell, like the logo: script font in brand red. */
export type IntroWordmark = { text: string; fontFamily: string };

export type IntroHooks = {
  /** The page under the overlay should start settling. */
  onReveal: () => void;
  /** The overlay should fade out. */
  onFade: () => void;
  /** Scene finished and was disposed. */
  onEnd: () => void;
};

const U_SEGMENTS = 128;
const V_SEGMENTS = 40;
const SHELL_COLOR = "#f3e5d0";
const YOLK_Y = -0.12;

/** Point on the egg surface; u is the angle around (0 = facing the camera), v the height (0 bottom → 1 top). */
function surfacePoint(u: number, v: number, out = new THREE.Vector3(), inflate = 1) {
  const y = -1 + 2 * v;
  const r = eggRadius(y) * inflate;
  const theta = 2 * Math.PI * u + Math.PI / 2;
  return out.set(r * Math.cos(theta), y, r * Math.sin(theta));
}

/** Analytic normal of the surface of revolution: (cos θ, -r'(y), sin θ), normalised. */
function surfaceNormal(u: number, v: number, out = new THREE.Vector3()) {
  const y = Math.min(0.9995, Math.max(-0.9995, -1 + 2 * v));
  const h = 1e-4;
  const slope = (eggRadius(y + h) - eggRadius(y - h)) / (2 * h);
  const theta = 2 * Math.PI * u + Math.PI / 2;
  return out.set(Math.cos(theta), -slope, Math.sin(theta)).normalize();
}

/** One shell half, cut exactly along the zigzag crack so both halves meet without a gap. */
function shellHalf(lower: boolean) {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();

  for (let i = 0; i <= U_SEGMENTS; i++) {
    const u = i / U_SEGMENTS;
    const crack = crackHeight(u);
    const [v0, v1] = lower ? [0, crack] : [crack, 1];
    for (let j = 0; j <= V_SEGMENTS; j++) {
      const v = v0 + ((v1 - v0) * j) / V_SEGMENTS;
      surfacePoint(u, v, p);
      surfaceNormal(u, v, n);
      positions.push(p.x, p.y, p.z);
      normals.push(n.x, n.y, n.z);
      // u grows towards the viewer's left, so the texture's x runs mirrored to keep printed text readable.
      uvs.push(1 - u, v);
    }
  }
  const row = V_SEGMENTS + 1;
  for (let i = 0; i < U_SEGMENTS; i++) {
    for (let j = 0; j < V_SEGMENTS; j++) {
      const a = i * row + j;
      const b = (i + 1) * row + j;
      // Counter-clockwise seen from outside, so the outer face is the front face.
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

/**
 * Eggshell albedo: warm cream with fine speckles, a slightly deeper tone towards the base and the wordmark printed
 * on the front, just under the crack so it stays on screen after the split.
 */
function shellTexture(wordmark: IntroWordmark) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  const gradient = ctx.createLinearGradient(0, 512, 0, 0);
  gradient.addColorStop(0, "#e9d6bb");
  gradient.addColorStop(0.5, SHELL_COLOR);
  gradient.addColorStop(1, "#f8eddc");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 512);
  const random = seeded(11);
  for (let i = 0; i < 4200; i++) {
    const dark = random() < 0.7;
    ctx.fillStyle = dark ? `rgba(150,110,70,${0.05 + random() * 0.12})` : `rgba(255,255,255,${0.1 + random() * 0.2})`;
    ctx.beginPath();
    ctx.arc(random() * 1024, random() * 512, 0.4 + random() * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // The front of the egg is u = 0, i.e. the texture seam: print the mark centred on both edges so it wraps whole.
  ctx.font = `140px ${wordmark.fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Deeper than the brand red (#B3121B) on purpose: ACES tone mapping and the key light wash it out on screen.
  ctx.fillStyle = "#8f0a12";
  ctx.strokeStyle = "rgba(90, 0, 0, 0.35)";
  ctx.lineWidth = 1.5;
  // Nudged off the seam to centre the script optically (its "y" tail makes the advance-width centre sit too far right).
  for (const x of [-22, 1002]) {
    ctx.fillText(wordmark.text, x, 345);
    ctx.strokeText(wordmark.text, x, 345);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

/** Soft contact shadow: a radial gradient on a floor plane (cheaper and softer than shadow maps). */
function shadowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, "rgba(40,0,0,0.75)");
  gradient.addColorStop(0.45, "rgba(40,0,0,0.3)");
  gradient.addColorStop(1, "rgba(40,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

/** Crack drawn on the surface, growing from the front towards the back; `direction` picks the side. */
function crackTube(direction: 1 | -1, material: THREE.Material) {
  const points: THREE.Vector3[] = [];
  for (let k = 0; k <= 96; k++) {
    const u = (direction * 0.5 * k) / 96;
    points.push(surfacePoint(u, crackHeight(u), new THREE.Vector3(), 1.01));
  }
  const geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 192, 0.0075, 6, false);
  return new THREE.Mesh(geometry, material);
}

type Shard = { mesh: THREE.Mesh; from: THREE.Vector3; velocity: THREE.Vector3; spin: THREE.Vector3 };

function shards(material: THREE.Material, parent: THREE.Object3D) {
  const random = seeded(7);
  const list: Shard[] = [];
  for (let i = 0; i < 22; i++) {
    const u = (random() - 0.5) * 0.8;
    const v = crackHeight(u) + (random() - 0.5) * 0.04;
    const size = 0.04 + random() * 0.09;
    const shape = new THREE.Shape([
      new THREE.Vector2(0, 0),
      new THREE.Vector2(size, (random() - 0.5) * size * 0.4),
      new THREE.Vector2(size * (0.2 + random() * 0.6), size * (0.6 + random() * 0.6)),
    ]);
    const geometry = new THREE.ShapeGeometry(shape);
    geometry.center();
    const mesh = new THREE.Mesh(geometry, material);
    const from = surfacePoint(u, v);
    const outward = new THREE.Vector3(from.x, 0, from.z).normalize();
    const velocity = outward.multiplyScalar(1.1 + random() * 1.8).add(new THREE.Vector3(0, 1.2 + random() * 2, 0));
    const spin = new THREE.Vector3((random() - 0.5) * 16, (random() - 0.5) * 16, (random() - 0.5) * 16);
    mesh.visible = false;
    parent.add(mesh);
    list.push({ mesh, from, velocity, spin });
  }
  return list;
}

/** Starts the intro on `canvas`. Throws when WebGL is unavailable. Returns a function that stops and disposes it. */
export function playEggIntro(canvas: HTMLCanvasElement, wordmark: IntroWordmark, hooks: IntroHooks) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environment;
  scene.environmentIntensity = 0.6;

  const key = new THREE.DirectionalLight("#fff1dc", 2.6);
  key.position.set(2.5, 4, 4);
  const rim = new THREE.DirectionalLight("#ffb089", 1.8);
  rim.position.set(-3.5, 2, -3);
  scene.add(key, rim);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 50);
  const cameraFrom = new THREE.Vector3(0, 0.9, 6);
  const lookFrom = new THREE.Vector3(0, -0.1, 0);

  // pivot sits on the floor, so squash and rocking happen around the egg's base.
  const pivot = new THREE.Group();
  pivot.position.y = -1;
  const egg = new THREE.Group();
  egg.position.y = 1;
  pivot.add(egg);
  scene.add(pivot);

  const shellMap = shellTexture(wordmark);
  const shell = new THREE.MeshPhysicalMaterial({
    map: shellMap,
    roughness: 0.58,
    clearcoat: 0.18,
    clearcoatRoughness: 0.45,
    sheen: 0.15,
    sheenColor: new THREE.Color("#fff4e2"),
    side: THREE.DoubleSide,
  });
  const top = new THREE.Mesh(shellHalf(false), shell);
  const bottom = new THREE.Mesh(shellHalf(true), shell);
  egg.add(top, bottom);

  const crackMaterial = new THREE.MeshBasicMaterial({ color: "#4a3123" });
  const cracks = [crackTube(1, crackMaterial), crackTube(-1, crackMaterial)];
  egg.add(...cracks);

  const yolkMaterial = new THREE.MeshPhysicalMaterial({
    color: "#f7a514",
    emissive: "#e07000",
    emissiveIntensity: 0.3,
    roughness: 0.26,
    clearcoat: 0.8,
    clearcoatRoughness: 0.12,
    // Fewer studio-window reflections: a yolk is glossy, not a polished ball.
    envMapIntensity: 0.4,
  });
  const yolk = new THREE.Mesh(new THREE.SphereGeometry(0.4, 64, 48), yolkMaterial);
  yolk.position.y = YOLK_Y;
  egg.add(yolk);

  const flying = shards(shell, egg);

  const shadowMap = shadowTexture();
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 2.6),
    new THREE.MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.998;
  scene.add(shadow);

  const resize = () => {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Keep the egg inside narrow (portrait) screens: widen the vertical FOV until ±1.35 units fit horizontally.
    const fitFov = THREE.MathUtils.radToDeg(2 * Math.atan(1.35 / 6 / camera.aspect));
    camera.fov = Math.max(32, fitFov);
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize);

  // Compile every shader up front (hidden meshes included) so the first animated frames do not stutter.
  yolk.visible = true;
  for (const s of flying) s.mesh.visible = true;
  camera.position.copy(cameraFrom);
  camera.lookAt(lookFrom);
  renderer.compile(scene, camera);
  yolk.visible = false;
  for (const s of flying) s.mesh.visible = false;

  const yolkWorld = new THREE.Vector3();
  const cameraTo = new THREE.Vector3();
  const look = new THREE.Vector3();
  const diveOffset = new THREE.Vector3(0, 0.5, 0.36); // from above the open shell, never through its wall
  let revealed = false;
  let faded = false;
  let frame = 0;
  let stopped = false;
  const start = performance.now();

  const update = (t: number) => {
    // Drop with stretch, then a landing squash.
    const fall = phase(t, INTRO.drop);
    const height = 4.5 * (1 - easeInQuad(fall));
    pivot.position.y = -1 + height;
    const squash = 0.14 * spring(t - INTRO.drop[1], 3.4, 7);
    const stretch = fall < 1 ? 0.08 * fall : 0;
    pivot.scale.set(1 + squash * 0.5 - stretch * 0.4, 1 - squash + stretch, 1 + squash * 0.5 - stretch * 0.4);

    // Rocking on the base, and a sharp shudder when the shell gives way.
    pivot.rotation.z = 0.2 * spring(t - INTRO.wobble[0], 2.6, 3) + 0.035 * spring(t - INTRO.crack[0], 9, 9);
    pivot.rotation.x = 0.05 * spring(t - INTRO.wobble[0] - 0.12, 2.2, 3);

    shadow.material.opacity = 0.25 + 0.75 * (1 - height / 4.5);
    shadow.scale.setScalar(0.55 + 0.45 * (1 - height / 4.5));

    // Crack grows from the front around both sides.
    const crackProgress = easeOutCubic(phase(t, INTRO.crack));
    for (const tube of cracks) {
      const count = tube.geometry.index?.count ?? 0;
      tube.geometry.setDrawRange(0, Math.floor((count * crackProgress) / 6) * 6);
      tube.visible = t < INTRO.split + 0.02 && crackProgress > 0;
    }

    // Split: the top flies up and away, the bottom tilts to show the yolk.
    const ts = t - INTRO.split;
    const open = easeOutCubic(phase(t, [INTRO.split, INTRO.split + 0.6]));
    top.position.set(-0.35 * open, 1.9 * open, 0.25 * open);
    top.rotation.set(-0.6 * open, 0.3 * open, 0.85 * open);
    bottom.rotation.x = 0.16 * open;
    bottom.position.y = -0.05 * open;

    yolk.visible = ts > -0.01;
    const jiggle = 0.1 * spring(ts, 3, 4.5);
    // A yolk sits slightly flattened; the jiggle squashes and stretches around that rest shape.
    yolk.scale.set(1.04 - jiggle * 0.5, 0.86 + jiggle, 1.04 - jiggle * 0.5);
    yolk.position.y = YOLK_Y + 0.08 * open;
    yolk.position.z = 0.06 * open;

    for (const s of flying) {
      s.mesh.visible = ts > 0 && ts < 1.2;
      if (!s.mesh.visible) continue;
      s.mesh.position.set(
        s.from.x + s.velocity.x * ts,
        s.from.y + s.velocity.y * ts - 4.9 * ts * ts,
        s.from.z + s.velocity.z * ts,
      );
      s.mesh.rotation.set(s.spin.x * ts, s.spin.y * ts, s.spin.z * ts);
    }

    // Camera dives into the yolk.
    const dive = easeInOutCubic(phase(t, INTRO.dive));
    yolk.getWorldPosition(yolkWorld);
    cameraTo.copy(yolkWorld).add(diveOffset);
    camera.position.lerpVectors(cameraFrom, cameraTo, dive);
    look.lerpVectors(lookFrom, yolkWorld, dive);
    camera.lookAt(look);
  };

  const dispose = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", resize);
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
      }
    });
    for (const material of [shell, crackMaterial, yolkMaterial, shadow.material]) material.dispose();
    for (const texture of [shellMap, shadowMap, environment]) texture.dispose();
    pmrem.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  };

  const tick = () => {
    const t = (performance.now() - start) / 1000;
    update(t);
    renderer.render(scene, camera);
    if (!revealed && t >= INTRO.reveal) {
      revealed = true;
      hooks.onReveal();
    }
    if (!faded && t >= INTRO.fade[0]) {
      faded = true;
      hooks.onFade();
    }
    if (t >= INTRO.end) {
      dispose();
      hooks.onEnd();
      return;
    }
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);

  return dispose;
}
