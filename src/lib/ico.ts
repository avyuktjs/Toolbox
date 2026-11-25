import { blobFromCanvas } from "./download";

/** Hand-rolled 24-bit BMP — canvas can't encode one itself. */
export async function encodeBmp(canvas: HTMLCanvasElement): Promise<Blob> {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  const { width: w, height: h } = canvas;
  const data = ctx.getImageData(0, 0, w, h).data;
  const stride = (w * 3 + 3) & ~3;
  const pixelBytes = stride * h;
  const fileSize = 54 + pixelBytes;
  const buf = new ArrayBuffer(fileSize);
  const view = new DataView(buf);
  const u8 = new Uint8Array(buf);

  u8[0] = 0x42; u8[1] = 0x4d; // "BM"
  view.setUint32(2, fileSize, true);
  view.setUint32(10, 54, true);
  view.setUint32(14, 40, true); // BITMAPINFOHEADER
  view.setInt32(18, w, true);
  view.setInt32(22, h, true); // positive = bottom-up rows
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true); // 24 bpp
  view.setUint32(30, 0, true); // BI_RGB
  view.setUint32(34, pixelBytes, true);
  view.setInt32(38, 2835, true); // ~72 dpi
  view.setInt32(42, 2835, true);
  view.setUint32(46, 0, true);
  view.setUint32(50, 0, true);

  let offset = 54;
  for (let y = h - 1; y >= 0; y -= 1) {
    const row = y * w;
    for (let x = 0; x < w; x += 1) {
      const i = (row + x) * 4;
      u8[offset] = data[i + 2]; // B
      u8[offset + 1] = data[i + 1]; // G
      u8[offset + 2] = data[i]; // R
      offset += 3;
    }
    offset += stride - w * 3;
  }
  return new Blob([buf], { type: "image/bmp" });
}

/**
 * Hand-rolled ICO wrapping PNG frames — canvas can't encode ICO.
 * The source is center-cropped to a square per frame.
 */
export async function encodeIco(source: HTMLCanvasElement, sizes: number[] = [16, 32, 48, 256]): Promise<Blob> {
  const frames: Uint8Array[] = [];
  for (const size of sizes) {
    const frame = document.createElement("canvas");
    frame.width = size;
    frame.height = size;
    const ctx = frame.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    // center-crop the source to a square, then scale to each frame size
    const side = Math.min(source.width, source.height);
    const sx = (source.width - side) / 2;
    const sy = (source.height - side) / 2;
    ctx.drawImage(source, sx, sy, side, side, 0, 0, size, size);
    const png = await blobFromCanvas(frame, "image/png");
    if (!png) throw new Error("couldn't encode an ICO frame");
    frames.push(new Uint8Array(await png.arrayBuffer()));
  }

  const count = frames.length;
  const headerSize = 6 + 16 * count;
  const total = headerSize + frames.reduce((sum, f) => sum + f.length, 0);
  const buf = new ArrayBuffer(total);
  const view = new DataView(buf);
  const u8 = new Uint8Array(buf);

  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // type: icon
  view.setUint16(4, count, true);

  let offset = headerSize;
  frames.forEach((png, i) => {
    const size = sizes[i];
    const entry = 6 + 16 * i;
    u8[entry] = size === 256 ? 0 : size; // 0 means 256
    u8[entry + 1] = size === 256 ? 0 : size;
    u8[entry + 2] = 0; // no palette
    u8[entry + 3] = 0; // reserved
    view.setUint16(entry + 4, 1, true); // color planes
    view.setUint16(entry + 6, 32, true); // bits per pixel
    view.setUint32(entry + 8, png.length, true);
    view.setUint32(entry + 12, offset, true);
    u8.set(png, offset);
    offset += png.length;
  });
  return new Blob([buf], { type: "image/x-icon" });
}
