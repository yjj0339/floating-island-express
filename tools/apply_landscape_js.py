import io, os

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------------------------------------------------------------- i18n keys
p = os.path.join(root, 'js', 'i18n.js')
s = io.open(p, encoding='utf-8').read()
s = s.replace("""    langLabel: 'EN',""", """    langLabel: 'EN',
    rotateTitle: '请把手机横过来',
    rotateSub: '横屏视野更宽，摇杆与冲刺键也更顺手',
    installHint: '可添加到主屏幕，横屏全屏游玩',""")
s = s.replace("""    langLabel: '中',""", """    langLabel: '中',
    rotateTitle: 'Rotate your phone',
    rotateSub: 'Landscape gives you a wider view and comfier thumb controls',
    installHint: 'Add to Home Screen for a full-screen landscape run',""")
io.open(p, 'w', encoding='utf-8').write(s)
print('i18n ok')

# ------------------------------------------------------------------ main.js
p = os.path.join(root, 'js', 'main.js')
s = io.open(p, encoding='utf-8').read()

s = s.replace("""  pauseBtn: el('pauseBtn'),
};""", """  pauseBtn: el('pauseBtn'),
  rotateGate: el('rotateGate'),
};""")

s = s.replace("""function portraitFactor() {""", """let autoPausedForRotate = false;

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

function portraitFactor() {""")

# joystick: dead zone, active state, arrow highlights
s = s.replace("""ui.stickZone.addEventListener('pointerdown', (e) => {
  stickId = e.pointerId;
  ui.stickZone.setPointerCapture(e.pointerId);
  const r = ui.stickZone.getBoundingClientRect();
  stickX = r.left + r.width / 2;
  stickY = r.top + r.height / 2;
  onStick(e);
  e.preventDefault();
});""", """ui.stickZone.addEventListener('pointerdown', (e) => {
  stickId = e.pointerId;
  ui.stickZone.setPointerCapture(e.pointerId);
  ui.stickZone.classList.add('active');
  const r = ui.stickZone.getBoundingClientRect();
  stickX = r.left + r.width / 2;
  stickY = r.top + r.height / 2;
  onStick(e);
  e.preventDefault();
});""")

s = s.replace("""  stickId = null;
  input.tClimb = 0;
  input.tTurn = 0;
  ui.stickKnob.style.transform = 'translate(0px, 0px)';
  syncInput();""", """  stickId = null;
  input.tClimb = 0;
  input.tTurn = 0;
  ui.stickZone.classList.remove('active');
  ui.stickKnob.style.transform = 'translate(0px, 0px)';
  setHotArrows(0, 0);
  syncInput();""")

s = s.replace("""function onStick(e) {
  let dx = e.clientX - stickX;
  let dy = e.clientY - stickY;
  const d = Math.hypot(dx, dy);
  if (d > STICK_R) {
    dx = (dx / d) * STICK_R;
    dy = (dy / d) * STICK_R;
  }
  ui.stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  input.tTurn = -(dx / STICK_R);
  input.tClimb = -(dy / STICK_R);
  syncInput();
}""", """function deadZone(v, dz) {
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
}""")

# unified resize / orientation handling
s = s.replace("""window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
});""", """window.addEventListener('resize', () => {
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
window.addEventListener('dblclick', (e) => e.preventDefault());""")

s = s.replace("""  showScreen('start');
  window.__fie = { state, plane, world, camera, renderer, scene, startGame, finish };
  animate();""", """  showScreen('start');
  window.__fie = { state, plane, world, camera, renderer, scene, startGame, finish };
  resizeViewport();
  syncOrientation();
  animate();""")

io.open(p, 'w', encoding='utf-8').write(s)
print('main ok')
