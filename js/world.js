import * as THREE from 'three';

/* ------------------------------------------------------------------ utils */
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const M = {
  grass: new THREE.MeshLambertMaterial({ color: 0x63d47f, flatShading: true }),
  grassDark: new THREE.MeshLambertMaterial({ color: 0x46b869, flatShading: true }),
  dirt: new THREE.MeshLambertMaterial({ color: 0xc9a179, flatShading: true }),
  rock: new THREE.MeshLambertMaterial({ color: 0xbe9271, flatShading: true }),
  rockDark: new THREE.MeshLambertMaterial({ color: 0xa17a5b, flatShading: true }),
  trunk: new THREE.MeshLambertMaterial({ color: 0x9c6b46, flatShading: true }),
  leafA: new THREE.MeshLambertMaterial({ color: 0x3fbb6f, flatShading: true }),
  leafB: new THREE.MeshLambertMaterial({ color: 0x5bd77f, flatShading: true }),
  leafC: new THREE.MeshLambertMaterial({ color: 0x2fa563, flatShading: true }),
  leafPink: new THREE.MeshLambertMaterial({ color: 0xffa8c5, flatShading: true }),
  wall: new THREE.MeshLambertMaterial({ color: 0xfff5e6, flatShading: true }),
  wallWarm: new THREE.MeshLambertMaterial({ color: 0xffe3c4, flatShading: true }),
  roof: new THREE.MeshLambertMaterial({ color: 0xff6b4a, flatShading: true }),
  roofBlue: new THREE.MeshLambertMaterial({ color: 0x5b8def, flatShading: true }),
  roofGold: new THREE.MeshLambertMaterial({ color: 0xffc857, flatShading: true }),
  wood: new THREE.MeshLambertMaterial({ color: 0xb98a5c, flatShading: true }),
  dark: new THREE.MeshLambertMaterial({ color: 0x35414e, flatShading: true }),
  pad: new THREE.MeshLambertMaterial({ color: 0xfff7e8, flatShading: true }),
  padRing: new THREE.MeshLambertMaterial({ color: 0xff7a55, flatShading: true }),
  glass: new THREE.MeshLambertMaterial({ color: 0x9fe4ff, emissive: 0x2b6f8f, emissiveIntensity: 0.45 }),
  cloud: new THREE.MeshLambertMaterial({
    color: 0xffffff,
    emissive: 0xdff0ff,
    emissiveIntensity: 0.62,
    flatShading: true,
  }),
};

const GOLD = 0xffcf5c;

export const ISLANDS_LAYOUT = [
  { key: 'post', nameKey: 'post', kind: 'post', pos: [0, 14, 0], radius: 17, height: 30, seed: 11, order: true },
  { key: 'mist', nameKey: 'mist', kind: 'house', pos: [-165, 30, -195], radius: 13, height: 26, seed: 23, order: true },
  { key: 'wheat', nameKey: 'wheat', kind: 'house', pos: [135, 2, -258], radius: 16, height: 32, seed: 37, order: true },
  { key: 'mill', nameKey: 'mill', kind: 'windmill', pos: [262, 36, 34], radius: 14, height: 28, seed: 53, order: true },
  { key: 'beacon', nameKey: 'beacon', kind: 'lighthouse', pos: [-48, -6, 248], radius: 13, height: 36, seed: 71, order: true },
  { key: 'bloom', nameKey: 'bloom', kind: 'house', pos: [-282, 20, 96], radius: 15, height: 30, seed: 89, order: true },
];

export class World {
  constructor(scene) {
    this.scene = scene;
    this.islands = [];
    this.rings = [];
    this.t = 0;
    this.cloudData = [];

    this._buildSky();
    this._buildLights();
    this._buildClouds();
    this._buildIslands();
    this._buildRings();
  }

