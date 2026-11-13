/**
 * Receipt photos (plan 3.3, §8.3): the longest side goes down to 1600 px and
 * the image is sent as JPEG, so a 12 MP phone photo of a few MB arrives at
 * a few hundred KB, under the API's 5 MB. Screenshots and photos the
 * browser cannot decode fail with `ImageUnreadable`.
 */

export const MAX_IMAGE_SIDE = 1600;
/** The API's cap (plan §8.3). */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** Larger files are refused before decoding them. */
export const MAX_SOURCE_BYTES = 40 * 1024 * 1024;

export class ImageUnreadable extends Error {
  constructor() {
    super("image unreadable");
    this.name = "ImageUnreadable";
  }
}

/** Width and height that fit `max` on the longest side, never upscaled. */
export function fitWithin(
  width: number,
  height: number,
  max = MAX_IMAGE_SIDE,
): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

type Source = { image: CanvasImageSource; width: number; height: number; close: () => void };

async function decode(file: Blob): Promise<Source> {
  if (typeof createImageBitmap === "function") {
    // Applies the photo's EXIF rotation, as browsers show it.
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { image: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { image: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

export async function resizeImage(file: Blob): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.size > MAX_SOURCE_BYTES) {
    throw new ImageUnreadable();
  }
  let src: Source;
  try {
    src = await decode(file);
  } catch {
    throw new ImageUnreadable();
  }
  try {
    const { width, height } = fitWithin(src.width, src.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new ImageUnreadable();
    // Transparent screenshots get a white background instead of black.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(src.image, 0, 0, width, height);
    for (const quality of [0.85, 0.7, 0.5]) {
      const blob = await toJpeg(canvas, quality);
      if (!blob) break;
      if (blob.size <= MAX_IMAGE_BYTES) return blob;
    }
    throw new ImageUnreadable();
  } finally {
    src.close();
  }
}
