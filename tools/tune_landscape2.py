import io, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ------------------------------------------------------------------ CSS
p = os.path.join(root, 'css', 'style.css')
s = io.open(p, encoding='utf-8').read()
s = s.rstrip() + """

/* very short landscape screens (iPhone SE / small android) */
@media (orientation: landscape) and (max-height: 345px) {
  .start-wrap { padding: 10px 14px 9px; border-radius: 19px; }
  h1.title { font-size: 24px; }
  .brand-row { margin-bottom: 6px; }
  .sec-label { display: none; }
  .mode { padding: 4px 9px; }
  .modes { margin-bottom: 7px; }
  .start-actions { margin-bottom: 5px; }
  .btn-primary { height: 40px; font-size: 13px; }
  .btn-icon { width: 40px; height: 40px; }
  .start-foot { font-size: 9px; gap: 7px; }
  .start-foot b { font-size: 10.5px; }
}
"""
io.open(p, 'w', encoding='utf-8').write(s)
print('css short ok')

# ------------------------------------------------------------------ JS camera framing
p = os.path.join(root, 'js', 'main.js')
s = io.open(p, encoding='utf-8').read()

s = s.replace("""function themeCameraSnap() {
  const post = world.post;
  menuCenter.copy(post.pos).add(new THREE.Vector3(0, 12, 0));
  menuAngle = 0.7;
  camera.position.set(menuCenter.x + Math.cos(menuAngle) * 56, menuCenter.y + 20, menuCenter.z + Math.sin(menuAngle) * 56);
  camLook.copy(menuCenter);
  camera.lookAt(camLook);
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
  camLook.copy(menuCenter).addScaledVector(right, -13);
  camera.lookAt(camLook);""", """function menuFrame() {
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
  camera.lookAt(camLook);""")

s = s.replace("""    menuAngle += dt * 0.075;
    const narrow = window.innerWidth < 860;
    const radius = narrow ? 56 : 56;
    const y = menuCenter.y + (narrow ? 24 : 20) + Math.sin(menuAngle * 0.8) * 4;
    camDesired.set(menuCenter.x + Math.cos(menuAngle) * radius, y, menuCenter.z + Math.sin(menuAngle) * radius);
    camera.position.lerp(camDesired, 1 - Math.exp(-1.6 * dt));
    const look = menuCenter.clone().add(new THREE.Vector3(0, Math.sin(menuAngle * 0.6) * 2, 0));
    camLook.lerp(look, 1 - Math.exp(-2 * dt));
    camera.lookAt(camLook);
    // push the scene to the right so the start panel has room, and up on portrait
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
    const lookPoint = camLook.clone().addScaledVector(right, narrow ? -4 : -13);
    if (narrow) lookPoint.y -= 17;
    camera.lookAt(lookPoint);""", """    menuAngle += dt * 0.075;
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
    camera.lookAt(lookPoint);""")

io.open(p, 'w', encoding='utf-8').write(s)
print('js ok')