  /* ------------------------------------------------------------------ sky */
  _buildSky() {
    const geo = new THREE.SphereGeometry(2600, 32, 20);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x2f9fe0) },
        midColor: { value: new THREE.Color(0x8fd7f8) },
        botColor: { value: new THREE.Color(0xe6f7ff) },
        sunDir: { value: new THREE.Vector3(0.55, 0.62, 0.42).normalize() },
        sunColor: { value: new THREE.Color(0xfff3cf) },
      },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 botColor;
        uniform vec3 sunDir;
        uniform vec3 sunColor;
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          float h = clamp(d.y, -1.0, 1.0);
          vec3 col = mix(midColor, topColor, pow(clamp(h, 0.0, 1.0), 0.62));
          col = mix(botColor, col, smoothstep(-0.06, 0.30, h));
          float s = max(dot(d, normalize(sunDir)), 0.0);
          col += sunColor * pow(s, 260.0) * 1.6;
          col += sunColor * pow(s, 9.0) * 0.10;
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }
      `,
    });
    const sky = new THREE.Mesh(geo, mat);
    sky.frustumCulled = false;
    sky.renderOrder = -100;
    this.scene.add(sky);

    this.scene.fog = new THREE.Fog(0xcfeaff, 420, 1550);
  }

  /* --------------------------------------------------------------- lights */
  _buildLights() {
    const hemi = new THREE.HemisphereLight(0xe6f6ff, 0xc3e4f2, 0.72);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xfff4dd, 1.02);
    dir.position.set(90, 150, 70);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.near = 10;
    dir.shadow.camera.far = 460;
    const s = 95;
    dir.shadow.camera.left = -s;
    dir.shadow.camera.right = s;
    dir.shadow.camera.top = s;
    dir.shadow.camera.bottom = -s;
    dir.shadow.bias = -0.0008;
    dir.shadow.normalBias = 0.5;
    this.scene.add(dir);
    this.scene.add(dir.target);
    this.sun = dir;

    const fill = new THREE.DirectionalLight(0xc8ecff, 0.2);
    fill.position.set(-120, 60, -90);
    this.scene.add(fill);
  }

  /* --------------------------------------------------------------- clouds */
  _buildClouds() {
    const geo = new THREE.IcosahedronGeometry(1, 1);
    const count = 460;
    const inst = new THREE.InstancedMesh(geo, M.cloud, count);
    inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    inst.frustumCulled = false;
    inst.castShadow = false;
    inst.receiveShadow = false;
    this.scene.add(inst);
    this.cloudMesh = inst;

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    let i = 0;

    // mid-air cloud clusters
    for (let c = 0; c < 78 && i < count; c++) {
      const r = mulberry32(1000 + c)();
      const ang = r * Math.PI * 2;
      const dist = 190 + mulberry32(2000 + c)() * 560;
      const cx = Math.cos(ang) * dist;
      const cz = Math.sin(ang) * dist;
      const cy = -30 + mulberry32(3000 + c)() * 132;
      const puffs = 2 + Math.floor(mulberry32(4000 + c)() * 3);
      const base = 8 + mulberry32(5000 + c)() * 13;
      for (let p = 0; p < puffs && i < count; p++) {
        const rr = mulberry32(6000 + c * 7 + p);
        const d = base * (0.55 + rr() * 0.7);
        this.cloudData.push({
          x: cx + (rr() - 0.5) * base * 3.2,
          y: cy + (rr() - 0.5) * base * 0.7,
          z: cz + (rr() - 0.5) * base * 3.2,
          s: d,
          sx: 1 + rr() * 0.7,
          sy: 0.52 + rr() * 0.3,
          sz: 1 + rr() * 0.8,
          spd: 0.7 + rr() * 1.5,
          ph: rr() * 6.28,
          i,
        });
        i++;
      }
    }
    // cloud sea far below
    for (let c = 0; c < 34 && i < count; c++) {
      const rr = mulberry32(7000 + c);
      const ang = rr() * Math.PI * 2;
      const dist = 120 + rr() * 700;
      this.cloudData.push({
        x: Math.cos(ang) * dist,
        y: -80 - rr() * 20,
        z: Math.sin(ang) * dist,
        s: 18 + rr() * 26,
        sx: 1.4 + rr() * 0.8,
        sy: 0.45 + rr() * 0.22,
        sz: 1.5 + rr(),
        spd: 0.5 + rr(),
        ph: rr() * 6.28,
        i,
      });
      i++;
    }
    // park unused instances far away
    while (i < count) {
      this.cloudData.push({ x: 0, y: -9999, z: 0, s: 0.01, sx: 1, sy: 1, sz: 1, spd: 0, ph: 0, i });
      i++;
    }

    q.identity();
    scl.set(1, 1, 1);
    for (const c of this.cloudData) {
      pos.set(c.x, c.y, c.z);
      scl.set(c.s * c.sx, c.s * c.sy, c.s * c.sz);
      m.compose(pos, q, scl);
      inst.setMatrixAt(c.i, m);
    }
    inst.instanceMatrix.needsUpdate = true;

    // soft cloud sea floor with a procedural mottled texture
    const floorGeo = new THREE.CircleGeometry(1900, 56);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshLambertMaterial({ color: 0xd8edfc, emissive: 0xc2e3f8, emissiveIntensity: 0.25 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -136;
    this.scene.add(floor);
  }

  _cloudSeaTexture() {
    const size = 256;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, '#e8f6ff');
    g.addColorStop(1, '#dcefff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    const rnd = mulberry32(777);
    for (let i = 0; i < 90; i++) {
      const x = rnd() * size;
      const y = rnd() * size;
      const r = 14 + rnd() * 46;
      const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
      const a = 0.2 + rnd() * 0.55;
      grd.addColorStop(0, `rgba(255,255,255,${a})`);
      grd.addColorStop(0.6, `rgba(255,255,255,${a * 0.45})`);
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // a few cooler hollows
    for (let i = 0; i < 26; i++) {
      const x = rnd() * size;
      const y = rnd() * size;
      const r = 20 + rnd() * 50;
      const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, 'rgba(176,214,238,0.30)');
      grd.addColorStop(1, 'rgba(176,214,238,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  /* -------------------------------------------------------------- islands */
  _buildIslands() {
    for (const cfg of ISLANDS_LAYOUT) this._addIsland(cfg);

    // decorative background islands
    const rnd = mulberry32(4242);
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2 + rnd() * 0.5;
      const dist = 320 + rnd() * 430;
      const radius = 8 + rnd() * 9;
      this._addIsland({
        key: 'deco' + i,
        nameKey: null,
        kind: rnd() > 0.72 ? 'windmill' : 'house',
        pos: [Math.cos(ang) * dist, -30 + rnd() * 85, Math.sin(ang) * dist],
        radius,
        height: radius * (1.8 + rnd() * 1.2),
        seed: 500 + i * 13,
        deco: true,
      });
    }
  }

  _addIsland(cfg) {
    const [px, py, pz] = cfg.pos;
    const radius = cfg.radius;
    const height = cfg.height;
    const rnd = mulberry32(cfg.seed);
    const group = new THREE.Group();
    group.position.set(px, py, pz);
    this.scene.add(group);

    // grass cap
    const grassGeo = new THREE.CylinderGeometry(radius, radius * 0.9, 1.6, 12, 1);
    const grass = new THREE.Mesh(grassGeo, M.grass);
    grass.position.y = -0.8;
    grass.receiveShadow = true;
    group.add(grass);

    const rimGeo = new THREE.CylinderGeometry(radius * 0.9, radius * 0.66, 2.4, 12, 1);
    const rim = new THREE.Mesh(rimGeo, M.dirt);
    rim.position.y = -2.8;
    rim.receiveShadow = true;
    group.add(rim);

    const rockGeo = new THREE.ConeGeometry(radius * 0.68, height, 9, 2);
    rockGeo.rotateX(Math.PI);
    const rock = new THREE.Mesh(rockGeo, M.rock);
    rock.position.y = -4.0 - height / 2;
    rock.receiveShadow = true;
    group.add(rock);

    // a couple of hanging rock spikes for silhouette
    for (let i = 0; i < 2; i++) {
      const h = height * (0.34 + rnd() * 0.3);
      const sg = new THREE.ConeGeometry(radius * (0.14 + rnd() * 0.12), h, 6, 1);
      sg.rotateX(Math.PI);
      const sp = new THREE.Mesh(sg, M.rockDark);
      sp.position.set((rnd() - 0.5) * radius * 0.9, -4.5 - h / 2 - rnd() * height * 0.22, (rnd() - 0.5) * radius * 0.9);
      group.add(sp);
    }

    // trees
    const treeCount = cfg.deco ? 1 + Math.floor(rnd() * 2) : 3 + Math.floor(rnd() * 3);
    const placed = [];
    for (let i = 0; i < treeCount; i++) {
      let a = rnd() * Math.PI * 2;
      let d = radius * (0.42 + rnd() * 0.42);
      let x = Math.cos(a) * d;
      let z = Math.sin(a) * d;
      let guard = 0;
      while (placed.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < 16) && guard++ < 12) {
        a = rnd() * Math.PI * 2;
        d = radius * (0.4 + rnd() * 0.45);
        x = Math.cos(a) * d;
        z = Math.sin(a) * d;
      }
      placed.push({ x, z });
      this._addTree(group, x, z, 0.85 + rnd() * 0.5, cfg.key === 'bloom' ? M.leafPink : [M.leafA, M.leafB, M.leafC][i % 3]);
    }

    // landing pad on ordered islands
    if (!cfg.deco) {
      const padR = Math.min(radius * 0.36, 6.4);
      const pad = new THREE.Mesh(new THREE.CircleGeometry(padR, 28), M.pad);
      pad.rotation.x = -Math.PI / 2;
      pad.position.y = 0.02;
      pad.receiveShadow = true;
      group.add(pad);

      const ringGeo = new THREE.RingGeometry(padR * 0.78, padR * 0.9, 28);
      const ring = new THREE.Mesh(ringGeo, M.padRing);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.05;
      group.add(ring);

      const crossA = new THREE.Mesh(new THREE.PlaneGeometry(padR * 0.5, padR * 0.1), M.padRing);
      crossA.rotation.x = -Math.PI / 2;
      crossA.position.y = 0.06;
      group.add(crossA);
      const crossB = crossA.clone();
      crossB.rotation.z = Math.PI / 2;
      crossB.position.y = 0.061;
      group.add(crossB);
    }

    // buildings
    const houseSpots = [
      { a: -1.2, d: radius * 0.62 },
      { a: 1.9, d: radius * 0.55 },
      { a: 3.4, d: radius * 0.6 },
    ];
    if (cfg.kind === 'post') {
      this._addPostOffice(group, radius);
    } else if (cfg.kind === 'windmill') {
      const s = houseSpots[0];
      this._addWindmill(group, Math.cos(s.a) * s.d, Math.sin(s.a) * s.d, radius);
      if (!cfg.deco) this._addHouse(group, houseSpots[1].a, houseSpots[1].d, radius, M.roofBlue, rnd);
    } else if (cfg.kind === 'lighthouse') {
      this._addLighthouse(group, radius);
      if (!cfg.deco) this._addHouse(group, houseSpots[1].a, houseSpots[1].d, radius, M.roof, rnd);
    } else {
      this._addHouse(group, houseSpots[0].a, houseSpots[0].d, radius, rnd() > 0.5 ? M.roof : M.roofBlue, rnd);
      if (!cfg.deco) this._addHouse(group, houseSpots[2].a, houseSpots[2].d, radius, rnd() > 0.5 ? M.roofGold : M.roof, rnd);
    }

    // fence posts near the pad rim for ordered islands
    if (!cfg.deco) {
      const n = 10;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const d = radius * 0.86;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.9, 5), M.wood);
        post.position.set(Math.cos(a) * d, 0.45, Math.sin(a) * d);
        post.castShadow = true;
        group.add(post);
      }
    }

    const island = {
      key: cfg.key,
      nameKey: cfg.nameKey,
      group,
      baseY: py,
      radius,
      height,
      pos: new THREE.Vector3(px, py, pz),
      padY: py,
      deco: !!cfg.deco,
      bobPhase: rnd() * Math.PI * 2,
      gate: null,
    };
    this.islands.push(island);
    if (cfg.key === 'post') this.post = island;
    return island;
  }

  _addTree(parent, x, z, scale, leafMat) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(scale);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 1.3, 5), M.trunk);
    trunk.position.y = 0.65;
    trunk.castShadow = true;
    g.add(trunk);

    const l1 = new THREE.Mesh(new THREE.ConeGeometry(1.15, 1.9, 6), leafMat);
    l1.position.y = 1.95;
    l1.castShadow = true;
    g.add(l1);
    const l2 = new THREE.Mesh(new THREE.ConeGeometry(0.86, 1.5, 6), leafMat);
    l2.position.y = 2.85;
    l2.castShadow = true;
    g.add(l2);
    parent.add(g);
  }

  _addHouse(parent, angle, dist, radius, roofMat, rnd) {
    const g = new THREE.Group();
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    g.position.set(x, 0, z);
    g.rotation.y = -angle + Math.PI / 2 + (rnd() - 0.5) * 0.4;

    const w = 3.0;
    const h = 2.2;
    const d = 2.7;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M.wall);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.82, 1.5, 4), roofMat);
    roof.position.y = h + 0.72;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    g.add(roof);

    const door = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.25, 0.08), M.wood);
    door.position.set(0, 0.62, d / 2 + 0.02);
    g.add(door);

    const winMat = M.glass;
    for (const sx of [-1, 1]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.08), winMat);
      win.position.set(sx * 0.92, 1.42, d / 2 + 0.02);
      g.add(win);
    }
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.0, 0.42), M.wallWarm);
    chimney.position.set(w * 0.28, h + 1.0, -d * 0.18);
    chimney.castShadow = true;
    g.add(chimney);

    parent.add(g);
    return g;
  }

  _addPostOffice(parent, radius) {
    const g = new THREE.Group();
    g.position.set(-radius * 0.3, 0, -radius * 0.34);
    g.rotation.y = 0.62;
    g.scale.setScalar(0.92);

    const body = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.6, 5.0), M.wall);
    body.position.y = 1.8;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(4.9, 2.4, 4), M.roof);
    roof.position.y = 4.8;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    g.add(roof);

    // porch
    const porch = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.22, 1.7), M.wood);
    porch.position.set(0, 2.5, 3.2);
    porch.castShadow = true;
    g.add(porch);
    for (const sx of [-1, 1]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 2.5, 6), M.wall);
      col.position.set(sx * 2.8, 1.25, 3.9);
      col.castShadow = true;
      g.add(col);
    }

    // door + windows
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.0, 0.1), M.wood);
    door.position.set(0, 1.0, 2.52);
    g.add(door);
    for (const sx of [-1, 1]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 0.1), M.glass);
      win.position.set(sx * 2.0, 1.9, 2.52);
      g.add(win);
      const win2 = win.clone();
      win2.rotation.y = Math.PI / 2;
      win2.position.set(sx * 3.22, 1.9, 0.6);
      g.add(win2);
    }

    // sign board
    const sign = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.0, 0.16), M.roofBlue);
    sign.position.set(0, 3.05, 2.6);
    g.add(sign);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.22, 0.2), M.pad);
    stripe.position.set(0, 3.05, 2.62);
    g.add(stripe);

    // flag pole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 6.5, 5), M.dark);
    pole.position.set(3.9, 3.25, -2.2);
    pole.castShadow = true;
    g.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.2), new THREE.MeshLambertMaterial({ color: GOLD, side: THREE.DoubleSide }));
    flag.position.set(5.05, 5.7, -2.2);
    g.add(flag);
    this.flag = flag;

    parent.add(g);
  }

  _addWindmill(parent, x, z, radius) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = 0.8;

    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.8, 6.2, 8), M.wallWarm);
    tower.position.y = 3.1;
    tower.castShadow = true;
    tower.receiveShadow = true;
    g.add(tower);

    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.55, 1.7, 8), M.roof);
    cap.position.y = 7.0;
    cap.castShadow = true;
    g.add(cap);

    const hub = new THREE.Group();
    hub.position.set(0, 6.2, 1.65);
    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Group();
      arm.rotation.z = (i / 4) * Math.PI * 2;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.75, 3.6, 0.12), M.wall);
      blade.position.y = 2.1;
      blade.castShadow = true;
      arm.add(blade);
      hub.add(arm);
    }
    const hubCore = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), M.roofGold);
    hub.add(hubCore);
    g.add(hub);
    this.windmill = hub;

    parent.add(g);
  }

  _addLighthouse(parent, radius) {
    const g = new THREE.Group();
    g.position.set(radius * 0.36, 0, -radius * 0.3);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.85, 8.1, 9), M.wall);
    base.position.y = 4.05;
    base.castShadow = true;
    base.receiveShadow = true;
    g.add(base);

    for (let i = 0; i < 2; i++) {
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(1.5 - i * 0.14, 1.58 - i * 0.14, 1.5, 9), M.roof);
      stripe.position.y = 2.6 + i * 3.0;
      g.add(stripe);
    }

    const room = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 1.3, 8), M.glass);
    room.position.y = 8.7;
    g.add(room);

    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.5, 8), M.roof);
    cap.position.y = 9.9;
    cap.castShadow = true;
    g.add(cap);

    const lamp = new THREE.PointLight(0xffd27a, 1.1, 40);
    lamp.position.y = 8.7;
    g.add(lamp);
    this.lamp = lamp;

    parent.add(g);
  }

  /* ---------------------------------------------------------------- rings */
  _buildRings() {
    const rnd = mulberry32(909);

    // wind rings scattered around the sky
    const windPositions = [
      [-70, 26, -70], [30, 34, -130], [-120, 44, -120], [60, 18, -200],
      [-190, 22, -220], [168, 46, 62], [170, 26, -80], [220, 48, -30],
      [240, 24, 130], [150, 10, 190], [26, 36, 196], [-90, 12, 190],
      [-220, 40, 160], [-260, 26, -30], [-180, 4, 10], [-186, 54, -46],
      [120, 56, 90], [-330, 18, 220], [330, 30, -170], [0, 8, -330],
    ];
    for (const p of windPositions) {
      this._addRing(new THREE.Vector3(p[0], p[1], p[2]), 6.3 + rnd() * 1.1, true);
    }

    // delivery gates
    const orderIslands = this.islands.filter((i) => i.nameKey && i.nameKey !== 'post');
    orderIslands.forEach((island, idx) => {
      const from = idx === 0 ? this.post : orderIslands[idx - 1];
      const gatePos = island.pos.clone().add(new THREE.Vector3(0, 17, 0));
      const dir = new THREE.Vector3().subVectors(gatePos, from.pos.clone().add(new THREE.Vector3(0, 17, 0))).normalize();
      const gate = this._addRing(gatePos, 7.2, false, dir, true);
      island.gate = gate;
      gate.group.visible = false;

      // light beam over the pad
      const beam = this._makeBeam(3.0, 72);
      beam.position.copy(island.pos).add(new THREE.Vector3(0, 1, 0));
      beam.visible = false;
      this.scene.add(beam);
      gate.beam = beam;

      const halo = new THREE.Mesh(
        new THREE.RingGeometry(island.radius * 0.36, island.radius * 0.42, 32),
        new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
      );
      halo.rotation.x = -Math.PI / 2;
      halo.position.copy(island.pos).add(new THREE.Vector3(0, 0.12, 0));
      halo.visible = false;
      this.scene.add(halo);
      gate.halo = halo;
    });
  }

  _addRing(pos, radius, isWind, dirVec, isGate = false) {
    const group = new THREE.Group();
    group.position.copy(pos);

    if (dirVec) {
      const target = pos.clone().add(dirVec);
      group.lookAt(target);
    } else {
      group.rotation.y = Math.random() * Math.PI;
      group.rotation.x = (Math.random() - 0.5) * 0.22;
    }

    const color = isGate ? 0xffd066 : GOLD;
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(radius, radius * 0.082, 8, 30),
      new THREE.MeshLambertMaterial({ color, emissive: 0x8a5a00, emissiveIntensity: 0.55, flatShading: true })
    );
    torus.castShadow = false;
    group.add(torus);

    const glow = new THREE.Mesh(
      new THREE.TorusGeometry(radius, radius * 0.2, 8, 30),
      new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.24, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    group.add(glow);

    const film = new THREE.Mesh(
      new THREE.CircleGeometry(radius * 0.94, 26),
      new THREE.MeshBasicMaterial({ color: 0xfff0c4, transparent: true, opacity: isGate ? 0.16 : 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    );
    group.add(film);

    // little studs
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const stud = new THREE.Mesh(
        new THREE.IcosahedronGeometry(radius * 0.075, 0),
        new THREE.MeshBasicMaterial({ color: 0xfff2c8 })
      );
      stud.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
      group.add(stud);
    }

    this.scene.add(group);
    const ring = {
      group,
      torus,
      glow,
      film,
      radius,
      isWind,
      isGate,
      basePos: pos.clone(),
      active: true,
      cooldown: 0,
      spin: Math.random() * 6.28,
    };
    if (isWind) this.rings.push(ring);
    return ring;
  }

  _makeBeam(radius, height) {
    const c = document.createElement('canvas');
    c.width = 8;
    c.height = 128;
    const ctx = c.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, 'rgba(255,241,200,0)');
    grad.addColorStop(0.55, 'rgba(255,214,120,0.55)');
    grad.addColorStop(1, 'rgba(255,206,96,0.95)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 8, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;

    const geo = new THREE.CylinderGeometry(radius, radius, height, 14, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.y = height / 2;
    return m;
  }

  /* --------------------------------------------------------------- update */
  update(dt, playerPos) {
    this.t += dt;
    const t = this.t;

    // clouds
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    for (const c of this.cloudData) {
      if (c.s < 0.02) continue;
      const drift = c.spd * dt;
      c.x += drift;
      if (c.x > 780) c.x = -780;
      p.set(c.x, c.y + Math.sin(t * 0.22 + c.ph) * 1.2, c.z);
      s.set(c.s * c.sx, c.s * c.sy, c.s * c.sz);
      m.compose(p, q, s);
      this.cloudMesh.setMatrixAt(c.i, m);
    }
    this.cloudMesh.instanceMatrix.needsUpdate = true;

    // islands bob
    for (const isl of this.islands) {
      isl.group.position.y = isl.baseY + Math.sin(t * 0.32 + isl.bobPhase) * 0.55;
    }

    // rings
    for (const r of this.rings) {
      r.spin += dt * (r.active ? 0.85 : 1.4);
      r.torus.rotation.z = r.spin;
      r.glow.rotation.z = -r.spin * 0.6;
      const pulse = 1 + Math.sin(t * 2.2 + r.spin) * 0.02;
      r.group.scale.setScalar(pulse * (r.active ? 1 : 0.85));
      r.glow.material.opacity = r.active ? 0.2 + Math.sin(t * 3 + r.spin) * 0.07 : 0.05;
      r.film.material.opacity = r.active ? (r.isGate ? 0.16 : 0.1) : 0.02;
      if (!r.active && r.cooldown > 0) {
        r.cooldown -= dt;
        if (r.cooldown <= 0) {
          r.active = true;
          r.group.visible = true;
        }
      }
    }

    // gates
    for (const isl of this.islands) {
      if (!isl.gate || !isl.gate.group.visible) continue;
      const g = isl.gate;
      g.group.position.y = isl.pos.y + 17 + Math.sin(t * 1.4) * 0.8;
      g.torus.rotation.z = t * 0.5;
      g.glow.rotation.z = -t * 0.35;
      const pulse = 1 + Math.sin(t * 2.6) * 0.035;
      g.group.scale.setScalar(pulse);
      if (g.beam) {
        g.beam.position.y = isl.pos.y + 1 + Math.sin(t * 0.9) * 0.4;
        g.beam.material.opacity = 0.55 + Math.sin(t * 2.1) * 0.18;
      }
      if (g.halo) g.halo.material.opacity = 0.35 + Math.sin(t * 3.1) * 0.2;
    }

    // windmill blades / flag / lighthouse
    if (this.windmill) this.windmill.rotation.z += dt * 0.55;
    if (this.flag) this.flag.rotation.y = Math.sin(t * 1.6) * 0.18;
    if (this.lamp) this.lamp.intensity = 0.7 + Math.sin(t * 2.4) * 0.35;

    // sun follows player for crisp shadows
    if (playerPos) {
      this.sun.position.set(playerPos.x + 90, playerPos.y + 150, playerPos.z + 70);
      this.sun.target.position.copy(playerPos);
      this.sun.target.updateMatrixWorld();
    }
  }

  // distance helper: returns island if player collides
  collisionAt(pos) {
    for (const isl of this.islands) {
      const dy = pos.y - isl.group.position.y;
      if (dy > 4.2 || dy < -isl.height) continue;
      const dx = pos.x - isl.pos.x;
      const dz = pos.z - isl.pos.z;
      const d2 = dx * dx + dz * dz;
      const r = isl.radius * 0.94;
      if (d2 < r * r) return { island: isl, dx, dz, d: Math.sqrt(d2) };
    }
    return null;
  }

  resetRings() {
    for (const r of this.rings) {
      r.active = true;
      r.group.visible = true;
      r.cooldown = 0;
      r.group.scale.setScalar(1);
    }
  }
}
