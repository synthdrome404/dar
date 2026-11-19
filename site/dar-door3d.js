/* ДАР — 3D-вход (вариант A). Модуль загружается лениво из dar-entry.js.
   three.js и модель берутся только из локальных файлов рядом с этим модулем (относительные пути).
   Модуль ничего не знает о прокрутке: он рисует кадр для прогресса t ∈ [0, 1], который ему передают. */
import * as THREE from './vendor/three/three.module.js';
import { GLTFLoader } from './vendor/three/GLTFLoader.js';
import { RoomEnvironment } from './vendor/three/RoomEnvironment.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (a, b, v) => clamp((v - a) / (b - a));
const smooth = (a, b, v) => { v = seg(a, b, v); return v * v * (3 - 2 * v); };
const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/* Timeline (shared with dar-entry.js through the exported constants). */
export const TIMELINE = {
  doors: [0.04, 0.34],   // leaves swing open
  dolly: [0.00, 0.56],   // camera travels from the street into the doorway (dar-entry.js hands off to the page at 0.62)
};

/* Camera framing at t = 0.
   Landscape: the portal stands on the right, the copy on the left (lens shift instead of tilt keeps verticals straight).
   Portrait (phones, tablets upright): the copy is on top; dar-entry.js passes the free band below it
   (fractions of the canvas height) and the portal — floor to crest, 7.95 m — is fitted into that band. */
const PORTAL_H = 7.95, PORTAL_W = 7.0, PORTAL_CY = 3.95, PLANE_Z = 0.4;
function preset(aspect, frame) {
  if (!frame || !frame.portrait) return { fov: 34, z0: 16.4, eye0: 3.95, shiftX: -0.215, shiftY: 0.035 };
  const fov = 42, tan = Math.tan(THREE.MathUtils.degToRad(fov / 2)), eye0 = 3.7;
  const top = clamp(frame.top, 0.2, 0.7), bottom = clamp(frame.bottom, top + 0.25, 0.98);
  const Hv = Math.max(PORTAL_H / (bottom - top), PORTAL_W / aspect);
  const centre = (top + bottom) / 2;
  return { fov, z0: PLANE_Z + Hv / (2 * tan), eye0, shiftX: 0, shiftY: 0.5 - (PORTAL_CY - eye0) / Hv - centre };
}

/* One light rig for the scene and for the hero frame render (assets/portal-frame.webp). */
export const LIGHT = { env: 0.32, hemi: 0.55, key: 2.6, keyPos: [-8.5, 9.5, 7], fill: 0.3, exposure: 1.06 };
export function addLights(scene, renderer, { shadowSize = 2048, L = LIGHT } = {}) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  scene.environmentIntensity = L.env;
  pmrem.dispose();
  room.dispose?.();
  const hemi = new THREE.HemisphereLight('#fff8ec', '#7f7a6c', L.hemi);
  scene.add(hemi);
  const key = new THREE.DirectionalLight('#fff1dc', L.key);
  key.position.set(...L.keyPos);
  key.castShadow = true;
  key.shadow.mapSize.set(shadowSize, shadowSize);
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 10, bottom: -2, near: 1, far: 40 });
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.04;
  key.shadow.radius = 3;
  scene.add(key);
  const fill = new THREE.DirectionalLight('#d3e3dc', L.fill);
  fill.position.set(8, 5, 6);
  scene.add(fill);
  return { hemi, key, fill };
}

export function tagMesh(o) {
  const m = (o.material && o.material.name) || '';
  let p = o, hinge = false;
  while (p) { if (/Hinge/.test(p.name)) hinge = true; p = p.parent; }
  if (hinge) return 'door';
  if (/Plaster/.test(m)) return 'wall';
  if (/Floor|Stone joints/.test(m)) return 'floor';
  if (/crest/i.test(m) || /Crest/.test(o.name)) return 'crest';
  if (/Sconce|satin aged/.test(m)) return 'sconce';
  if (/enamel forest/.test(m)) return 'plaque';
  return 'portal';
}

export function prepareGate(gate, { shadows = true } = {}) {
  gate.traverse((o) => {
    if (!o.isMesh) return;
    o.userData.tag = tagMesh(o);
    o.castShadow = shadows && o.userData.tag !== 'floor';
    o.receiveShadow = shadows;
    if (o.userData.tag === 'crest') {
      o.material = new THREE.MeshBasicMaterial({ map: o.material.map, transparent: true, side: THREE.DoubleSide, toneMapped: false });
      o.castShadow = false;
    }
    if (o.userData.tag === 'sconce' && /Sconce/.test(o.material.name)) o.material.emissiveIntensity = 1.15;
  });
  return gate;
}

/* Background plate: the classroom photo drawn in screen space, exactly where the page will place it
   at the hand-off (rect in CSS px, from dar-entry.js), so the switch from canvas to <img> is pixel-exact. */
function makePlate(texture) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: texture }, rect: { value: new THREE.Vector4(0, 0, 1, 1) }, size: { value: new THREE.Vector2(1, 1) } },
    vertexShader: 'void main(){gl_Position=vec4(position.xy,0.0,1.0);}',
    fragmentShader: 'uniform sampler2D map;uniform vec4 rect;uniform vec2 size;\n' +
      'void main(){vec2 p=vec2(gl_FragCoord.x,size.y-gl_FragCoord.y);vec2 uv=(p-rect.xy)/rect.zw;uv.y=1.0-uv.y;\n' +
      'gl_FragColor=texture2D(map,clamp(uv,0.0,1.0));\n#include <colorspace_fragment>\n}',
    depthTest: false, depthWrite: false, toneMapped: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -100;
  return mesh;
}

