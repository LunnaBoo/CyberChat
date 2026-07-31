type DitherAlgorithm = "floyd-steinberg" | "atkinson";

export type DitherOptions = {
  size?: number;
  algorithm?: DitherAlgorithm;
  bitDepth?: number;
  contrast?: number;
  ditherAmount?: number;
  fg?: string;
  bg?: string;
};

const DEFAULT_OPTIONS: Required<DitherOptions> = {
  size: 28,
  algorithm: "floyd-steinberg",
  bitDepth: 3,
  contrast: 1.5,
  ditherAmount: 0.85,
  fg: "var(--color-foreground)",
  bg: "var(--color-background)",
};

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function cssVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
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
  sctx.drawImage(img, sx, sy, edge, edge, 0, 0, size, size);

  const imageData = sctx.getImageData(0, 0, size, size);
  const gray = toGray(imageData.data, opts.contrast);
  ditherPass(gray, size, size, opts);

  const supportsColorMix =
    typeof CSS.supports === "function" &&
    CSS.supports("color", "color-mix(in oklab, red 50%, blue)");

  if (!supportsColorMix) {
    const out = sctx.createImageData(size, size);
    for (let i = 0; i < gray.length; i++) {
      const v = Math.floor(clamp01(gray[i]) * 255);
      out.data[i * 4] = v;
      out.data[i * 4 + 1] = v;
      out.data[i * 4 + 2] = v;
      out.data[i * 4 + 3] = 255;
    }
    sctx.putImageData(out, 0, 0);
    return src;
  }

  const fg = cssVar("--color-foreground", opts.fg);
  const bg = cssVar("--color-background", opts.bg);
  for (let i = 0; i < gray.length; i++) {
    const pct = Math.round(clamp01(gray[i]) * 100);
    sctx.fillStyle = `color-mix(in oklab, ${bg} ${100 - pct}%, ${fg} ${pct}%)`;
    sctx.fillRect(i % size, Math.floor(i / size), 1, 1);
  }

  return src;
}
