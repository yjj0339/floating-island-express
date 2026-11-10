import * as THREE from 'three';
import { World } from './world.js';
import { Plane } from './plane.js';
import { GameAudio } from './audio.js';
import { t, setLang, applyI18n, islandName, getLang } from './i18n.js';

/* ------------------------------------------------------------------- setup */
const SAVE_KEY = 'fie.save.v1';

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.4, 3200);
camera.position.set(0, 60, 100);

const world = new World(scene);
const plane = new Plane(scene);
const audio = new GameAudio();

const el = (id) => document.getElementById(id);
const ui = {
  start: el('startScreen'),
  hud: el('hud'),
  pause: el('pauseScreen'),
  result: el('resultScreen'),
  score: el('scoreVal'),
  best: el('bestVal'),
  bestStart: el('bestStart'),
  speed: el('speedVal'),
  speedFill: el('speedFill'),
  boostFill: el('boostFill'),
  boostPct: el('boostPct'),
  dots: el('dots'),
  timer: el('timer'),
  reticle: el('reticle'),
  reticleLbl: el('reticleLbl'),
  toast: el('toast'),
  flash: el('flash'),
  touch: el('touch'),
  stickZone: el('stickZone'),
  stickKnob: el('stickKnob'),
  boostBtn: el('boostBtn'),
  routeSub: el('routeSub'),
  soundOn: el('soundOnIcon'),
  soundOff: el('soundOffIcon'),
  resultScore: el('resultScore'),
  resultStats: el('resultStats'),
  resultTitle: el('resultTitle'),
  resultLead: el('resultLead'),
  resultEyebrow: el('resultEyebrow'),
  newBest: el('newBest'),
  pauseBtn: el('pauseBtn'),
  rotateGate: el('rotateGate'),
};

/* -------------------------------------------------------------------- save */
function loadSave() {
  let s = { best: { orders: 0, rush: 0, free: 0 }, muted: false, lang: 'zh' };
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      s = { ...s, ...p, best: { ...s.best, ...(p.best || {}) } };
    }
  } catch (e) { /* ignore */ }
  return s;
}
let save = loadSave();

function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ }
}

/* ------------------------------------------------------------------- state */
let autoPausedForRotate = false;

function isPortraitish() {
  return window.innerHeight > window.innerWidth * 1.02;
}

function resizeViewport() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
}

function syncOrientation() {
  const need = isTouch && isPortraitish();
  ui.rotateGate.classList.toggle('hidden', !need);
  if (need) {
    if (state.phase === 'playing') {
      autoPausedForRotate = true;
      pauseGame();
    }
  } else if (autoPausedForRotate) {
    autoPausedForRotate = false;
    if (state.phase === 'paused') resumeGame();
  }
}

function portraitFactor() {
  const a = window.innerWidth / window.innerHeight;
  return a < 0.85 ? 1.5 : a < 1.2 ? 1.18 : 1;
}
function baseFov() {
  const a = window.innerWidth / window.innerHeight;
  return a < 0.85 ? 72 : 61;
}

const state = {
  mode: 'orders',
  phase: 'menu',
  score: 0,
  delivered: 0,
  orderIdx: 0,
  ringHits: 0,
  elapsed: 0,
  timeLeft: 60,
  targetIsland: null,
  boostToastAt: -9,
};

const input = { kbClimb: 0, kbTurn: 0, kbBoost: false, tClimb: 0, tTurn: 0, tBoost: false, climb: 0, turn: 0, boost: false };

const keys = new Set();
const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches || 'ontouchstart' in window;

/* -------------------------------------------------------------------- i18n */
function refreshStaticUI() {
  applyI18n();
  ui.bestStart.textContent = (save.best[state.mode] || 0).toLocaleString();
  ui.best.textContent = (save.best[state.mode] || 0).toLocaleString();
  if (state.phase === 'playing') {
    if (state.mode === 'orders') {
      ui.routeSub.textContent = t('pkg') + ' ' + state.delivered + '/5';
    } else if (state.mode === 'rush') {
      ui.routeSub.textContent = t('statRings') + ' ' + state.ringHits;
    } else {
      ui.routeSub.textContent = t('statRings') + ' ' + state.ringHits;
    }
  }
}

