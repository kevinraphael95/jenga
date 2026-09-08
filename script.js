import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ─── RENDERER ────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

// ─── SCENE ───────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x1a1008, 0.045);

// ─── PHYSICS ─────────────────────────────────────────────────────────────────
const world = new CANNON.World();
world.gravity.set(0, -18, 0);
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true;

const defaultMat = new CANNON.Material('default');
const contactMat = new CANNON.ContactMaterial(defaultMat, defaultMat, {
  friction: 0.65, restitution: 0.04
});
world.addContactMaterial(contactMat);

// ─── CAMERA ──────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.05, 200);
camera.position.set(0, 5, 12);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 3, 0);
controls.minDistance = 4;
controls.maxDistance = 22;
controls.minPolarAngle = 0.1;
controls.maxPolarAngle = Math.PI * 0.52;
controls.update();

// ─── LIGHTING ────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xfff0dc, 0.35));

const sunLight = new THREE.DirectionalLight(0xffe8c0, 1.8);
sunLight.position.set(6, 14, 8);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 50;
sunLight.shadow.camera.left = -10;
sunLight.shadow.camera.right = 10;
sunLight.shadow.camera.top = 10;
sunLight.shadow.camera.bottom = -10;
sunLight.shadow.bias = -0.001;
scene.add(sunLight);

const fillLight = new THREE.PointLight(0x4466aa, 0.6, 30);
fillLight.position.set(-5, 8, -3);
scene.add(fillLight);

const rimLight = new THREE.SpotLight(0xffd090, 0.8, 25, 0.5);
rimLight.position.set(-4, 10, -6);
scene.add(rimLight);

// ─── ENVIRONMENT ─────────────────────────────────────────────────────────────
const floorGeo = new THREE.PlaneGeometry(60, 60, 40, 40);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x2a1f0f, roughness: 0.95, metalness: 0 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI/2;
floor.receiveShadow = true;
scene.add(floor);

const floorBody = new CANNON.Body({ mass: 0, material: defaultMat });
floorBody.addShape(new CANNON.Plane());
floorBody.quaternion.setFromEuler(-Math.PI/2, 0, 0);
world.addBody(floorBody);

const TABLE_H = 1.0;
const TABLE_TOP = TABLE_H + 0.08;
const tableGeo = new THREE.BoxGeometry(5, 0.16, 5);
const tableMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.7, metalness: 0.05 });
const tableMesh = new THREE.Mesh(tableGeo, tableMat);
tableMesh.position.y = TABLE_H;
tableMesh.receiveShadow = true;
tableMesh.castShadow = true;
scene.add(tableMesh);

const legGeo = new THREE.CylinderGeometry(0.08, 0.08, TABLE_H, 8);
const legMat = new THREE.MeshStandardMaterial({ color: 0x3d2610, roughness: 0.9 });
[[-2,2],[2,2],[-2,-2],[2,-2]].forEach(([x,z]) => {
  const leg = new THREE.Mesh(legGeo, legMat);
  leg.position.set(x, TABLE_H/2, z);
  leg.castShadow = true;
  scene.add(leg);
});

const tableBody = new CANNON.Body({ mass: 0, material: defaultMat });
tableBody.addShape(new CANNON.Box(new CANNON.Vec3(2.5, 0.08, 2.5)));
tableBody.position.set(0, TABLE_H, 0);
world.addBody(tableBody);

const edgeGeo = new THREE.EdgesGeometry(tableGeo);
const edgeMat = new THREE.LineBasicMaterial({ color: 0x8b5e30, transparent: true, opacity: 0.4 });
const edges = new THREE.LineSegments(edgeGeo, edgeMat);
edges.position.copy(tableMesh.position);
scene.add(edges);

// ─── JENGA BLOCKS ────────────────────────────────────────────────────────────
const BW = 0.75; // largeur (grand axe)
const BH = 0.25; // hauteur
const BD = 0.25; // profondeur
const GAP = 0.005;
const COLORS = [0xe8c87a, 0xd4a855, 0xc49040, 0xdfc070, 0xeba840, 0xcc9030];

const objects = []; // { mesh, body, removed }

