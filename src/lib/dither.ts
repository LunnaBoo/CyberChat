type DitherAlgorithm = "bayer" | "floyd-steinberg" | "atkinson";

export type DitherOptions = {
  size?: number;
  algorithm?: DitherAlgorithm;
  bitDepth?: number;
  contrast?: number;
  ditherAmount?: number;
  pixelSize?: number;
  gamma?: number;
  fg?: string;
  bg?: string;
};

const DEFAULT_OPTIONS: Required<DitherOptions> = {
  size: 28,
  algorithm: "bayer",
  bitDepth: 2,
  contrast: 1,
  ditherAmount: 0.75,
  pixelSize: 4,
  gamma: 0.625,
  fg: "var(--color-foreground)",
  bg: "var(--color-background)",
};

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function resolveVarRGB(name: string): [number, number, number] | null {
  const probe = document.createElement("span");
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  try {
    const resolved = getComputedStyle(probe).color;
    const c = document.createElement("canvas");
    c.width = 1;
    c.height = 1;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = resolved;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  } catch {
    return null;
  } finally {
    probe.remove();
  }
}

function toGray(data: Uint8ClampedArray, contrast: number): Float32Array {
  const gray = new Float32Array(data.length / 4);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const g =
      (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
    gray[j] = clamp01((g - 0.5) * contrast + 0.5);
  }
  return gray;
}

// Stretch luminance to the full [0,1] range so dark avatars don't render as a
// nearly-blank background-colored square (cyberspace.online-style phosphor
// needs the subject to punch through).
function normalizeGray(gray: Float32Array) {
  let min = 1;
  let max = 0;
  for (let i = 0; i < gray.length; i++) {
    if (gray[i] < min) min = gray[i];
    if (gray[i] > max) max = gray[i];
  }
  if (max - min < 1e-4) return;
  const span = max - min;
  for (let i = 0; i < gray.length; i++) {
    gray[i] = (gray[i] - min) / span;
  }
}

const BAYER_8X8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36,
  14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41,
  51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23,
  61, 29, 53, 21,
];

function fractSin(x: number, y: number): number {
  const dot = x * 0.129898 + y * 0.78233;
  const v = Math.sin(dot) * 43758.5453123;
  return v - Math.floor(v);
}

function bayerPass(
  gray: Float32Array,
  w: number,
  h: number,
  opts: Required<DitherOptions>,
) {
  const levels = Math.pow(2, opts.bitDepth);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const bayerValue = BAYER_8X8[(y % 8) * 8 + (x % 8)] / 64;
      const noise = fractSin(x, y) * 0.1;
      const bayer = bayerValue * 0.7 + noise * 0.3;
      const threshold = 0.5 + (bayer - 0.5) * opts.ditherAmount;
      const v = clamp01(gray[idx]);
      gray[idx] = clamp01(Math.floor(v * levels + (1 - threshold)) / levels);
    }
  }
}

function ditherPass(
  gray: Float32Array,
  w: number,
  h: number,
  opts: Required<DitherOptions>,
) {
  const levels = Math.pow(2, opts.bitDepth) - 1;
  const amt = opts.ditherAmount;

  if (opts.algorithm === "atkinson") {
    const diffuse = (x: number, y: number, err: number) => {
      const e = (err * amt) / 8;
      for (const [dx, dy] of [
        [1, 0],
        [2, 0],
        [-1, 1],
        [0, 1],
        [1, 1],
        [0, 2],
      ]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          gray[ny * w + nx] += e;
        }
      }
    };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const old = gray[idx];
        const nw = Math.round(old * levels) / levels;
        gray[idx] = nw;
        diffuse(x, y, old - nw);
      }
    }
    return;
  }

  const softBlend = () => {
    const blurred = new Float32Array(gray.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        let s = gray[idx] * 4;
        let c = 4;
        if (x > 0) {
          s += gray[idx - 1];
          c++;
        }
        if (x < w - 1) {
          s += gray[idx + 1];
          c++;
        }
        if (y > 0) {
          s += gray[idx - w];
          c++;
        }
        if (y < h - 1) {
          s += gray[idx + w];
          c++;
        }
        blurred[idx] = s / c;
      }
    }
    for (let i = 0; i < gray.length; i++) {
      gray[i] = gray[i] * 0.8 + blurred[i] * 0.2;
    }
  };

  softBlend();
  for (let y = 0; y < h; y++) {
    const dir = y % 2 === 0 ? 1 : -1;
    for (
      let x = y % 2 === 0 ? 0 : w - 1;
      x !== (y % 2 === 0 ? w : -1);
      x += dir
    ) {
      const idx = y * w + x;
      const old = gray[idx];
      const nw = Math.round(old * levels) / levels;
      gray[idx] = nw;
      const err = (old - nw) * amt;
      if (x + dir >= 0 && x + dir < w) gray[idx + dir] += err * (7 / 16);
      if (y + 1 < h) {
        if (x - dir >= 0 && x - dir < w) gray[idx + w - dir] += err * (3 / 16);
        gray[idx + w] += err * (5 / 16);
        if (x + dir >= 0 && x + dir < w) gray[idx + w + dir] += err * (1 / 16);
      }
    }
  }
}

export function ditherImage(
  img: HTMLImageElement,
  options: DitherOptions = {},
): HTMLCanvasElement {
  const opts: Required<DitherOptions> = { ...DEFAULT_OPTIONS, ...options };
  const size = opts.size;

  const src = document.createElement("canvas");
  src.width = size;
  src.height = size;
  const sctx = src.getContext("2d", { willReadFrequently: true });
  if (!sctx) throw new Error("2d context unavailable");

  const sw = img.naturalWidth || size;
  const sh = img.naturalHeight || size;
  const edge = Math.min(sw, sh);
  const sx = (sw - edge) / 2;
  const sy = (sh - edge) / 2;

  if (opts.algorithm === "bayer") {
    const block = Math.max(1, Math.round(opts.pixelSize));
    const grid = Math.max(1, Math.round(size / block));
    const sample = document.createElement("canvas");
    sample.width = grid;
    sample.height = grid;
    const sctx2 = sample.getContext("2d");
    if (!sctx2) throw new Error("2d context unavailable");
    sctx2.drawImage(img, sx, sy, edge, edge, 0, 0, grid, grid);
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(sample, 0, 0, size, size);
  } else {
    sctx.drawImage(img, sx, sy, edge, edge, 0, 0, size, size);
  }

  const imageData = sctx.getImageData(0, 0, size, size);
  const gray = toGray(imageData.data, opts.contrast);
  normalizeGray(gray);
  if (opts.gamma !== 1) {
    for (let i = 0; i < gray.length; i++) {
      gray[i] = Math.pow(gray[i], opts.gamma);
    }
  }

  if (opts.algorithm === "bayer") {
    bayerPass(gray, size, size, opts);
  } else {
    ditherPass(gray, size, size, opts);
  }

  const fg = resolveVarRGB(opts.fg) ?? [150, 255, 170];
  const bg = resolveVarRGB(opts.bg) ?? [8, 12, 10];
  const out = sctx.createImageData(size, size);
  for (let i = 0; i < gray.length; i++) {
    const t = clamp01(gray[i]);
    const j = i * 4;
    out.data[j] = Math.round(bg[0] + (fg[0] - bg[0]) * t);
    out.data[j + 1] = Math.round(bg[1] + (fg[1] - bg[1]) * t);
    out.data[j + 2] = Math.round(bg[2] + (fg[2] - bg[2]) * t);
    out.data[j + 3] = 255;
  }
  sctx.putImageData(out, 0, 0);

  return src;
}
