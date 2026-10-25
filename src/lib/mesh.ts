import type { MeshData, SolidManifold, Vec3 } from "./types";

export function meshFromManifold(solid: SolidManifold): MeshData {
  const mesh = solid.getMesh();
  const stride = mesh.numProp;
  const positions = new Float32Array(mesh.numVert * 3);
  const src = mesh.vertProperties;
  if (stride === 3) {
    positions.set(src);
  } else {
    for (let i = 0; i < mesh.numVert; i += 1) {
      positions[i * 3] = src[i * stride];
      positions[i * 3 + 1] = src[i * stride + 1];
      positions[i * 3 + 2] = src[i * stride + 2];
    }
  }
  return {
    positions,
    indices: new Uint32Array(mesh.triVerts),
  };
}

export function boxCenter(min: Vec3, max: Vec3): Vec3 {
  return [
    (min[0] + max[0]) / 2,
    (min[1] + max[1]) / 2,
    (min[2] + max[2]) / 2,
  ];
}

export function boxSize(min: Vec3, max: Vec3): Vec3 {
  return [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
}

export function verticesOf(mesh: MeshData): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i < mesh.positions.length; i += 3) {
    out.push([
      mesh.positions[i],
      mesh.positions[i + 1],
      mesh.positions[i + 2],
    ]);
  }
  return out;
}

export function closestVertexToAxis(
  mesh: MeshData,
  cx: number,
  cy: number,
): Vec3 {
  let best: Vec3 = [0, 0, 0];
  let bestD = Infinity;
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const x = mesh.positions[i];
    const y = mesh.positions[i + 1];
    const z = mesh.positions[i + 2];
    const d = Math.hypot(x - cx, y - cy);
    if (d > 0.05 && d < bestD) {
      bestD = d;
      best = [x, y, z];
    }
  }
  return best;
}

export function highestVertex(mesh: MeshData): Vec3 {
  let best: Vec3 = [0, 0, 0];
  let bestZ = -Infinity;
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const z = mesh.positions[i + 2];
    if (z > bestZ) {
      bestZ = z;
      best = [mesh.positions[i], mesh.positions[i + 1], z];
    }
  }
  return best;
}

export function triangleNormal(a: Vec3, b: Vec3, c: Vec3): Vec3 {
  const ux = b[0] - a[0];
  const uy = b[1] - a[1];
  const uz = b[2] - a[2];
  const vx = c[0] - a[0];
  const vy = c[1] - a[1];
  const vz = c[2] - a[2];
  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;
  const len = Math.hypot(nx, ny, nz) || 1;
  return [nx / len, ny / len, nz / len];
}