function toggleLang() {
  const next = getLang() === 'zh' ? 'en' : 'zh';
  setLang(next);
  save.lang = next;
  persist();
  refreshStaticUI();
  buildDots();
  if (state.targetIsland) updateReticleForce();
  audio.ui();
}

/* ------------------------------------------------------------------- audio */
function initAudio() {
  audio.init();
  audio.setEnabled(!save.muted);
  syncSoundIcon();
}
function syncSoundIcon() {
  ui.soundOn.style.display = save.muted ? 'none' : 'block';
  ui.soundOff.style.display = save.muted ? 'block' : 'none';
  el('soundBtn').classList.toggle('off', save.muted);
  const pill = el('pauseSound');
  if (pill) {
    pill.classList.toggle('off', save.muted);
    el('pauseSoundLbl').textContent = save.muted ? t('soundOff') : t('soundOn');
  }
}

function toggleSound() {
  save.muted = !save.muted;
  persist();
  if (!audio.ctx) initAudio();
  audio.setEnabled(!save.muted);
  syncSoundIcon();
  if (!save.muted) audio.ui();
}

/* --------------------------------------------------------------------- HUD */
function buildDots() {
  ui.dots.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const d = document.createElement('span');
    d.className = 'dot' + (i < state.delivered ? ' done' : i === state.delivered && state.mode === 'orders' ? ' current' : '');
    ui.dots.appendChild(d);
  }
}

function setScore(v) {
  state.score = v;
  ui.score.textContent = v.toLocaleString();
}

let toastTimer = 0;
function toast(msg, ms = 2100) {
  ui.toast.textContent = msg;
  ui.toast.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.remove('on'), ms);
}

function flash() {
  ui.flash.classList.add('on');
  setTimeout(() => ui.flash.classList.remove('on'), 90);
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ':' + String(s).padStart(2, '0');
}

/* ------------------------------------------------------------- game control */
function showScreen(name) {
  ui.start.classList.toggle('hidden', name !== 'start');
  ui.pause.classList.toggle('hidden', name !== 'pause');
  ui.result.classList.toggle('hidden', name !== 'result');
  ui.hud.classList.toggle('hidden', name !== 'hud');
}

function targetPointOf(island) {
  if (!island || !island.gate) return null;
  return island.gate.group.position;
}

function angleToYaw(dx, dz) {
  return Math.atan2(-dx, -dz);
}

function startGame(modeOverride) {
  const mode = modeOverride || state.mode;
  state.mode = mode;
  state.phase = 'playing';
  state.score = 0;
  state.delivered = 0;
  state.orderIdx = 0;
  state.ringHits = 0;
  state.elapsed = 0;
  state.timeLeft = 60;
  state.targetIsland = null;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();

  audio.init();
  audio.setEnabled(!save.muted);
  syncSoundIcon();

  world.resetRings();
  for (const isl of world.islands) {
    if (isl.gate) {
      isl.gate.group.visible = false;
      isl.gate.beam.visible = false;
      isl.gate.halo.visible = false;
      isl.gate.active = false;
    }
  }

  const post = world.post;

  // face the first target (or forward for other modes)
  let yaw = Math.PI;
  const orderIslands = getOrderIslands();
  if (mode === 'orders' && orderIslands[0]) {
    const d = new THREE.Vector3().subVectors(orderIslands[0].pos, post.pos);
    yaw = angleToYaw(d.x, d.z);
  }
  // spawn just off the rim so the take-off never clips the island
  const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const startPos = post.pos.clone().addScaledVector(fwd, post.radius * 1.28).add(new THREE.Vector3(0, 9.5, 0));
  plane.reset(startPos, yaw);
  setScore(0);
  buildDots();
  ui.dots.style.display = mode === 'orders' ? 'flex' : 'none';
  showScreen('hud');
  ui.touch.classList.toggle('on', isTouch);
  ui.best.textContent = (save.best[mode] || 0).toLocaleString();
  ui.timer.style.display = mode === 'rush' ? 'block' : 'none';
  ui.timer.textContent = '60';
  ui.timer.classList.remove('warn');
  ui.reticle.classList.remove('on', 'edge');
  ui.routeSub.textContent = mode === 'orders' ? t('pkg') + ' 0/5' : t('statRings') + ' 0';

  if (mode === 'orders') {
    activateOrder(0);
  } else {
    ui.reticle.classList.remove('on');
    toast(t('clickHint'), 3600);
  }

  // camera snap behind the plane
  const pf = portraitFactor();
  const back = new THREE.Vector3(0, 4.2 * pf, 15 * pf).applyEuler(new THREE.Euler(plane.pitch * 0.5, plane.yaw, 0, 'YXZ'));
  camera.position.copy(plane.pos).add(back);
  camLook.copy(plane.pos).addScaledVector(plane.forward, 12);

  audio.whoosh();
}

