import io, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = os.path.join(root, 'css', 'style.css')
s = io.open(p, encoding='utf-8').read()

# --- joystick: darker glass so white arrows read against bright sky
s = s.replace("""  background:
    radial-gradient(circle at 50% 42%, rgba(255, 255, 255, 0.34), rgba(255, 255, 255, 0.10) 68%, rgba(255, 255, 255, 0.16));
  border: 1.5px solid rgba(255, 255, 255, 0.62);
  box-shadow: 0 14px 30px -18px rgba(10, 48, 80, 0.65), inset 0 0 24px rgba(255, 255, 255, 0.25);""",
"""  background:
    radial-gradient(circle at 50% 42%, rgba(14, 50, 78, 0.34), rgba(14, 50, 78, 0.20) 66%, rgba(14, 50, 78, 0.26));
  border: 1.5px solid rgba(255, 255, 255, 0.7);
  box-shadow: 0 14px 30px -16px rgba(6, 34, 56, 0.75), inset 0 0 0 1px rgba(255, 255, 255, 0.14), inset 0 0 26px rgba(255, 255, 255, 0.10);""")

s = s.replace("""#stickZone.active {
  border-color: rgba(255, 255, 255, 0.95);
  box-shadow: 0 16px 34px -16px rgba(10, 48, 80, 0.7), inset 0 0 26px rgba(255, 255, 255, 0.35);
}""",
"""#stickZone.active {
  border-color: rgba(255, 255, 255, 0.98);
  background:
    radial-gradient(circle at 50% 42%, rgba(14, 50, 78, 0.42), rgba(14, 50, 78, 0.26) 66%, rgba(14, 50, 78, 0.3));
}""")

s = s.replace("""  border: 1px dashed rgba(255, 255, 255, 0.32);""", """  border: 1px dashed rgba(255, 255, 255, 0.26);""")

s = s.replace("""  stroke: rgba(255, 255, 255, 0.72);
  stroke-width: 2.6;""", """  stroke: rgba(255, 255, 255, 0.82);
  stroke-width: 2.8;""")

s = s.replace(""".stick-arrow.hot { stroke: #ffd9a0; opacity: 1; }""", """.stick-arrow.hot { stroke: #ffc36b; opacity: 1; filter: drop-shadow(0 0 6px rgba(255, 176, 64, 0.9)); }""")

s = s.replace("""  background: rgba(255, 255, 255, 0.55);
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.6);""", """  background: rgba(255, 255, 255, 0.75);
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.8);""")

# --- boost button: thinner energy ring, crisper edge
s = s.replace("""    radial-gradient(closest-side, rgba(255, 255, 255, 0.97) 0 72%, rgba(255, 255, 255, 0) 73%),
    conic-gradient(from -90deg, #ff6b4a calc(var(--e, 100) * 1%), rgba(255, 255, 255, 0.6) 0);""",
"""    radial-gradient(closest-side, rgba(255, 255, 255, 0.98) 0 77%, rgba(255, 255, 255, 0) 78%),
    conic-gradient(from -90deg, #ff6b4a calc(var(--e, 100) * 1%), rgba(255, 255, 255, 0.42) 0);""")

# --- landscape trims: menu fits, instrument card above the stick
s = s.replace("""  .start-wrap {
    width: min(430px, 56vw);
    max-height: calc(100% - 8px);
    padding: 14px 16px 12px;
    border-radius: 22px;
  }""", """  .start-wrap {
    width: min(430px, 56vw);
    max-height: calc(100% - 4px);
    padding: 12px 15px 10px;
    border-radius: 21px;
  }""")
s = s.replace("""  h1.title { font-size: 29px; margin-bottom: 3px; }""", """  h1.title { font-size: 27px; margin-bottom: 2px; }""")
s = s.replace("""  .modes { margin-bottom: 10px; gap: 5px; }
  .mode { padding: 6px 10px; grid-template-columns: 28px 1fr auto; gap: 9px; border-radius: 13px; }""",
"""  .modes { margin-bottom: 8px; gap: 5px; }
  .mode { padding: 5px 10px; grid-template-columns: 28px 1fr auto; gap: 9px; border-radius: 13px; }""")
s = s.replace("""  .start-actions { margin-bottom: 7px; gap: 7px; }""", """  .start-actions { margin-bottom: 6px; gap: 7px; }""")
s = s.replace("""  .start-foot { font-size: 10px; gap: 9px; }""", """  .start-foot { font-size: 9.5px; gap: 8px; }""")

s = s.replace("""  .hud-bl {
    display: block;
    left: 50%;
    bottom: calc(10px + env(safe-area-inset-bottom));
    transform: translateX(-50%);
    width: 196px;
    padding: 7px 12px 8px;
  }""", """  .hud-bl {
    display: block;
    left: calc(14px + env(safe-area-inset-left));
    bottom: calc(156px + env(safe-area-inset-bottom));
    transform: none;
    width: 168px;
    padding: 6px 10px 7px;
    border-radius: 13px;
  }
  .hud-bl .gauge-lbl { font-size: 8.5px; }""")

io.open(p, 'w', encoding='utf-8').write(s)
print('ok')
