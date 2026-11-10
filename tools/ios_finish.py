import io, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ------------------------------------------------------------------ HTML
p = os.path.join(root, 'index.html')
s = io.open(p, encoding='utf-8').read()
s = s.replace("""        <span data-i18n="footHint">本地记录 · 支持键盘与触屏</span>""",
"""        <span id="footHint" data-i18n="footHint">本地记录 · 支持键盘与触屏</span>
        <span id="installHint" class="install-hint" data-i18n="installHint" style="display:none">分享 → 添加到主屏幕，横屏全屏开飞</span>""")
io.open(p, 'w', encoding='utf-8').write(s)
print('html ok')

# ------------------------------------------------------------------ CSS
p = os.path.join(root, 'css', 'style.css')
s = io.open(p, encoding='utf-8').read()
s = s.replace("""* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }""",
"""* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; -webkit-touch-callout: none; }""")
s = s.replace(""".rec { display: flex; align-items: baseline; gap: 5px; }""",
""".rec { display: flex; align-items: baseline; gap: 5px; }
.install-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--coral-deep);
  font-weight: 700;
}
.install-hint::before {
  content: "";
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--coral);
  box-shadow: 0 0 0 3px rgba(255, 107, 74, 0.16);
}""")
# thinner boost ring
s = s.replace("""    radial-gradient(closest-side, rgba(255, 255, 255, 0.98) 0 77%, rgba(255, 255, 255, 0) 78%),
    conic-gradient(from -90deg, #ff6b4a calc(var(--e, 100) * 1%), rgba(255, 255, 255, 0.42) 0);""",
"""    radial-gradient(closest-side, rgba(255, 255, 255, 0.98) 0 79%, rgba(255, 255, 255, 0) 80%),
    conic-gradient(from -90deg, #ff7148 calc(var(--e, 100) * 1%), rgba(255, 255, 255, 0.44) 0);""")
io.open(p, 'w', encoding='utf-8').write(s)
print('css ok')

# ------------------------------------------------------------------ JS
p = os.path.join(root, 'js', 'audio.js')
s = io.open(p, encoding='utf-8').read()
s = s.replace("""    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();""",
"""    // iOS: keep game audio audible even with the hardware mute switch on
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'playback';
    } catch (e) { /* not supported */ }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();""")
io.open(p, 'w', encoding='utf-8').write(s)
print('audio ok')

p = os.path.join(root, 'js', 'main.js')
s = io.open(p, encoding='utf-8').read()
s = s.replace("""async function boot() {
  setLang(save.lang || 'zh');""",
"""function isIosDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;
}

async function boot() {
  setLang(save.lang || 'zh');""")

s = s.replace("""  ui.bestStart.textContent = (save.best.orders || 0).toLocaleString();

  await plane.load('assets/models/plane.glb');""",
"""  ui.bestStart.textContent = (save.best.orders || 0).toLocaleString();

  // iOS Safari (not yet installed): nudge towards Add to Home Screen
  if (isIosDevice() && !isStandalone()) {
    const ih = document.getElementById('installHint');
    const fh = document.getElementById('footHint');
    if (ih) ih.style.display = 'inline-flex';
    if (fh) fh.style.display = 'none';
  }
  document.body.classList.toggle('standalone', isStandalone());

  await plane.load('assets/models/plane.glb');""")

s = s.replace("""document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.phase === 'playing') pauseGame();
});""",
"""document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.phase === 'playing') pauseGame();
  if (!document.hidden && audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();
});""")
io.open(p, 'w', encoding='utf-8').write(s)
print('main ok')