function getOrderIslands() {
  return world.islands.filter((i) => i.nameKey && i.nameKey !== 'post');
}

function activateOrder(idx) {
  const list = getOrderIslands();
  const isl = list[idx];
  if (!isl) return;
  state.targetIsland = isl;
  state.orderIdx = idx;
  const g = isl.gate;
  g.group.visible = true;
  g.beam.visible = true;
  g.halo.visible = true;
  g.active = true;
  g.group.scale.setScalar(1);
  toast(t('pickup', { name: islandName(isl.nameKey) }), 2400);
}

function deliver() {
  const isl = state.targetIsland;
  if (!isl) return;
  state.delivered += 1;
  const bonus = 150 + Math.round(plane.speed * 2.5);
  setScore(state.score + bonus);
  buildDots();
  audio.deliver();
  toast(t('delivered', { n: state.delivered }), 2000);

  isl.gate.group.visible = false;
  isl.gate.beam.visible = false;
  isl.gate.halo.visible = false;
  isl.gate.active = false;
  state.targetIsland = null;
  ui.reticle.classList.remove('on');

  const max = getOrderIslands().length;
  if (state.delivered >= max) {
    setTimeout(() => finish('orders'), 620);
    state.phase = 'finishing';
  } else {
    setTimeout(() => {
      if (state.phase === 'playing' || state.phase === 'paused') activateOrder(state.orderIdx + 1);
    }, 420);
  }
}

function finish(mode) {
  state.phase = 'result';
  state.mode = mode;
  const bestKey = mode;
  const prev = save.best[bestKey] || 0;
  const isNew = state.score > prev;
  if (isNew) {
    save.best[bestKey] = state.score;
    persist();
  }
  ui.best.textContent = (save.best[bestKey] || 0).toLocaleString();
  ui.bestStart.textContent = (save.best[bestKey] || 0).toLocaleString();

  ui.resultScore.textContent = state.score.toLocaleString();
  ui.newBest.style.display = isNew ? 'inline-flex' : 'none';
  ui.resultEyebrow.textContent = mode === 'orders' ? t('eyebrowOrders') : mode === 'rush' ? t('eyebrowRush') : t('eyebrowFree');
  ui.resultTitle.textContent = mode === 'orders' ? t('routeTitle') : mode === 'rush' ? t('rushTitle') : t('freeTitle');
  ui.resultLead.textContent = mode === 'orders' ? t('routeLead') : mode === 'rush' ? t('rushLead') : t('freeLead');

  const stats = [
    { k: t('statTime'), v: formatTime(state.elapsed) },
    { k: t('statRings'), v: state.ringHits },
    { k: t('statBest'), v: (save.best[bestKey] || 0).toLocaleString() },
  ];
  ui.resultStats.innerHTML = stats.map((s) => `<div class="stat"><div class="k">${s.k}</div><div class="v">${s.v}</div></div>`).join('');

  showScreen('result');
  ui.touch.classList.remove('on');
  ui.reticle.classList.remove('on');
  audio.flight(0, 0, false);
}

function backToMenu() {
  if (state.mode === 'free' && state.phase !== 'menu' && state.score > (save.best.free || 0)) {
    save.best.free = state.score;
    persist();
  }
  state.phase = 'menu';
  state.targetIsland = null;
  showScreen('start');
  ui.touch.classList.remove('on');
  ui.reticle.classList.remove('on');
  for (const isl of world.islands) {
    if (isl.gate) {
      isl.gate.group.visible = false;
      isl.gate.beam.visible = false;
      isl.gate.halo.visible = false;
    }
  }
  world.resetRings();
  const post = world.post;
  plane.reset(post.pos.clone().add(new THREE.Vector3(0, 1.5, 4.5)), 0.9);
  audio.flight(0, 0, false);
  themeCameraSnap();
}

