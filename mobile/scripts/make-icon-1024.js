// One-off rasterizer for the iOS app icon source: renders the same clock
// shapes as ../../assets/icon.svg (scaled 2x, 512->1024) but fully opaque
// with no corner rounding, since iOS applies its own icon mask and expects
// a flat square source. Pure Node (zlib for PNG encoding) — no image libs
// installed on this machine.
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const BG = [0x0d, 0x0f, 0x14];
const FG = [0x2f, 0x8f, 0xff];
const SIZE = 1024;
const SCALE = 2; // 512 viewBox -> 1024 output

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx, cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function inRoundedRect(x, y, rx0, ry0, w, h, r) {
  const x0 = rx0, y0 = ry0, x1 = rx0 + w, y1 = ry0 + h;
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  if (x >= x0 + r && x <= x1 - r) return true;
  if (y >= y0 + r && y <= y1 - r) return true;
  return Math.hypot(x - cx, y - cy) <= r;
}

// All coordinates below are in the original 512-space, scaled by SCALE at
// the point of use — mirrors assets/icon.svg exactly, minus the background
// rx rounding (iOS masks the icon itself; a pre-rounded opaque square
// would just look like a smaller square inside iOS's own mask).
function sampleIcon(x, y) {
  const s = SCALE;
  if (
    distToSegment(x, y, 256 * s, 176 * s, 256 * s, 272 * s) <= 12 * s ||
    distToSegment(x, y, 256 * s, 272 * s, 328 * s, 320 * s) <= 12 * s
  ) return FG;

  {
    const cx = 356 * s, cy = 156 * s;
    const rad = (35 * Math.PI) / 180;
    const dx = x - cx, dy = y - cy;
    const lx = dx * Math.cos(rad) + dy * Math.sin(rad) + cx;
    const ly = -dx * Math.sin(rad) + dy * Math.cos(rad) + cy;
    if (inRoundedRect(lx, ly, 336 * s, 120 * s, 40 * s, 72 * s, 12 * s)) return FG;
  }

  if (inRoundedRect(x, y, 232 * s, 96 * s, 48 * s, 40 * s, 12 * s)) return FG;

  {
    const d = Math.hypot(x - 256 * s, y - 272 * s);
    if (Math.abs(d - 160 * s) <= 12 * s) return FG;
  }

  return BG; // full-bleed opaque square, no rounding
}

function render(size) {
  const SS = 4;
  const buf = Buffer.alloc(size * size * 3); // opaque RGB, no alpha
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = px + (sx + 0.5) / SS;
          const y = py + (sy + 0.5) / SS;
          const c = sampleIcon(x, y);
          r += c[0]; g += c[1]; b += c[2];
        }
      }
      const n = SS * SS;
      const off = (py * size + px) * 3;
      buf[off] = Math.round(r / n);
      buf[off + 1] = Math.round(g / n);
      buf[off + 2] = Math.round(b / n);
    }
  }
  return buf;
}

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(rgb, size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB (no alpha)
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    rgb.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  }
  const idat = zlib.deflateSync(raw);

  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

const rgb = render(SIZE);
const png = encodePNG(rgb, SIZE);
const outDir = path.join(__dirname, "..", "assets");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "icon.png"); // filename @capacitor/assets expects
fs.writeFileSync(outPath, png);
console.log("wrote", outPath, png.length, "bytes");