function createBlock(x, y, z) {
  const mat = new THREE.MeshStandardMaterial({
    color: COLORS[Math.floor(Math.random()*COLORS.length)],
    roughness: 0.72, metalness: 0.04
  });
  const geo = new THREE.BoxGeometry(BW, BH, BD);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const eg = new THREE.EdgesGeometry(geo);
  const el = new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: 0x7a4f10, transparent: true, opacity: 0.35 }));
  mesh.add(el);
  scene.add(mesh);

  const body = new CANNON.Body({ mass: 0.4, material: defaultMat, linearDamping: 0.3, angularDamping: 0.6 });
  body.addShape(new CANNON.Box(new CANNON.Vec3(BW/2, BH/2, BD/2)));
  body.position.set(x, y, z);
  body.allowSleep = true;
  body.sleepSpeedLimit = 0.05;
  body.sleepTimeLimit = 0.5;
  world.addBody(body);

  objects.push({ mesh, body, removed: false });
  return objects[objects.length - 1];
}

const NUM_ROWS = 18;
function buildTower() {
  const BASE_Y = TABLE_TOP + BH/2;
  for (let row = 0; row < NUM_ROWS; row++) {
    const y = BASE_Y + row * (BH + GAP);
    for (let col = 0; col < 3; col++) {
      const offset = (col - 1) * (BD + GAP);
      if (row % 2 === 0) createBlock(offset, y, 0);
      else createBlock(0, y, offset);
    }
  }
}
buildTower();

// ─── GHOSTS DE PLACEMENT ─────────────────────────────────────────────────────
const ghostGroup = new THREE.Group();
scene.add(ghostGroup);
const ghostMeshes = [];
for (let i = 0; i < 3; i++) {
  const g = new THREE.Mesh(
    new THREE.BoxGeometry(BW, BH, BD),
    new THREE.MeshBasicMaterial({ color: 0xe8d5a3, transparent: true, opacity: 0.22 })
  );
  g.visible = false;
  ghostGroup.add(g);
  ghostMeshes.push(g);
}

// ─── AUDIO (synthétisé, aucun fichier requis) ───────────────────────────────
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } else if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}
function playSound(type) {
  if (!audioCtx) return;
  try {
    const t = audioCtx.currentTime;
    if (type === 'pull') {
      const size = audioCtx.sampleRate * 0.3;
      const buffer = audioCtx.createBuffer(1, size, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < size; i++) data[i] = (Math.random()*2-1) * (1 - i/size) * 0.3;
      const src = audioCtx.createBufferSource();
      src.buffer = buffer;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1300;
      src.connect(filter); filter.connect(audioCtx.destination);
      src.start();
    } else if (type === 'place') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(190, t);
      osc.frequency.exponentialRampToValueAtTime(65, t + 0.15);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(t); osc.stop(t + 0.24);
    } else if (type === 'collapse') {
      const size = audioCtx.sampleRate * 1.1;
      const buffer = audioCtx.createBuffer(1, size, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < size; i++) data[i] = (Math.random()*2-1) * (1 - i/size);
      const src = audioCtx.createBufferSource();
      src.buffer = buffer;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 900;
      const gain = audioCtx.createGain();
      gain.gain.value = 0.55;
      src.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
      src.start();
    }
  } catch (err) { /* audio non bloquant */ }
}

// ─── ÉTAT DE JEU ─────────────────────────────────────────────────────────────
let gameStarted = false;
let gamePhase = 'PULL'; // PULL | PLACE | WAIT | OVER
let currentPlayer = 1;
let totalPlayers = 2;
let lastActingPlayer = 1;
let pulledBlock = null;
let moveCount = 0;
let gameOver = false;

// UI refs
const valNiveau = document.getElementById('val-niveau');
const valBlocs = document.getElementById('val-blocs');
const valJoueur = document.getElementById('val-joueur');
const turnBanner = document.getElementById('turn-banner');
const statusMsg = document.getElementById('status-msg');
const gameoverScreen = document.getElementById('gameover-screen');
const gameoverWinner = document.getElementById('gameover-winner');
const startScreen = document.getElementById('start-screen');
const playerBtns = document.querySelectorAll('.player-btn');
const startPlayBtn = document.getElementById('start-play-btn');
const gameoverBtn = document.getElementById('gameover-btn');

function showStatus(msg, dur = 2500) {
  statusMsg.textContent = msg;
  statusMsg.style.opacity = '1';
  clearTimeout(showStatus._t);
  showStatus._t = setTimeout(() => { statusMsg.style.opacity = '0'; }, dur);
}

function updateUI() {
  const remaining = objects.filter(o => !o.removed).length;
  valNiveau.textContent = Math.ceil(remaining / 3) || '—';
  valBlocs.textContent = moveCount;
  valJoueur.textContent = `${currentPlayer} / ${totalPlayers}`;
  if (gamePhase === 'PULL') turnBanner.textContent = `JOUEUR ${currentPlayer} — GLISSEZ UN BLOC`;
  else if (gamePhase === 'PLACE') turnBanner.textContent = `JOUEUR ${currentPlayer} — CHOISISSEZ UN EMPLACEMENT`;
  else if (gamePhase === 'WAIT') turnBanner.textContent = `STABILISATION…`;
}

