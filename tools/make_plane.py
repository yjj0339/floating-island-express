#!/usr/bin/env python3
"""Generate assets/models/plane.glb - a low-poly coral seaplane, no external deps."""
import math
import json
import struct
import os

# ---------------------------------------------------------------- materials
MATERIALS = {
    "coral": dict(hex="#FF6A48", metal=0.05, rough=0.52, alpha=1.0),
    "cream": dict(hex="#FFF4E4", metal=0.02, rough=0.62, alpha=1.0),
    "slate": dict(hex="#2F3843", metal=0.25, rough=0.45, alpha=1.0),
    "glass": dict(hex="#5FC8E8", metal=0.6, rough=0.1, alpha=0.82),
    "kraft": dict(hex="#E2AE6C", metal=0.0, rough=0.85, alpha=1.0),
    "prop":  dict(hex="#3B424C", metal=0.3, rough=0.4, alpha=1.0),
    "gold":  dict(hex="#FFC857", metal=0.55, rough=0.3, alpha=1.0),
    "tire":  dict(hex="#22262D", metal=0.0, rough=0.9, alpha=1.0),
}
ORDER = list(MATERIALS.keys())
BODY = {k: [] for k in ORDER}
PROP = {k: [] for k in ORDER}


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))


def to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def normal(a, b, c):
    ux, uy, uz = b[0] - a[0], b[1] - a[1], b[2] - a[2]
    vx, vy, vz = c[0] - a[0], c[1] - a[1], c[2] - a[2]
    nx = uy * vz - uz * vy
    ny = uz * vx - ux * vz
    nz = ux * vy - uy * vx
    ln = math.sqrt(nx * nx + ny * ny + nz * nz) or 1.0
    return (nx / ln, ny / ln, nz / ln)


def finish(bucket, mat, verts, faces):
    if not faces:
        return
    cx = sum(v[0] for v in verts) / len(verts)
    cy = sum(v[1] for v in verts) / len(verts)
    cz = sum(v[2] for v in verts) / len(verts)
    for (i, j, k) in faces:
        a, b, c = verts[i], verts[j], verts[k]
        n = normal(a, b, c)
        fx = (a[0] + b[0] + c[0]) / 3.0 - cx
        fy = (a[1] + b[1] + c[1]) / 3.0 - cy
        fz = (a[2] + b[2] + c[2]) / 3.0 - cz
        if n[0] * fx + n[1] * fy + n[2] * fz < 0:
            b, c = c, b
            n = (-n[0], -n[1], -n[2])
        if abs(n[0]) < 1e-9 and abs(n[1]) < 1e-9 and abs(n[2]) < 1e-9:
            continue
        bucket[mat].append((a, b, c, n))


def extrude(bucket, mat, pts, off):
    n = len(pts)
    verts = list(pts) + [(p[0] + off[0], p[1] + off[1], p[2] + off[2]) for p in pts]
    faces = []
    for i in range(n):
        j = (i + 1) % n
        faces.append((i, j, j + n))
        faces.append((i, j + n, i + n))
    for i in range(1, n - 1):
        faces.append((0, i, i + 1))
        faces.append((n, n + i + 1, n + i))
    finish(bucket, mat, verts, faces)


def loft(bucket, rings, mat_side, cap_mat=None):
    m = len(rings[0])
    verts = [p for r in rings for p in r]
    groups = {}
    for k in range(len(rings) - 1):
        for i in range(m):
            j = (i + 1) % m
            a = k * m + i
            b = k * m + j
            c = (k + 1) * m + j
            d = (k + 1) * m + i
            groups.setdefault(mat_side(i), []).extend([(a, b, c), (a, c, d)])

    caps = []
    c0 = [sum(p[0] for p in rings[0]) / m, sum(p[1] for p in rings[0]) / m, sum(p[2] for p in rings[0]) / m]
    i0 = len(verts)
    verts.append(tuple(c0))
    for i in range(m):
        caps.append((i0, (i + 1) % m, i))

    last = rings[-1]
    c1 = [sum(p[0] for p in last) / m, sum(p[1] for p in last) / m, sum(p[2] for p in last) / m]
    i1 = len(verts)
    verts.append(tuple(c1))
    base = (len(rings) - 1) * m
    for i in range(m):
        caps.append((i1, base + i, base + (i + 1) % m))

    groups.setdefault(cap_mat or mat_side(0), []).extend(caps)
    for mat, faces in groups.items():
        finish(bucket, mat, verts, faces)


def ring(z, rx, ry, cy, seg=12):
    pts = []
    for i in range(seg):
        a = 2 * math.pi * i / seg
        pts.append((rx * math.cos(a), cy + ry * math.sin(a), z))
    return pts


def circle_x(x, cy, cz, r, seg=10):
    return [(x, cy + r * math.cos(2 * math.pi * i / seg), cz + r * math.sin(2 * math.pi * i / seg))
            for i in range(seg)]


def vsub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def vadd(a, b):
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])


def vmul(a, s):
    return (a[0] * s, a[1] * s, a[2] * s)


