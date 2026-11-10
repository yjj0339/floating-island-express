import io, os

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
css_path = os.path.join(root, 'css', 'style.css')
s = io.open(css_path, encoding='utf-8').read()

touch = io.open(os.path.join(root, 'tools', '_css_touch.css'), encoding='utf-8').read()
rotate = io.open(os.path.join(root, 'tools', '_css_rotate.css'), encoding='utf-8').read()
land = io.open(os.path.join(root, 'tools', '_css_landscape.css'), encoding='utf-8').read()

# 1) base touch/overscroll behaviour
s = s.replace("""  overflow: hidden;
  background: #cdeeff;""", """  overflow: hidden;
  overscroll-behavior: none;
  touch-action: manipulation;
  background: #cdeeff;""")

# 2) swap the whole touch-controls block
start = s.index('/* mobile controls */')
end = s.index('/* ------------------------------------------------------------------ dialogs */')
s = s[:start] + touch + s[end:]

# 3) rotate gate before responsive section
marker = '/* --------------------------------------------------------------- responsive */'
s = s.replace(marker, rotate + marker)

# 4) landscape rules at the end
s = s.rstrip() + '\n\n' + land

io.open(css_path, 'w', encoding='utf-8').write(s)
print('css patched:', len(s), 'chars')