function pauseGame() {
  if (state.phase !== 'playing') return;
  state.phase = 'paused';
  showScreen('pause');
  ui.pause.classList.remove('hidden');
  ui.hud.classList.add('hidden');
  audio.flight(0, 0, false);
}

function resumeGame() {
  if (state.phase !== 'paused') return;
  state.phase = 'playing';
  showScreen('hud');
  audio.flight(0.4, 0, true);
}

/* ------------------------------------------------------------------ camera */
const camLook = new THREE.Vector3();
const camDesired = new THREE.Vector3();
const camTmp = new THREE.Vector3();
const menuCenter = new THREE.Vector3();
let menuAngle = 0;

function menuFrame() {
  const portrait = window.innerHeight > window.innerWidth;
  const shortLand = !portrait && window.innerHeight <= 580;
  return {
    radius: portrait ? 62 : shortLand ? 50 : 66,
    height: portrait ? 26 : shortLand ? 16 : 24,
    shift: portrait ? -4 : shortLand ? -27 : -13,
    drop: portrait ? 17 : 0,
  };
}

function themeCameraSnap() {
  const post = world.post;
  const f = menuFrame();
  menuCenter.copy(post.pos).add(new THREE.Vector3(0, 12, 0));
  menuAngle = 0.7;
  camera.position.set(menuCenter.x + Math.cos(menuAngle) * f.radius, menuCenter.y + f.height, menuCenter.z + Math.sin(menuAngle) * f.radius);
  camLook.copy(menuCenter);
  camera.lookAt(camLook);
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
  camLook.copy(menuCenter).addScaledVector(right, f.shift);
  camLook.y -= f.drop;
  camera.lookAt(camLook);
  camera.fov = baseFov() - 6;
  camera.updateProjectionMatrix();
}

function updateCamera(dt) {
  if (state.phase === 'menu' || state.phase === 'result') {
    menuAngle += dt * 0.075;
    const f = menuFrame();
    const radius = f.radius;
    const y = menuCenter.y + f.height + Math.sin(menuAngle * 0.8) * 4;
    camDesired.set(menuCenter.x + Math.cos(menuAngle) * radius, y, menuCenter.z + Math.sin(menuAngle) * radius);
    camera.position.lerp(camDesired, 1 - Math.exp(-1.6 * dt));
    const look = menuCenter.clone().add(new THREE.Vector3(0, Math.sin(menuAngle * 0.6) * 2, 0));
    camLook.lerp(look, 1 - Math.exp(-2 * dt));
    camera.lookAt(camLook);
    // push the scene aside so the start panel keeps the composition clean
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
    const lookPoint = camLook.clone().addScaledVector(right, f.shift);
    lookPoint.y -= f.drop;
    camera.lookAt(lookPoint);
    camera.fov += (baseFov() - 6 - camera.fov) * Math.min(1, dt * 2);
  } else if (state.phase === 'paused') {
    camera.lookAt(camLook);
  } else {
    const boost = plane.boosting ? 1 : 0;
    const pf = portraitFactor();
    const offset = camTmp.set(0, (3.6 + boost * 0.5) * pf, (12.4 + boost * 1.8) * pf);
    offset.applyEuler(new THREE.Euler(plane.pitch * 0.45, plane.yaw, 0, 'YXZ'));
    camDesired.copy(plane.pos).add(offset);

    // keep camera above the cloud sea and away from islands
    camDesired.y = Math.max(camDesired.y, -46);

    const k = 1 - Math.exp(-5.2 * dt);
    camera.position.lerp(camDesired, k);

    if (plane.hitTimer > 0) {
      camera.position.x += (Math.random() - 0.5) * 0.55;
      camera.position.y += (Math.random() - 0.5) * 0.55;
    }

    const lookAhead = plane.pos.clone().addScaledVector(plane.forward, 15).add(new THREE.Vector3(0, 2.0, 0));
    camLook.lerp(lookAhead, 1 - Math.exp(-7 * dt));
    camera.lookAt(camLook);

    const targetFov = baseFov() + boost * 9;
    camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 3);
  }
  camera.updateProjectionMatrix();
}