// The model ships as base64 inside JSON (assets/3d/dar-entrance.glb.json): some static hosts, the Artifact
// preview among them, refuse to serve .glb files. A plain .glb URL still loads directly.
export async function loadModel(url) {
  const loader = new GLTFLoader();
  if (!/\.json(?:[?#]|$)/.test(url)) return loader.loadAsync(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error('model ' + res.status + ' ' + url);
  const s = atob((await res.json()).glb);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return loader.parseAsync(bytes.buffer, new URL('.', url).href);
}

export async function createDoor({ canvas, glbUrl, photoUrl, mobile }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = LIGHT.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.localClippingEnabled = true;
  renderer.setClearColor('#e9e1d1', 1);

  const scene = new THREE.Scene();
  const lights = addLights(scene, renderer, { shadowSize: mobile ? 1024 : 2048 });
  const spill = new THREE.PointLight('#ffdcaa', 0, 14, 1.6);
  spill.position.set(0, 3.4, -2.2);
  scene.add(spill);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 200);

  const [gltf, texture] = await Promise.all([
    loadModel(glbUrl),
    new THREE.TextureLoader().loadAsync(photoUrl),
  ]);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  const gate = prepareGate(gltf.scene);
  // the floor stops at the threshold: behind the wall the classroom photo begins
  const cut = [new THREE.Plane(new THREE.Vector3(0, 0, 1), 1.0)];
  let plaster = null;
  gate.traverse((o) => {
    if (!o.isMesh) return;
    if (o.userData.tag === 'floor') { o.material = o.material.clone(); o.material.clippingPlanes = cut; }
    if (o.userData.tag === 'wall') plaster = o.material;
  });
  // an endless wall around the model, with the same arched opening (4 × 6 m, radius 2 m)
  const shape = new THREE.Shape();
  shape.moveTo(-120, -40); shape.lineTo(120, -40); shape.lineTo(120, 90); shape.lineTo(-120, 90); shape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-2.005, -0.01); hole.lineTo(2.005, -0.01); hole.lineTo(2.005, 4); hole.absarc(0, 4, 2.005, 0, Math.PI, false); hole.lineTo(-2.005, -0.01);
  shape.holes.push(hole);
  const wall = new THREE.Mesh(new THREE.ShapeGeometry(shape, 48), plaster || new THREE.MeshStandardMaterial({ color: '#ebe3d4', roughness: 0.9 }));
  wall.position.z = 0.06;                      // 1 cm in front of the model's plaster face: one continuous wall
  wall.receiveShadow = true;
  gate.add(wall);
  // the street floor continues towards the camera (narrow screens look further down)
  let stone = null;
  gate.traverse((o) => { if (o.isMesh && /large honed/.test(o.material.name || '')) stone = o.material; });
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(140, 60), stone || new THREE.MeshStandardMaterial({ color: '#d8ccb4', roughness: 0.8 }));
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(0, -0.03, 30.6);
  apron.receiveShadow = true;
  gate.add(apron);
  scene.add(gate);
  const leafL = gate.getObjectByName('Hinge_L');
  const leafR = gate.getObjectByName('Hinge_R');

  const plate = makePlate(texture);
  scene.add(plate);

  let W = 1, H = 1, P = preset(1.6), dpr = 1;
  function setSize(w, h, pixelRatio, frame) {
    W = Math.max(1, Math.round(w)); H = Math.max(1, Math.round(h));
    dpr = pixelRatio;
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    P = preset(camera.aspect, frame);
    camera.fov = P.fov;
    camera.updateProjectionMatrix();
  }

  const tmp = new THREE.Vector3();
  function render(t, rect) {
    const d = TIMELINE;
    // doors: ease-in-out swing to 100°
    const open = easeInOutCubic(seg(d.doors[0], d.doors[1], t));
    const angle = open * 1.74;
    leafL.rotation.y = angle;
    leafR.rotation.y = -angle;
    // camera: exponential approach (perceptually even zoom), eased at both ends
    const x = seg(d.dolly[0], d.dolly[1], t), k = x * x;   // soft start, then through the doorway
    const zV = -6, D0 = P.z0 - zV, D1 = 2.2 - zV;   // at z = 2.2 the opening already fills the frame
    const z = zV + D0 * Math.pow(D1 / D0, k);
    const centre = smooth(0.05, 0.5, t);
    const eye = THREE.MathUtils.lerp(P.eye0, 3.35, smooth(0.0, 0.55, t));
    camera.position.set(0, eye, z);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, eye, z - 10);
    const sx = P.shiftX * (1 - centre), sy = P.shiftY * (1 - centre);
    camera.setViewOffset(W, H, W * sx, H * sy, W, H);
    // light from the classroom grows as the leaves part
    spill.intensity = 26 * smooth(0.05, 0.45, t);
    lights.key.intensity = LIGHT.key - 0.35 * smooth(0.3, 0.56, t);
    // plate in device pixels
    const u = plate.material.uniforms;
    u.rect.value.set(rect.x * dpr, rect.y * dpr, rect.w * dpr, rect.h * dpr);
    u.size.value.set(W * dpr, H * dpr);
    plate.visible = open > 0.002 || z < 0.7;
    renderer.render(scene, camera);
  }

  function dispose() {
    renderer.dispose();
    texture.dispose();
    scene.environment?.dispose?.();
  }
  return { setSize, render, dispose, renderer, get pixelRatio() { return dpr; } };
}