def vcross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def vnorm(a):
    l = math.sqrt(sum(x * x for x in a)) or 1.0
    return (a[0] / l, a[1] / l, a[2] / l)


def strut(bucket, mat, p0, p1, w):
    d = vnorm(vsub(p1, p0))
    up = (0, 1, 0) if abs(d[1]) < 0.9 else (1, 0, 0)
    u = vmul(vnorm(vcross(d, up)), w * 0.5)
    v = vmul(vnorm(vcross(d, u)), w * 0.5)
    rings = []
    for p in (p0, p1):
        rings.append([vadd(p, c) for c in [vadd(u, v), vadd(u, vmul(v, -1)), vsub(vmul(u, -1), v), vadd(v, vmul(u, -1))]])
    loft(bucket, rings, lambda i: mat)


# ------------------------------------------------------------------ fuselage
fus_rings = [
    ring(-1.20, 0.15, 0.15, 0.00),
    ring(-0.98, 0.30, 0.28, 0.01),
    ring(-0.60, 0.40, 0.37, 0.01),
    ring(-0.10, 0.43, 0.40, 0.02),
    ring(0.45, 0.39, 0.38, 0.05),
    ring(0.95, 0.27, 0.30, 0.10),
    ring(1.38, 0.11, 0.17, 0.16),
]


def fus_mat(i):
    return "cream" if i in (8, 9, 10) else "coral"


loft(BODY, fus_rings, fus_mat)

# nose spinner
loft(BODY, [
    ring(-1.19, 0.145, 0.145, 0.0),
    ring(-1.34, 0.105, 0.105, 0.0),
    ring(-1.50, 0.025, 0.025, 0.0),
], lambda i: "cream")

# cockpit canopy
loft(BODY, [
    ring(-0.60, 0.17, 0.13, 0.31),
    ring(-0.38, 0.245, 0.19, 0.335),
    ring(0.00, 0.235, 0.185, 0.335),
    ring(0.26, 0.145, 0.115, 0.315),
], lambda i: "glass", "glass")

# ---------------------------------------------------------------- main wings
for s in (1, -1):
    plan = [(0.22, 0.03, -0.56), (1.20, 0.13, -0.54), (2.20, 0.26, -0.34),
            (2.42, 0.285, -0.14), (2.20, 0.26, 0.04), (1.20, 0.13, 0.20),
            (0.22, 0.03, 0.42)]
    extrude(BODY, "coral", [(s * x, y, z) for (x, y, z) in plan], (0, 0.13, 0))
    # cream tip band, sitting on the upper wing surface
    tip = [(2.02, 0.245, -0.315), (2.42, 0.285, -0.14), (2.20, 0.26, 0.045), (2.02, 0.245, -0.02)]
    extrude(BODY, "cream", [(s * x, y + 0.13, z) for (x, y, z) in tip], (0, 0.018, 0))

# ------------------------------------------------------------ tail surfaces
# horizontal stabiliser
for s in (1, -1):
    plan = [(0.08, 0.16, 1.10), (0.62, 0.17, 1.18), (0.88, 0.18, 1.32),
            (0.62, 0.17, 1.50), (0.08, 0.16, 1.52)]
    extrude(BODY, "coral", [(s * x, y, z) for (x, y, z) in plan], (0, 0.075, 0))

# vertical fin: coral lower part + cream tip, both extruded across x
fin_low = [(0.066, 0.16, 0.78), (0.066, 0.22, 1.50), (0.066, 0.58, 1.42), (0.066, 0.56, 0.92)]
extrude(BODY, "coral", fin_low, (-0.132, 0, 0))
fin_top = [(0.066, 0.56, 0.92), (0.066, 0.58, 1.42), (0.066, 0.98, 1.22), (0.066, 0.74, 0.98)]
extrude(BODY, "cream", fin_top, (-0.132, 0, 0))

# ---------------------------------------------------------------- cargo crate
extrude(BODY, "kraft", [(-0.19, -0.28, 0.08), (0.19, -0.28, 0.08),
                        (0.19, -0.28, 0.50), (-0.19, -0.28, 0.50)], (0, -0.24, 0))
for zz in (0.16, 0.42):
    extrude(BODY, "cream", [(-0.195, -0.29, zz), (0.195, -0.29, zz),
                            (0.195, -0.29, zz + 0.035), (-0.195, -0.29, zz + 0.035)], (0, -0.22, 0))

# --------------------------------------------------------------- landing gear
for s in (1, -1):
    strut(BODY, "slate", (s * 0.26, -0.28, -0.10), (s * 0.56, -0.55, -0.10), 0.10)
    strut(BODY, "slate", (s * 0.26, -0.28, 0.24), (s * 0.56, -0.55, 0.02), 0.08)
    loft(BODY, [circle_x(s * 0.50, -0.60, -0.10, 0.19), circle_x(s * 0.64, -0.60, -0.10, 0.19)],
         lambda i: "tire")
    loft(BODY, [circle_x(s * 0.655, -0.60, -0.10, 0.085), circle_x(s * 0.675, -0.60, -0.10, 0.085)],
         lambda i: "cream")