// ─── ÉCRAN DE DÉMARRAGE ──────────────────────────────────────────────────────
let selectedPlayers = 2;
playerBtns.forEach(btn => {
  if (Number(btn.dataset.players) === selectedPlayers) btn.classList.add('active');
  btn.addEventListener('click', () => {
    selectedPlayers = Number(btn.dataset.players);
    playerBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});
startPlayBtn.addEventListener('click', () => {
  ensureAudio();
  totalPlayers = selectedPlayers;
  gameStarted = true;
  startScreen.classList.add('hidden');
  updateUI();
  showStatus(`Joueur 1 — glissez un bloc pour commencer !`, 4000);
});
gameoverBtn.addEventListener('click', () => location.reload());

// ─── OUTILS DE ROTATION / RANGÉE ─────────────────────────────────────────────
function getRowOf(obj) {
  return Math.round((obj.body.position.y - TABLE_TOP - BH/2) / (BH + GAP));
}
function getTopRow() {
  let maxRow = 0;
  objects.forEach(o => { if (!o.removed) maxRow = Math.max(maxRow, getRowOf(o)); });
  return maxRow;
}
function countInRow(row) {
  return objects.filter(o => !o.removed && getRowOf(o) === row).length;
}
function canPull(obj) {
  if (obj.removed) return false;
  const topRow = getTopRow();
  const row = getRowOf(obj);
  if (row >= topRow - 1) return false;       // 2 étages du haut protégés
  if (countInRow(row) <= 1) return false;    // dernier support d'un étage protégé
  return true;
}
function computeNextRowSlots() {
  const topRow = getTopRow();
  const nextRow = topRow + 1;
  const rotY = (nextRow % 2 === 0) ? 0 : Math.PI/2;
  const y = TABLE_TOP + BH/2 + nextRow * (BH + GAP);
  const occupied = objects
    .filter(o => !o.removed && getRowOf(o) === nextRow)
    .map(o => (nextRow % 2 === 0 ? o.body.position.x : o.body.position.z));
  const slots = [];
  for (let col = 0; col < 3; col++) {
    const offset = (col - 1) * (BD + GAP);
    const occ = occupied.some(v => Math.abs(v - offset) < 0.1);
    slots.push({
      x: nextRow % 2 === 0 ? offset : 0,
      y,
      z: nextRow % 2 === 0 ? 0 : offset,
      rotY,
      valid: !occ
    });
  }
  return slots;
}
function showPlacementGhosts() {
  const slots = computeNextRowSlots();
  slots.forEach((s, i) => {
    const g = ghostMeshes[i];
    if (s.valid) {
      g.position.set(s.x, s.y, s.z);
      g.rotation.y = s.rotY;
      g.visible = true;
      g.userData.slot = s;
      g.material.opacity = 0.22;
    } else {
      g.visible = false;
    }
  });
}
function hidePlacementGhosts() {
  ghostMeshes.forEach(g => g.visible = false);
}

// ─── TWEENS SIMPLES (retour en place / mise en main) ────────────────────────
const activeTweens = [];
function tweenPosition(body, target, onDone) {
  activeTweens.push({ body, target: target.clone(), onDone });
}
function processTweens() {
  for (let i = activeTweens.length - 1; i >= 0; i--) {
    const tw = activeTweens[i];
    const p = tw.body.position;
    p.x += (tw.target.x - p.x) * 0.22;
    p.y += (tw.target.y - p.y) * 0.22;
    p.z += (tw.target.z - p.z) * 0.22;
    const dist = Math.hypot(tw.target.x - p.x, tw.target.y - p.y, tw.target.z - p.z);
    if (dist < 0.01) {
      p.set(tw.target.x, tw.target.y, tw.target.z);
      if (tw.onDone) tw.onDone();
      activeTweens.splice(i, 1);
    }
  }
}

// ─── RAYCASTING & INTERACTION ────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredObj = null;

function getBlockMeshes() {
  return objects.filter(o => !o.removed).map(o => o.mesh);
}
function updateMouseFromEvent(e) {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
}

// ─── TIRAGE PAR GLISSEMENT ───────────────────────────────────────────────────
let dragging = false;
let dragObj = null;
const dragAxisWorld = new THREE.Vector3();
const dragPlane = new THREE.Plane();
const dragStartWorldPos = new THREE.Vector3();
let dragDistance = 0;
const PULL_THRESHOLD = BW * 0.62;
const PULL_MAX = BW * 1.6;

function onMouseDown(e) {
  if (!gameStarted || gameOver || e.button !== 0) return;
  if (gamePhase !== 'PULL' || pulledBlock) return;
  updateMouseFromEvent(e);
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(getBlockMeshes());
  if (hits.length === 0) return;
  const obj = objects.find(o => o.mesh === hits[0].object);
  if (!obj) return;
  if (!canPull(obj)) { showStatus('Ce bloc ne peut pas être retiré !'); return; }

  dragging = true;
  dragObj = obj;
  dragObj.body.type = CANNON.Body.KINEMATIC;
  dragObj.body.mass = 0;
  dragObj.body.updateMassProperties();
  dragObj.body.velocity.setZero();
  dragObj.body.angularVelocity.setZero();

  const q = new THREE.Quaternion(dragObj.body.quaternion.x, dragObj.body.quaternion.y, dragObj.body.quaternion.z, dragObj.body.quaternion.w);
  dragAxisWorld.set(1, 0, 0).applyQuaternion(q).normalize();
  dragStartWorldPos.copy(dragObj.body.position);

  const normal = new THREE.Vector3().crossVectors(dragAxisWorld, new THREE.Vector3(0, 1, 0));
  if (normal.lengthSq() < 1e-6) normal.set(0, 0, 1);
  normal.normalize();
  dragPlane.setFromNormalAndCoplanarPoint(normal, dragStartWorldPos);
  dragDistance = 0;
  renderer.domElement.style.cursor = 'grabbing';
}

function cancelDrag() {
  const obj = dragObj;
  dragging = false;
  dragObj = null;
  renderer.domElement.style.cursor = 'default';
  tweenPosition(obj.body, dragStartWorldPos, () => {
    obj.body.type = CANNON.Body.DYNAMIC;
    obj.body.mass = 0.4;
    obj.body.updateMassProperties();
  });
}

function finalizePull(obj) {
  dragging = false;
  dragObj = null;
  renderer.domElement.style.cursor = 'default';
  obj.removed = true;
  playSound('pull');
  const holdTarget = new THREE.Vector3(3.6, TABLE_TOP + 7.5, 0);
  tweenPosition(obj.body, holdTarget, () => {
    obj.mesh.material.emissive.setHex(0xe8c87a);
    obj.mesh.material.emissiveIntensity = 0.3;
  });
  pulledBlock = obj;
  gamePhase = 'PLACE';
  moveCount++;
  showPlacementGhosts();
  showStatus('Bloc retiré ! Cliquez un emplacement en surbrillance.', 3000);
  updateUI();
}

function onMouseUp() {
  if (!dragging || !dragObj) return;
  if (Math.abs(dragDistance) > PULL_THRESHOLD) finalizePull(dragObj);
  else cancelDrag();
}

function onMouseMove(e) {
  if (!gameStarted || gameOver) return;
  updateMouseFromEvent(e);

  if (dragging && dragObj) {
    raycaster.setFromCamera(mouse, camera);
    const pt = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(dragPlane, pt)) {
      const delta = pt.clone().sub(dragStartWorldPos);
      let d = delta.dot(dragAxisWorld);
      d = Math.max(-0.08, Math.min(PULL_MAX, d));
      dragDistance = d;
      const newPos = dragStartWorldPos.clone().add(dragAxisWorld.clone().multiplyScalar(d));
      dragObj.body.position.set(newPos.x, newPos.y, newPos.z);
    }
    return;
  }

  if (gamePhase === 'PULL' && !pulledBlock) {
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(getBlockMeshes());
    if (hoveredObj) {
      if (!hoveredObj.removed) {
        hoveredObj.mesh.material.emissive.setHex(0x000000);
        hoveredObj.mesh.material.emissiveIntensity = 0;
      }
      hoveredObj = null;
    }
    if (hits.length > 0) {
      const obj = objects.find(o => o.mesh === hits[0].object);
      if (obj && canPull(obj)) {
        hoveredObj = obj;
        obj.mesh.material.emissive.setHex(0xffffff);
        obj.mesh.material.emissiveIntensity = 0.18;
        renderer.domElement.style.cursor = 'grab';
        return;
      }
    }
    renderer.domElement.style.cursor = 'default';
  } else if (gamePhase === 'PLACE' && pulledBlock) {
    raycaster.setFromCamera(mouse, camera);
    const visibleGhosts = ghostMeshes.filter(g => g.visible);
    const hits = raycaster.intersectObjects(visibleGhosts);
    ghostMeshes.forEach(g => { g.material.opacity = 0.22; });
    if (hits.length > 0) {
      hits[0].object.material.opacity = 0.55;
      renderer.domElement.style.cursor = 'pointer';
    } else {
      renderer.domElement.style.cursor = 'default';
    }
  }
}

function onClick(e) {
  if (!gameStarted || gameOver) return;
  if (gamePhase !== 'PLACE' || !pulledBlock) return;
  updateMouseFromEvent(e);
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(ghostMeshes.filter(g => g.visible));
  if (hits.length > 0) placeBlockAt(hits[0].object.userData.slot);
  else showStatus('Choisissez un emplacement en surbrillance.');
}

function placeBlockAt(slot) {
  if (!pulledBlock) return;
  pulledBlock.body.type = CANNON.Body.DYNAMIC;
  pulledBlock.body.mass = 0.4;
  pulledBlock.body.updateMassProperties();
  pulledBlock.body.position.set(slot.x, slot.y + 1.6, slot.z);
  pulledBlock.body.velocity.set(0, -2, 0);
  pulledBlock.body.angularVelocity.setZero();
  pulledBlock.body.quaternion.setFromEuler(0, slot.rotY, 0);
  pulledBlock.removed = false;
  pulledBlock.mesh.material.emissive.setHex(0x000000);
  pulledBlock.mesh.material.emissiveIntensity = 0;
  playSound('place');

  pulledBlock = null;
  hidePlacementGhosts();
  gamePhase = 'WAIT';
  lastActingPlayer = currentPlayer;
  showStatus('Bloc posé ! Stabilisation…', 1800);
  updateUI();

  setTimeout(() => { if (!gameOver) endTurn(); }, 2600);
}

function endTurn() {
  currentPlayer = (currentPlayer % totalPlayers) + 1;
  gamePhase = 'PULL';
  pulledBlock = null;
  updateUI();
  showStatus(`Au tour du Joueur ${currentPlayer}`, 2000);
}

// Clic droit : annule la pose en cours, le bloc retombe ailleurs sur la tour
renderer.domElement.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (gamePhase === 'PLACE' && pulledBlock) {
    showStatus('Pose annulée — le bloc est remis en jeu');
    pulledBlock.body.type = CANNON.Body.DYNAMIC;
    pulledBlock.body.mass = 0.4;
    pulledBlock.body.updateMassProperties();
    pulledBlock.body.position.set((Math.random()-0.5)*6, TABLE_TOP + 12, (Math.random()-0.5)*6);
    pulledBlock.removed = false;
    pulledBlock = null;
    hidePlacementGhosts();
    lastActingPlayer = currentPlayer;
    endTurn();
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && dragging && dragObj) cancelDrag();
});

