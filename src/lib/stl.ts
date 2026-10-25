import { triangleNormal } from "./mesh";
import type { MeshData, Vec3 } from "./types";

function writeAscii(view: DataView, offset: number, text: string): number {
  for (let i = 0; i < text.length; i += 1) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
  return offset + text.length;
}

export function encodeBinaryStl(mesh: MeshData, header: string): Uint8Array {
  const triCount = mesh.indices.length / 3;
  const bytes = new Uint8Array(84 + triCount * 50);
  const view = new DataView(bytes.buffer);
  const label = header.slice(0, 80).padEnd(80, " ");
  writeAscii(view, 0, label);
  view.setUint32(80, triCount, true);

  let offset = 84;
  const p = mesh.positions;
  const idx = mesh.indices;
  for (let t = 0; t < triCount; t += 1) {
    const ia = idx[t * 3] * 3;
    const ib = idx[t * 3 + 1] * 3;
    const ic = idx[t * 3 + 2] * 3;
    const a: Vec3 = [p[ia], p[ia + 1], p[ia + 2]];
    const b: Vec3 = [p[ib], p[ib + 1], p[ib + 2]];
    const c: Vec3 = [p[ic], p[ic + 1], p[ic + 2]];
    const n = triangleNormal(a, b, c);
    const verts = [...n, ...a, ...b, ...c];
    for (const value of verts) {
      view.setFloat32(offset, value, true);
      offset += 4;
    }
    view.setUint16(offset, 0, true);
    offset += 2;
  }
  return bytes;
}

export function parseStl(buffer: ArrayBuffer): MeshData {
  const bytes = new Uint8Array(buffer);
  const head = new TextDecoder().decode(bytes.slice(0, 80)).toLowerCase();
  if (head.includes("solid") && !looksBinary(bytes)) {
    return parseAsciiStl(new TextDecoder().decode(bytes));
  }
  return parseBinaryStl(bytes);
}

function looksBinary(bytes: Uint8Array): boolean {
  if (bytes.length < 84) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tris = view.getUint32(80, true);
  return 84 + tris * 50 === bytes.length;
}

function parseBinaryStl(bytes: Uint8Array): MeshData {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tris = view.getUint32(80, true);
  const positions = new Float32Array(tris * 9);
  const indices = new Uint32Array(tris * 3);
  let offset = 84;
  let cursor = 0;
  for (let t = 0; t < tris; t += 1) {
    offset += 12;
    for (let k = 0; k < 9; k += 1) {
      positions[cursor + k] = view.getFloat32(offset, true);
      offset += 4;
    }
    indices[t * 3] = t * 3;
    indices[t * 3 + 1] = t * 3 + 1;
    indices[t * 3 + 2] = t * 3 + 2;
    cursor += 9;
    offset += 2;
  }
  return { positions, indices };
}

function parseAsciiStl(text: string): MeshData {
  const verts: number[] = [];
  const indices: number[] = [];
  const vertex = /vertex\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = vertex.exec(text))) {
    verts.push(Number(match[1]), Number(match[2]), Number(match[3]));
  }
  for (let i = 0; i < verts.length / 3; i += 1) {
    indices.push(i);
  }
  return {
    positions: Float32Array.from(verts),
    indices: Uint32Array.from(indices),
  };
}

export function meshFromObj(text: string): MeshData {
  const positions: number[] = [];
  const verts: Vec3[] = [];
  const indices: number[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("v ")) {
      const [, x, y, z] = line.split(/\s+/);
      verts.push([Number(x), Number(y), Number(z)]);
    } else if (line.startsWith("f ")) {
      const parts = line.slice(2).trim().split(/\s+/);
      const ids = parts.map((part) => Number(part.split("/")[0]) - 1);
      for (let i = 1; i < ids.length - 1; i += 1) {
        const tri = [ids[0], ids[i], ids[i + 1]];
        for (const id of tri) {
          const v = verts[id];
          if (!v) continue;
          indices.push(positions.length / 3);
          positions.push(v[0], v[1], v[2]);
        }
      }
    }
  }
  return {
    positions: Float32Array.from(positions),
    indices: Uint32Array.from(indices),
  };
}