# wing tip nav lights
for s in (1, -1):
    loft(BODY, [circle_x(s * 2.34, 0.29, -0.14, 0.08), circle_x(s * 2.45, 0.29, -0.14, 0.08)],
         lambda i: "gold")

# ------------------------------------------------------------------- propeller
for i in range(3):
    ang = 2 * math.pi * i / 3
    blade = [(-0.08, 0.04, 0.0), (0.08, 0.05, 0.0), (0.105, 0.44, 0.0),
             (0.035, 0.70, 0.0), (-0.065, 0.64, 0.0), (-0.10, 0.22, 0.0)]
    ca, sa = math.cos(ang), math.sin(ang)
    pts = [(x * ca - y * sa, x * sa + y * ca, 0.0) for (x, y, _z) in blade]
    extrude(PROP, "prop", pts, (0, 0, 0.055))
loft(PROP, [circle_x(0, 0, -0.03, 0.12), circle_x(0, 0, 0.06, 0.12)], lambda i: "prop")


# ---------------------------------------------------------------- GLB writing
def build_prims(bucket):
    prims = []
    for mat in ORDER:
        tris = bucket[mat]
        if not tris:
            continue
        pos, nrm = [], []
        for (a, b, c, n) in tris:
            for p in (a, b, c):
                pos.extend(p)
                nrm.extend(n)
        prims.append((mat, pos, nrm))
    return prims


def floats_to_bytes(arr):
    return struct.pack("<%df" % len(arr), *arr)


def main():
    body_prims = build_prims(BODY)
    prop_prims = build_prims(PROP)

    bin_parts = []
    buffer_views = []
    accessors = []
    offset = 0

    def add_float_view(data, ctype, count, typ, minv=None, maxv=None, target=34962):
        nonlocal offset
        blob = floats_to_bytes(data)
        buffer_views.append({"buffer": 0, "byteOffset": offset, "byteLength": len(blob), "target": target})
        acc = {"bufferView": len(buffer_views) - 1, "componentType": ctype, "count": count, "type": typ}
        if minv is not None:
            acc["min"] = minv
            acc["max"] = maxv
        accessors.append(acc)
        bin_parts.append(blob)
        offset += len(blob)
        pad = (4 - len(blob) % 4) % 4
        if pad:
            bin_parts.append(b"\x00" * pad)
            offset += pad

    materials = []
    for name in ORDER:
        m = MATERIALS[name]
        r, g, b = (to_linear(c) for c in hex_rgb(m["hex"]))
        mat = {
            "name": name,
            "pbrMetallicRoughness": {
                "baseColorFactor": [r, g, b, m["alpha"]],
                "metallicFactor": m["metal"],
                "roughnessFactor": m["rough"],
            },
        }
        if m["alpha"] < 1.0:
            mat["alphaMode"] = "BLEND"
        materials.append(mat)

    def prims_to_mesh(prims):
        out = []
        for (mat, pos, nrm) in prims:
            count = len(pos) // 3
            xs, ys, zs = pos[0::3], pos[1::3], pos[2::3]
            add_float_view(pos, 5126, count, "VEC3", [min(xs), min(ys), min(zs)], [max(xs), max(ys), max(zs)])
            add_float_view(nrm, 5126, count, "VEC3")
            out.append({"attributes": {"POSITION": len(accessors) - 2, "NORMAL": len(accessors) - 1},
                        "material": ORDER.index(mat), "mode": 4})
        return out

    body_mesh_prims = prims_to_mesh(body_prims)
    prop_mesh_prims = prims_to_mesh(prop_prims)
    bin_blob = b"".join(bin_parts)

    gltf = {
        "asset": {"version": "2.0", "generator": "floating-island-express/plane-gen"},
        "scene": 0,
        "scenes": [{"nodes": [2]}],
        "nodes": [
            {"name": "Body", "mesh": 0},
            {"name": "Propeller", "mesh": 1, "translation": [0, 0, -1.34]},
            {"name": "PlaneRoot", "children": [0, 1]},
        ],
        "meshes": [
            {"name": "PlaneBody", "primitives": body_mesh_prims},
            {"name": "PropellerMesh", "primitives": prop_mesh_prims},
        ],
        "materials": materials,
        "accessors": accessors,
        "bufferViews": buffer_views,
        "buffers": [{"byteLength": len(bin_blob)}],
    }

    json_blob = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    json_blob += b" " * ((4 - len(json_blob) % 4) % 4)
    bin_blob += b"\x00" * ((4 - len(bin_blob) % 4) % 4)

    total = 12 + 8 + len(json_blob) + 8 + len(bin_blob)
    out = bytearray()
    out += struct.pack("<III", 0x46546C67, 2, total)
    out += struct.pack("<II", len(json_blob), 0x4E4F534A) + json_blob
    out += struct.pack("<II", len(bin_blob), 0x004E4942) + bin_blob

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(root, "assets", "models", "plane.glb")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(out)
    print("wrote", path, len(out), "bytes;", sum(len(v) for v in BODY.values()), "body tris,",
          sum(len(v) for v in PROP.values()), "prop tris")


if __name__ == "__main__":
    main()
