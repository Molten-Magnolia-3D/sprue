import { getManifold } from "../src/lib/manifold";
import { containsPoint } from "../src/lib/mold";
import { makeMouldFromSample } from "../src/lib/mold";
import { encodeBinaryStl } from "../src/lib/stl";
import type { SampleId, Vec3 } from "../src/lib/types";

type Check = { name: string; ok: boolean; detail?: string };

const samples: SampleId[] = ["pawn", "gem", "bead", "ring"];

function assert(name: string, ok: boolean, detail?: string): Check {
  return { name, ok, detail };
}

async function main(): Promise<void> {
  const wasm = await getManifold();
  const checks: Check[] = [];

  for (const id of samples) {
    const mould = await makeMouldFromSample(wasm, id);
    const prefix = id;

    checks.push(
      assert(
        `${prefix}: units are millimetres`,
        mould.units === "mm",
      ),
      assert(
        `${prefix}: model volume`,
        mould.modelVolume > 1,
        `${mould.modelVolume.toFixed(2)} mm³`,
      ),
      assert(
        `${prefix}: lower half volume`,
        mould.lowerVolume > 10,
        `${mould.lowerVolume.toFixed(1)} mm³`,
      ),
      assert(
        `${prefix}: upper half volume`,
        mould.upperVolume > 10,
        `${mould.upperVolume.toFixed(1)} mm³`,
      ),
      assert(
        `${prefix}: lower triangles`,
        mould.lower.indices.length >= 12,
      ),
      assert(
        `${prefix}: upper triangles`,
        mould.upper.indices.length >= 12,
      ),
      assert(
        `${prefix}: alignment keys`,
        mould.keyPositions.length >= 2,
        `${mould.keyPositions.length} keys`,
      ),
    );

    const cavity = interiorPoint(id);
    const inLower = containsPoint(wasm, mould.lower, cavity);
    const inUpper = containsPoint(wasm, mould.upper, cavity);
    checks.push(
      assert(
        `${prefix}: cavity is empty`,
        !inLower && !inUpper,
        `lower=${inLower} upper=${inUpper}`,
      ),
    );

    const [sx, sy] = mould.spoutAxis;
    const top = bounds(mould.upper.positions).max[2];
    const spoutProbe: Vec3 = [sx, sy, top - 1.2];
    const spoutBlocked =
      containsPoint(wasm, mould.lower, spoutProbe) ||
      containsPoint(wasm, mould.upper, spoutProbe);
    checks.push(
      assert(
        `${prefix}: fill hole / spout is open`,
        !spoutBlocked,
      ),
    );

    if (mould.keyPositions[0]) {
      const [kx, ky] = mould.keyPositions[0];
      const pin: Vec3 = [kx, ky, mould.partingZ + mould.keyPositions.length * 0 + 1.6];
      const pinInLower = containsPoint(wasm, mould.lower, pin);
      const pinInUpper = containsPoint(wasm, mould.upper, pin);
      checks.push(
        assert(
          `${prefix}: alignment key pin on lower half`,
          pinInLower,
        ),
        assert(
          `${prefix}: alignment key socket on upper half`,
          !pinInUpper,
        ),
      );
    }

    const lowerStl = encodeBinaryStl(mould.lower, "test lower, millimetres");
    const upperStl = encodeBinaryStl(mould.upper, "test upper, millimetres");
    checks.push(
      assert(`${prefix}: lower STL bytes`, lowerStl.byteLength > 84),
      assert(`${prefix}: upper STL bytes`, upperStl.byteLength > 84),
    );

    if (id === "ring") {
      checks.push(
        assert(
          "ring: runner added because the spout misses the cavity",
          mould.usedRunner,
        ),
      );
    } else {
      checks.push(
        assert(
          `${prefix}: spout meets the cavity (no runner)`,
          !mould.usedRunner,
        ),
      );
    }
  }

  const failed = checks.filter((c) => !c.ok);
  for (const check of checks) {
    const mark = check.ok ? "ok" : "FAIL";
    const extra = check.detail ? ` (${check.detail})` : "";
    console.log(`${mark}  ${check.name}${extra}`);
  }

  if (failed.length) {
    console.error(`\n${failed.length} geometry check(s) failed.`);
    process.exit(1);
  }

  console.log(`\n${checks.length} geometry checks passed.`);
}

function interiorPoint(id: SampleId): Vec3 {
  switch (id) {
    case "pawn":
      return [0, 0, 12];
    case "gem":
      return [0, 0, 2];
    case "bead":
      return [5.5, 0, 1.2];
    case "ring":
      return [9.6, 0, 0.6];
  }
}

function bounds(positions: Float32Array): { min: Vec3; max: Vec3 } {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    min[0] = Math.min(min[0], positions[i]);
    min[1] = Math.min(min[1], positions[i + 1]);
    min[2] = Math.min(min[2], positions[i + 2]);
    max[0] = Math.max(max[0], positions[i]);
    max[1] = Math.max(max[1], positions[i + 1]);
    max[2] = Math.max(max[2], positions[i + 2]);
  }
  return { min, max };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
