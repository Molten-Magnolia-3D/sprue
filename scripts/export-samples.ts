import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { getManifold } from "../src/lib/manifold";
import { makeMouldFromSample } from "../src/lib/mold";
import { mouldFileName, mouldZipBytes } from "../src/lib/zip";
import type { SampleId } from "../src/lib/types";

const samples: SampleId[] = ["pawn", "gem", "bead", "ring"];

async function main(): Promise<void> {
  const outDir = path.resolve("public/releases");
  await mkdir(outDir, { recursive: true });
  const wasm = await getManifold();
  const bundle = new JSZip();

  for (const id of samples) {
    const mould = await makeMouldFromSample(wasm, id);
    const bytes = await mouldZipBytes(mould);
    const name = mouldFileName(id);
    await writeFile(path.join(outDir, name), bytes);
    bundle.file(name, bytes);
    console.log(`wrote ${name} (${bytes.byteLength} bytes)`);
  }

  const all = await bundle.generateAsync({ type: "uint8array" });
  await writeFile(path.join(outDir, "sprue-sample-moulds.zip"), all);
  console.log(`wrote sprue-sample-moulds.zip (${all.byteLength} bytes)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
