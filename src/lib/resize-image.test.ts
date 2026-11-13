import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fitWithin,
  ImageUnreadable,
  MAX_IMAGE_BYTES,
  MAX_SOURCE_BYTES,
  resizeImage,
} from "./resize-image";

describe("fitWithin", () => {
  it("brings the longest side down to 1600 px, never up", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(1170, 2532)).toEqual({ width: 739, height: 1600 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(10000, 1)).toEqual({ width: 1600, height: 1 });
  });
});

describe("resizeImage", () => {
  const drawn: number[][] = [];
  const close = vi.fn();
  function stubBrowser(sizes: number[]) {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockResolvedValue({ width: 4032, height: 3024, close }),
    );
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      fillRect: vi.fn(),
      drawImage: (_i: unknown, ...a: number[]) => drawn.push(a),
    } as unknown as CanvasRenderingContext2D);
    const toBlob = vi.spyOn(HTMLCanvasElement.prototype, "toBlob");
    for (const size of sizes) {
      toBlob.mockImplementationOnce((cb, type) => cb(new Blob([new Uint8Array(size)], { type })));
    }
    return toBlob;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    drawn.length = 0;
    close.mockReset();
  });

  it("draws the photo at 1600 px and sends a JPEG", async () => {
    const toBlob = stubBrowser([300_000]);
    const out = await resizeImage(new File(["x"], "a.heic", { type: "image/heic" }));
    expect(out.type).toBe("image/jpeg");
    expect(drawn[0]).toEqual([0, 0, 1600, 1200]);
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), "image/jpeg", 0.85);
    expect(close).toHaveBeenCalled();
  });

  it("lowers the quality until it fits the API's 5 MB", async () => {
    const toBlob = stubBrowser([MAX_IMAGE_BYTES + 1, 2_000_000]);
    const out = await resizeImage(new File(["x"], "a.png", { type: "image/png" }));
    expect(out.size).toBe(2_000_000);
    expect(toBlob).toHaveBeenLastCalledWith(expect.any(Function), "image/jpeg", 0.7);
  });

  it("refuses what is not an image, is too big, or cannot be decoded", async () => {
    await expect(resizeImage(new File(["x"], "a.pdf", { type: "application/pdf" }))).rejects.toBeInstanceOf(
      ImageUnreadable,
    );
    const huge = { type: "image/jpeg", size: MAX_SOURCE_BYTES + 1 } as Blob;
    await expect(resizeImage(huge)).rejects.toBeInstanceOf(ImageUnreadable);
    vi.stubGlobal("createImageBitmap", vi.fn().mockRejectedValue(new DOMException("bad", "InvalidStateError")));
    await expect(resizeImage(new File(["x"], "a.jpg", { type: "image/jpeg" }))).rejects.toBeInstanceOf(
      ImageUnreadable,
    );
  });
});
