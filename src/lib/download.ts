"use client";

/** Hands a file to the browser as a download. */
export function saveFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Some browsers read the URL after click() returns.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