/* ---------------------------------------------------------------- reticle */
const screenV = new THREE.Vector3();
function updateReticle() {
  const isl = state.targetIsland;
  if (!isl || state.phase !== 'playing') {
    ui.reticle.classList.remove('on');
    return;
  }
  const p = targetPointOf(isl);
  const dist = camera.position.distanceTo(p);
  screenV.copy(p).applyMatrix4(camera.matrixWorldInverse);
  const behind = screenV.z > 0;

  const proj = p.clone().project(camera);
  const w = window.innerWidth;
  const h = window.innerHeight;
  let x = (proj.x * 0.5 + 0.5) * w;
  let y = (-proj.y * 0.5 + 0.5) * h;
  if (behind) {
    x = w - x;
    y = h - y;
  }

  const margin = 74;
  const offScreen = behind || x < margin || x > w - margin || y < margin || y > h - margin;

  if (offScreen) {
    const cx = w / 2;
    const cy = h / 2;
    let dx = x - cx;
    let dy = y - cy;
    if (behind) { dx = -dx; dy = -dy; }
    const len = Math.hypot(dx, dy) || 1;
    const rx = Math.min(w / 2 - margin, h / 2 - margin);
    x = cx + (dx / len) * Math.min(rx, Math.hypot(cx, cy));
    y = cy + (dy / len) * Math.min(rx, Math.hypot(cx, cy));
    x = Math.max(margin, Math.min(w - margin, x));
    y = Math.max(margin, Math.min(h - margin, y));
    ui.reticle.classList.add('edge');
    const ang = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    ui.reticle.querySelector('.arrow').style.transform = `rotate(${ang}deg)`;
  } else {
    ui.reticle.classList.remove('edge');
  }

  ui.reticle.classList.add('on');
  ui.reticle.style.left = x + 'px';
  ui.reticle.style.top = y + 'px';
  ui.reticleLbl.textContent = Math.max(0, Math.round(dist)) + ' m';
}

function updateReticleForce() {
  updateReticle();
}

/* ------------------------------------------------------------------ input */
function syncInput() {
  input.climb = Math.max(-1, Math.min(1, input.kbClimb + input.tClimb));
  input.turn = Math.max(-1, Math.min(1, input.kbTurn + input.tTurn));
  input.boost = input.kbBoost || input.tBoost;
}

function readKeys() {
  let climb = 0;
  let turn = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) climb += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) climb -= 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) turn += 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) turn -= 1;
  input.kbClimb = climb;
  input.kbTurn = turn;
  input.kbBoost = keys.has('Space');
  syncInput();
}

window.addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  readKeys();
  if (e.code === 'Escape') {
    if (state.phase === 'playing') pauseGame();
    else if (state.phase === 'paused') resumeGame();
  }
  if (e.code === 'Enter' && (state.phase === 'menu' || state.phase === 'result')) {
    startGame();
  }
  if (!audio.ctx) initAudio();
});

window.addEventListener('keyup', (e) => {
  keys.delete(e.code);
  readKeys();
});

window.addEventListener('blur', () => {
  keys.clear();
  readKeys();
  input.tBoost = false;
  if (state.phase === 'playing') pauseGame();
});

/* touch stick */
let stickId = null;
let stickX = 0;
let stickY = 0;
const STICK_R = 52;

ui.stickZone.addEventListener('pointerdown', (e) => {
  stickId = e.pointerId;
  ui.stickZone.setPointerCapture(e.pointerId);
  ui.stickZone.classList.add('active');
  const r = ui.stickZone.getBoundingClientRect();
  stickX = r.left + r.width / 2;
  stickY = r.top + r.height / 2;
  onStick(e);
  e.preventDefault();
});
ui.stickZone.addEventListener('pointermove', (e) => {
  if (e.pointerId !== stickId) return;
  onStick(e);
  e.preventDefault();
});
function endStick(e) {
  if (e.pointerId !== stickId) return;
  stickId = null;
  input.tClimb = 0;
  input.tTurn = 0;
  ui.stickZone.classList.remove('active');
  ui.stickKnob.style.transform = 'translate(0px, 0px)';
  setHotArrows(0, 0);
  syncInput();
}
ui.stickZone.addEventListener('pointerup', endStick);
ui.stickZone.addEventListener('pointercancel', endStick);

