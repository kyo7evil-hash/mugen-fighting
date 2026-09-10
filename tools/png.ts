import { deflateSync } from 'node:zlib';

/** Minimal zlib-backed PNG encoder (8-bit RGBA, no dependencies). */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  out[4] = type.charCodeAt(0);
  out[5] = type.charCodeAt(1);
  out[6] = type.charCodeAt(2);
  out[7] = type.charCodeAt(3);
  out.set(data, 8);
  const crc = crc32(out.subarray(4, 8 + data.length));
  dv.setUint32(8 + data.length, crc);
  return out;
}

export function encodePNG(width: number, height: number, rgba: Uint8Array): Buffer {
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width);
  dv.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // filtered scanlines (filter 0)
  const stride = width * 4;
  const raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    raw.set(rgba.subarray(y * stride, y * stride + stride), y * (stride + 1) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });

  const parts = [
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', new Uint8Array(idat.buffer, idat.byteOffset, idat.byteLength)),
    chunk('IEND', new Uint8Array(0)),
  ];
  return Buffer.concat(parts.map((p) => Buffer.from(p)));
}

/** Simple RGBA canvas with pixel-art primitives. Origin top-left. */
export class Pix {
  w: number;
  h: number;
  data: Uint8Array;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.data = new Uint8Array(w * h * 4);
  }

  set(x: number, y: number, r: number, g: number, b: number, a = 255): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    if (a >= 255) {
      this.data[i] = r;
      this.data[i + 1] = g;
      this.data[i + 2] = b;
      this.data[i + 3] = 255;
      return;
    }
    if (a <= 0) return;
    const ia = 255 - a;
    this.data[i] = (r * a + this.data[i] * ia) / 255;
    this.data[i + 1] = (g * a + this.data[i + 1] * ia) / 255;
    this.data[i + 2] = (b * a + this.data[i + 2] * ia) / 255;
    this.data[i + 3] = Math.max(this.data[i + 3], a);
  }

  hex(x: number, y: number, color: string, a = 255): void {
    const c = parseHex(color);
    this.set(x, y, c[0], c[1], c[2], a);
  }

  rect(x: number, y: number, w: number, h: number, color: string, a = 255): void {
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) this.hex(x + xx, y + yy, color, a);
  }

  /** filled circle-ish (for heads / energy). */
  disc(cx: number, cy: number, r: number, color: string, a = 255): void {
    for (let yy = -r; yy <= r; yy++)
      for (let xx = -r; xx <= r; xx++)
        if (xx * xx + yy * yy <= r * r) this.hex(cx + xx, cy + yy, color, a);
  }

  line(x0: number, y0: number, x1: number, y1: number, color: string, thick = 1): void {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    for (;;) {
      for (let ox = 0; ox < thick; ox++)
        for (let oy = 0; oy < thick; oy++) this.hex(x0 + ox, y0 + oy, color);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  /** thick capsule limb from (x0,y0) to (x1,y1). */
  limb(x0: number, y0: number, x1: number, y1: number, w: number, color: string): void {
    const steps = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      this.disc(x, y, w, color);
    }
  }

  blit(src: Pix, dx: number, dy: number): void {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const i = (y * src.w + x) * 4;
        if (src.data[i + 3] === 0) continue;
        this.set(dx + x, dy + y, src.data[i], src.data[i + 1], src.data[i + 2], src.data[i + 3]);
      }
  }
}

export function parseHex(h: string): [number, number, number] {
  const s = h.replace('#', '');
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

export function shade(hexColor: string, amt: number): string {
  const [r, g, b] = parseHex(hexColor);
  const f = (v: number): string =>
    Math.max(0, Math.min(255, Math.round(v + amt)))
      .toString(16)
      .padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
}
