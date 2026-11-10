import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

/* -------------------------------------------------------------- boost trail */
class Trail {
  constructor(scene, count = 130) {
    this.count = count;
    this.positions = new Float32Array(count * 3);
    this.life = new Float32Array(count);
    this.size = new Float32Array(count);
    this.vel = new Float32Array(count * 3);
    this.cursor = 0;
    this.acc = 0;

    for (let i = 0; i < count; i++) {
      this.positions[i * 3 + 1] = -9999;
      this.life[i] = 0;
      this.size[i] = 1;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('aLife', new THREE.BufferAttribute(this.life, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color(0xffd9a8) } },
      vertexShader: `
        attribute float aLife;
        attribute float aSize;
        varying float vLife;
        void main() {
          vLife = aLife;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (260.0 / max(-mv.z, 1.0));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vLife;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          float a = smoothstep(0.5, 0.08, d) * vLife;
          if (a < 0.01) discard;
          gl_FragColor = vec4(uColor, a * 0.8);
        }
      `,
    });

    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.geo = geo;
    scene.add(this.points);
  }

  emit(pos, back, spread, strength) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.count;
    this.positions[i * 3] = pos.x + back.x * 1.6 + (Math.random() - 0.5) * spread;
    this.positions[i * 3 + 1] = pos.y + back.y * 1.6 + (Math.random() - 0.5) * spread;
    this.positions[i * 3 + 2] = pos.z + back.z * 1.6 + (Math.random() - 0.5) * spread;
    this.vel[i * 3] = back.x * 2 + (Math.random() - 0.5) * 1.5;
    this.vel[i * 3 + 1] = back.y * 2 + (Math.random() - 0.5) * 1.5;
    this.vel[i * 3 + 2] = back.z * 2 + (Math.random() - 0.5) * 1.5;
    this.life[i] = 1;
    this.size[i] = 0.9 + Math.random() * 1.3 + strength * 1.2;
  }

  update(dt) {
    for (let i = 0; i < this.count; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt * 1.35;
      if (this.life[i] <= 0) {
        this.life[i] = 0;
        this.positions[i * 3 + 1] = -9999;
        continue;
      }
      this.positions[i * 3] += this.vel[i * 3] * dt;
      this.positions[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.positions[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aLife.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
  }

  clear() {
    for (let i = 0; i < this.count; i++) {
      this.life[i] = 0;
      this.positions[i * 3 + 1] = -9999;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aLife.needsUpdate = true;
  }
}

/* -------------------------------------------------------------------- plane */
export class Plane {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.rotation.order = 'YXZ';
    scene.add(this.group);

    this.pos = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.roll = 0;
    this.speed = 24;
    this.baseSpeed = 24;
    this.boostSpeed = 46;
    this.energy = 100;
    this.boosting = false;
    this.hitTimer = 0;
    this.bankTarget = 0;

    this.forward = new THREE.Vector3(0, 0, -1);
    this.ready = false;
    this.prop = null;
    this.propSpin = 0;

    this.trail = new Trail(scene, 150);
    this._tmp = new THREE.Vector3();
  }

  async load(url) {
    try {
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(url);
      const model = gltf.scene;
      model.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = false;
          o.frustumCulled = false;
          if (o.material && o.material.transparent) o.renderOrder = 2;
        }
      });
      model.scale.setScalar(1.38);
      this.group.add(model);
      this.model = model;
      this.prop = model.getObjectByName('Propeller');
    } catch (err) {
      console.warn('[plane] glb load failed, using fallback', err);
      this._buildFallback();
    }
    this.ready = true;
    return this;
  }

  _buildFallback() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 2.2, 4, 8), new THREE.MeshLambertMaterial({ color: 0xff6b4a }));
    body.rotation.x = Math.PI / 2;
    body.castShadow = true;
    g.add(body);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(5, 0.12, 1.1), new THREE.MeshLambertMaterial({ color: 0xff6b4a }));
    wing.position.y = 0.1;
    wing.castShadow = true;
    g.add(wing);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.8), new THREE.MeshLambertMaterial({ color: 0xff6b4a }));
    fin.position.set(0, 0.45, 1.1);
    g.add(fin);
    this.group.add(g);
    this.model = g;
  }

  reset(pos, yaw) {
    this.pos.copy(pos);
    this.yaw = yaw;
    this.pitch = 0;
    this.roll = 0;
    this.bankTarget = 0;
    this.speed = this.baseSpeed;
    this.energy = 100;
    this.boosting = false;
    this.hitTimer = 0;
    this.group.position.copy(this.pos);
    this.group.rotation.set(0, yaw, 0);
    this.trail.clear();
    this.forward.set(0, 0, -1).applyEuler(this.group.rotation);
  }

  addBoost(amount = 45) {
    this.energy = clamp(this.energy + amount, 0, 100);
  }

  bump() {
    this.hitTimer = 0.5;
    this.speed *= 0.45;
  }

  update(dt, input, world, elapsed) {
    const boostPressed = input.boost;
    const canBoost = this.energy > 1.5;
    this.boosting = boostPressed && canBoost;

    // energy
    if (this.boosting) this.energy = clamp(this.energy - dt * 26, 0, 100);
    else this.energy = clamp(this.energy + dt * (input.boost ? 0 : 13), 0, 100);

    // pitch
    const pitchInput = input.climb; // -1 .. 1
    let pitchTarget;
    if (Math.abs(pitchInput) > 0.02) pitchTarget = pitchInput * 0.52;
    else pitchTarget = this.pitch * 0.985;
    this.pitch = lerp(this.pitch, clamp(pitchTarget, -0.62, 0.62), 1 - Math.exp(-5.2 * dt));

    // yaw / roll
    const turn = input.turn;
    const turnRate = 1.15 * (this.boosting ? 0.82 : 1);
    this.yaw += turn * turnRate * dt;
    this.bankTarget = -turn * (this.boosting ? 0.4 : 0.55);
    this.roll = lerp(this.roll, this.bankTarget, 1 - Math.exp(-4.5 * dt));

    // speed
    const climbPenalty = 1 - Math.max(0, this.pitch) * 0.28;
    const targetSpeed = (this.boosting ? this.boostSpeed : this.baseSpeed) * climbPenalty;
    this.speed = lerp(this.speed, targetSpeed, 1 - Math.exp(-1.7 * dt));
    if (this.hitTimer > 0) this.hitTimer -= dt;

    // integrate
    this.group.rotation.set(this.pitch, this.yaw, this.roll);
    this.forward.set(0, 0, -1).applyEuler(this.group.rotation).normalize();
    this.pos.addScaledVector(this.forward, this.speed * dt);

    // soft world bounds
    const r = Math.hypot(this.pos.x, this.pos.z);
    if (r > 760) {
      const s = 760 / r;
      this.pos.x *= s;
      this.pos.z *= s;
    }
    this.pos.y = clamp(this.pos.y, -58, 150);

    this.group.position.copy(this.pos);

    // propeller
    this.propSpin += dt * (14 + this.speed * 1.5 + (this.boosting ? 22 : 0));
    if (this.prop) this.prop.rotation.z = this.propSpin;

    // idle bobbing on the pad
    if (elapsed !== undefined && this.speed < 1) {
      this.group.position.y += Math.sin(elapsed * 1.6) * 0.06;
    }

    // trail
    if (this.boosting) {
      const back = this._tmp.copy(this.forward).multiplyScalar(-1);
      this.trail.emit(this.pos, back, 0.5, 0.6);
      this.trail.emit(this.pos, back, 0.7, 0.3);
    }
    this.trail.update(dt);

    return this;
  }

  get speedKmh() {
    return Math.round(this.speed * 5.4);
  }
}