function deadZone(v, dz) {
  if (Math.abs(v) <= dz) return 0;
  return Math.sign(v) * ((Math.abs(v) - dz) / (1 - dz));
}

function setHotArrows(nx, ny) {
  const up = ui.stickZone.querySelector('.stick-arrow.up');
  const down = ui.stickZone.querySelector('.stick-arrow.down');
  const left = ui.stickZone.querySelector('.stick-arrow.left');
  const right = ui.stickZone.querySelector('.stick-arrow.right');
  up.classList.toggle('hot', ny < -0.32);
  down.classList.toggle('hot', ny > 0.32);
  left.classList.toggle('hot', nx < -0.32);
  right.classList.toggle('hot', nx > 0.32);
}

function onStick(e) {
  let dx = e.clientX - stickX;
  let dy = e.clientY - stickY;
  const d = Math.hypot(dx, dy);
  if (d > STICK_R) {
    dx = (dx / d) * STICK_R;
    dy = (dy / d) * STICK_R;
  }
  ui.stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  const nx = dx / STICK_R;
  const ny = dy / STICK_R;
  input.tTurn = -deadZone(nx, 0.16);
  input.tClimb = -deadZone(ny, 0.16);
  setHotArrows(nx, ny);
  syncInput();
}

ui.boostBtn.addEventListener('pointerdown', (e) => {
  ui.boostBtn.classList.add('hit');
  input.tBoost = true;
  syncInput();
  e.preventDefault();
});
const boostEnd = () => {
  ui.boostBtn.classList.remove('hit');
  input.tBoost = false;
  syncInput();
};
ui.boostBtn.addEventListener('pointerup', boostEnd);
ui.boostBtn.addEventListener('pointercancel', boostEnd);
ui.boostBtn.addEventListener('pointerleave', boostEnd);

/* ------------------------------------------------------------------- loop */
const clock = new THREE.Clock();
let hudAcc = 0;

function updateRings() {
  for (const r of world.rings) {
    if (!r.active) continue;
    const gp = r.group.position;
    const d = plane.pos.distanceTo(gp);
    if (d < r.radius * 1.05) {
      r.active = false;
      r.group.visible = false;
      r.cooldown = state.mode === 'rush' ? 2.6 : 7;
      state.ringHits += 1;
      setScore(state.score + 50);
      plane.addBoost(38);
      plane.speed = Math.min(plane.boostSpeed * 1.28, plane.speed + 9);
      audio.ring();
      audio.whoosh();
      const now = performance.now() / 1000;
      if (now - state.boostToastAt > 1.6) {
        toast(t('ringHit', { n: 50 }), 1200);
        state.boostToastAt = now;
      }
      if (state.mode !== 'orders') ui.routeSub.textContent = t('statRings') + ' ' + state.ringHits;
    }
  }
}