renderer.domElement.addEventListener('mousedown', onMouseDown);
renderer.domElement.addEventListener('mousemove', onMouseMove);
window.addEventListener('mouseup', onMouseUp);
renderer.domElement.addEventListener('click', onClick);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── DÉTECTION D'EFFONDREMENT ────────────────────────────────────────────────
let fellFrames = 0;
function checkFall() {
  if (!gameStarted) return;
  let anyFell = false;
  objects.forEach(o => {
    if (!o.removed && o.body.position.y < TABLE_H - 0.5) anyFell = true;
  });
  if (anyFell) {
    fellFrames++;
    if (fellFrames > 15 && !gameOver) triggerGameOver();
  } else {
    fellFrames = 0;
  }
}
function triggerGameOver() {
  gameOver = true;
  gamePhase = 'OVER';
  playSound('collapse');
  gameoverWinner.textContent = `Le Joueur ${lastActingPlayer} a fait tomber la tour.`;
  gameoverScreen.classList.add('visible');
}

// ─── BOUCLE D'ANIMATION ──────────────────────────────────────────────────────
let camTargetY = 3;
const clock = new THREE.Clock();
let lastPhysicsTime = 0;
const PHYS_STEP = 1/120;

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const now = clock.elapsedTime;

  let steps = 0;
  while (lastPhysicsTime < now && steps < 5) {
    world.step(PHYS_STEP);
    lastPhysicsTime += PHYS_STEP;
    steps++;
  }

  objects.forEach(o => {
    o.mesh.position.copy(o.body.position);
    o.mesh.quaternion.copy(o.body.quaternion);
  });

  processTweens();

  if (gameStarted && !gameOver) {
    const topRow = getTopRow();
    const topY = TABLE_TOP + topRow * (BH + GAP) + 1.5;
    camTargetY += (topY - camTargetY) * 0.015;
    controls.target.y += (camTargetY - controls.target.y) * 0.03;
  }

  checkFall();
  controls.update();
  renderer.render(scene, camera);
}

updateUI();
animate();
