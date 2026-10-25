import { getManifoldModule, setWasmUrl } from "manifold-3d/lib/wasm.js";
import type { ManifoldToplevel } from "manifold-3d";

let configured = false;

function configureWasm(): void {
  if (configured) return;
  configured = true;
  if (typeof window !== "undefined") {
    setWasmUrl("/manifold.wasm");
  }
}

export async function getManifold(): Promise<ManifoldToplevel> {
  configureWasm();
  return getManifoldModule();
}
