import io, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------------------------------------------------------------- HTML
p = os.path.join(root, 'index.html')
s = io.open(p, encoding='utf-8').read()
s = s.replace("""      <div class="dialog-actions">
        <button class="btn btn-ghost" id="pauseMenu" data-i18n="menu">返回主菜单</button>
        <button class="btn btn-solid" id="resumeBtn" data-i18n="resume">继续飞行</button>
      </div>""",
"""      <div class="dialog-actions">
        <button class="btn btn-ghost" id="pauseMenu" data-i18n="menu">返回主菜单</button>
        <button class="btn btn-ghost" id="pauseRestart" data-i18n="restart">重新开始</button>
        <button class="btn btn-solid" id="resumeBtn" data-i18n="resume">继续飞行</button>
      </div>
      <button class="sound-pill" id="pauseSound">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 9.5h3.2L12 5.5v13L7.2 14.5H4z" /><path d="M15.6 8.8a4.4 4.4 0 0 1 0 6.4" />
        </svg>
        <span id="pauseSoundLbl">音效开</span>
      </button>""")
io.open(p, 'w', encoding='utf-8').write(s)
print('html ok')

# ---------------------------------------------------------------- i18n
p = os.path.join(root, 'js', 'i18n.js')
s = io.open(p, encoding='utf-8').read()
s = s.replace("""    rotateTitle: '请把手机横过来',""", """    restart: '重新开始',
    soundOn: '音效开',
    soundOff: '音效关',
    rotateTitle: '请把手机横过来',""")
s = s.replace("""    rotateTitle: 'Rotate your phone',""", """    restart: 'Restart',
    soundOn: 'Sound on',
    soundOff: 'Sound off',
    rotateTitle: 'Rotate your phone',""")
io.open(p, 'w', encoding='utf-8').write(s)
print('i18n ok')

# ---------------------------------------------------------------- CSS
p = os.path.join(root, 'css', 'style.css')
s = io.open(p, encoding='utf-8').read()
s = s.replace(""".dialog-actions { display: flex; gap: 9px; }""",
""".dialog-actions { display: flex; gap: 9px; }
.sound-pill {
  margin: 12px auto 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 13px;
  border-radius: 999px;
  border: 1px solid rgba(16, 48, 74, 0.1);
  background: rgba(16, 48, 74, 0.05);
  color: var(--ink-soft);
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.sound-pill:hover { background: rgba(16, 48, 74, 0.09); color: var(--ink); }
.sound-pill.off { color: rgba(16, 48, 74, 0.42); }
.sound-pill.off svg { opacity: 0.5; }""")
s = s.replace("""  .btn-solid, .btn-ghost { height: 42px; font-size: 12.5px; }""",
"""  .btn-solid, .btn-ghost { height: 42px; font-size: 12.5px; }
  .sound-pill { margin-top: 8px; height: 26px; font-size: 10.5px; }""")
io.open(p, 'w', encoding='utf-8').write(s)
print('css ok')

# ---------------------------------------------------------------- JS
p = os.path.join(root, 'js', 'main.js')
s = io.open(p, encoding='utf-8').read()

s = s.replace("""function syncSoundIcon() {
  ui.soundOn.style.display = save.muted ? 'none' : 'block';
  ui.soundOff.style.display = save.muted ? 'block' : 'none';
  el('soundBtn').classList.toggle('off', save.muted);
}""",
"""function syncSoundIcon() {
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
}""")

s = s.replace("""el('soundBtn').addEventListener('click', () => {
  save.muted = !save.muted;
  persist();
  if (!audio.ctx) initAudio();
  audio.setEnabled(!save.muted);
  syncSoundIcon();
  if (!save.muted) audio.ui();
});""",
"""el('soundBtn').addEventListener('click', toggleSound);
el('pauseSound').addEventListener('click', toggleSound);""")

s = s.replace("""el('resumeBtn').addEventListener('click', resumeGame);""",
"""el('resumeBtn').addEventListener('click', resumeGame);
el('pauseRestart').addEventListener('click', () => {
  audio.ui();
  startGame(state.mode);
});""")

io.open(p, 'w', encoding='utf-8').write(s)
print('js ok')
