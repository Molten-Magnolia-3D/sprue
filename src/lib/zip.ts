import JSZip from "jszip";
import { encodeBinaryStl } from "./stl";
import type { MoldResult } from "./types";

export function mouldFileName(name: string): string {
  return `sprue-${slug(name)}-mould.zip`;
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function mouldZip(result: MoldResult): Promise<Blob> {
  const zip = new JSZip();
  const base = slug(result.name);
  zip.file(
    `${base}-lower.stl`,
    encodeBinaryStl(
      result.lower,
      `Sprue ${result.name} lower half, millimetres`,
    ),
  );
  zip.file(
    `${base}-upper.stl`,
    encodeBinaryStl(
      result.upper,
      `Sprue ${result.name} upper half, millimetres`,
    ),
  );
  zip.file(
    "README.txt",
    [
      `Sprue mould: ${result.name}`,
      "Units: millimetres",
      "Halves: lower (alignment keys) and upper (key sockets, spout, fill hole).",
      result.usedRunner
        ? "A runner was added because the spout would have missed the cavity."
        : "The spout meets the cavity directly.",
      "",
    ].join("\n"),
  );
  return zip.generateAsync({ type: "blob" });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function shareOrDownload(
  blob: Blob,
  filename: string,
): Promise<"shared" | "downloaded"> {
  const file = new File([blob], filename, { type: "application/zip" });
  const payload = {
    files: [file],
    title: "Sprue mould",
    text: "Two-part mould, millimetres",
  };
  if (typeof navigator !== "undefined" && navigator.canShare?.(payload)) {
    await navigator.share(payload);
    return "shared";
  }
  downloadBlob(blob, filename);
  return "downloaded";
}