function updatePlaying(dt) {
  state.elapsed += dt;

  const before = plane.pos.clone();
  plane.update(dt, input, world, state.elapsed);

  // island collision
  const hit = world.collisionAt(plane.pos);
  if (hit) {
    const push = new THREE.Vector3(hit.dx || 0.01, 0, hit.dz || 0.01).normalize();
    plane.pos.copy(before).addScaledVector(push, 1.4);
    plane.pos.y = Math.max(plane.pos.y, hit.island.group.position.y + 4.6);
    plane.group.position.copy(plane.pos);
    plane.bump();
    flash();
    audio.bump();
    if (Math.random() > 0.7) toast(t('hitIsland'), 1100);
  }

  // ringing checks
  updateRings();

  // gate delivery
  if (state.mode === 'orders' && state.targetIsland) {
    const g = state.targetIsland.gate;
    if (g.group.visible) {
      const d = plane.pos.distanceTo(g.group.position);
      if (d < g.radius * 1.15) deliver();
    }
  }

  // timers
  if (state.mode === 'rush') {
    state.timeLeft -= dt;
    ui.timer.textContent = Math.max(0, Math.ceil(state.timeLeft));
    ui.timer.classList.toggle('warn', state.timeLeft <= 10);
    if (state.timeLeft <= 0) {
      finish('rush');
      return;
    }
  }

  // continuous audio
  const speed01 = Math.min(1, (plane.speed - 18) / 34);
  audio.flight(speed01, plane.boosting ? 1 : 0, true);

  // reticle
  updateReticle();

  // HUD (throttled)
  hudAcc += dt;
  if (hudAcc > 0.06) {
    hudAcc = 0;
    ui.speed.textContent = plane.speedKmh;
    ui.speedFill.style.width = Math.min(100, (plane.speed / 52) * 100) + '%';
    ui.boostFill.style.width = plane.energy + '%';
    ui.boostPct.textContent = Math.round(plane.energy) + '%';
    el('boostBar').classList.toggle('low', plane.energy < 25);
    ui.boostBtn.style.setProperty('--e', Math.round(plane.energy));
    ui.boostBtn.classList.toggle('empty', plane.energy < 12);
  }
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (state.phase === 'playing') {
    updatePlaying(dt);
  } else if (state.phase === 'menu') {
    if (plane.prop) plane.prop.rotation.z += dt * 2.4;
  }

  world.update(dt, plane.pos);
  updateCamera(dt);
  renderer.render(scene, camera);
}

/* --------------------------------------------------------------- UI wiring */
document.querySelectorAll('.mode').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.mode = btn.dataset.mode;
    document.querySelectorAll('.mode').forEach((b) => b.classList.toggle('active', b === btn));
    ui.bestStart.textContent = (save.best[state.mode] || 0).toLocaleString();
    audio.ui();
  });
});

el('startBtn').addEventListener('click', () => {
  initAudio();
  startGame();
});

el('soundBtn').addEventListener('click', toggleSound);
el('pauseSound').addEventListener('click', toggleSound);

el('langBtn').addEventListener('click', toggleLang);

el('resumeBtn').addEventListener('click', resumeGame);
el('pauseRestart').addEventListener('click', () => {
  audio.ui();
  startGame(state.mode);
});
el('pauseMenu').addEventListener('click', () => {
  showScreen('start');
  backToMenu();
});
el('againBtn').addEventListener('click', () => startGame(state.mode));
el('resultMenu').addEventListener('click', backToMenu);
el('pauseBtn').addEventListener('click', pauseGame);

window.addEventListener('resize', () => {
  resizeViewport();
  syncOrientation();
});

window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    resizeViewport();
    syncOrientation();
  }, 280);
});

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    if (!isTouch) resizeViewport();
  });
}

// iOS: block pinch-zoom / gesture zoom inside the game surface
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('gesturechange', (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });
window.addEventListener('dblclick', (e) => e.preventDefault());

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.phase === 'playing') pauseGame();
  if (!document.hidden && audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();
});

/* ------------------------------------------------------------------- boot */
function isIosDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;
}

async function boot() {
  setLang(save.lang || 'zh');
  applyI18n();
  syncSoundIcon();
  buildDots();
  ui.bestStart.textContent = (save.best.orders || 0).toLocaleString();

  // iOS Safari (not yet installed): nudge towards Add to Home Screen
  if (isIosDevice() && !isStandalone()) {
    const ih = document.getElementById('installHint');
    const fh = document.getElementById('footHint');
    if (ih) ih.style.display = 'inline-flex';
    if (fh) fh.style.display = 'none';
  }
  document.body.classList.toggle('standalone', isStandalone());

  await plane.load('assets/models/plane.glb');

  const post = world.post;
  plane.reset(post.pos.clone().add(new THREE.Vector3(0, 1.5, 4.5)), 0.9);

  themeCameraSnap();
  camera.position.set(menuCenter.x + Math.cos(menuAngle) * 86, menuCenter.y + 40, menuCenter.z + Math.sin(menuAngle) * 86);
  camera.lookAt(camLook);

  showScreen('start');
  window.__fie = { state, plane, world, camera, renderer, scene, startGame, finish };
  resizeViewport();
  syncOrientation();
  animate();

  setTimeout(() => {
    if (state.phase === 'menu') ui.start.classList.remove('hidden');
  }, 60);
}

boot();
