import * as THREE from "three";

/**
 * Canvas-drawn textures for shop signs, boards and posters.
 * Keeps the world free of extra image downloads.
 */

export type SignOptions = {
  width?: number;
  height?: number;
  bg?: string;
  fg?: string;
  accent?: string;
  title: string;
  subtitle?: string;
  small?: string;
  border?: boolean;
};

function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startSize: number,
  weight = "800",
) {
  let size = startSize;
  do {
    ctx.font = `${weight} ${size}px "Geist", "Arial Black", Arial, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 4;
  } while (size > 12);
  return size;
}

export function makeSignTexture(o: SignOptions) {
  const w = o.width ?? 1024;
  const h = o.height ?? 512;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;

  ctx.fillStyle = o.bg ?? "#111";
  ctx.fillRect(0, 0, w, h);

  // painted-wall grain
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 3, 3);
  }

  if (o.border !== false) {
    ctx.strokeStyle = o.accent ?? "#FFB020";
    ctx.lineWidth = Math.max(8, w * 0.014);
    ctx.strokeRect(ctx.lineWidth, ctx.lineWidth, w - ctx.lineWidth * 2, h - ctx.lineWidth * 2);
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = o.fg ?? "#fff";

  const hasSub = !!o.subtitle;
  const hasSmall = !!o.small;
  const titleY = hasSub ? h * (hasSmall ? 0.36 : 0.42) : h * 0.5;
  fitFont(ctx, o.title, w * 0.86, Math.floor(h * (hasSub ? 0.3 : 0.42)));
  ctx.fillText(o.title, w / 2, titleY);

  if (hasSub) {
    ctx.fillStyle = o.accent ?? "#FFB020";
    fitFont(ctx, o.subtitle!, w * 0.84, Math.floor(h * 0.13), "700");
    ctx.fillText(o.subtitle!, w / 2, h * (hasSmall ? 0.62 : 0.7));
  }
  if (hasSmall) {
    ctx.fillStyle = o.fg ?? "#fff";
    ctx.globalAlpha = 0.75;
    fitFont(ctx, o.small!, w * 0.84, Math.floor(h * 0.08), "600");
    ctx.fillText(o.small!, w / 2, h * 0.82);
    ctx.globalAlpha = 1;
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Fallback poster when a project image is missing. */
export function makePosterTexture(title: string, category: string, year: string) {
  const w = 1024;
  const h = 640;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#151515");
  g.addColorStop(1, "#2a2116");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#FFB020";
  ctx.beginPath();
  ctx.arc(w * 0.85, h * 0.2, 170, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  fitFont(ctx, title, w * 0.8, 110);
  ctx.fillText(title, 70, h * 0.62);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = `600 38px "Geist", Arial, sans-serif`;
  ctx.fillText(category, 72, h * 0.75);
  ctx.fillStyle = "#FFB020";
  ctx.font = `800 34px "Geist", Arial, sans-serif`;
  ctx.fillText(year, 72, h * 0.88);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Text painted on the ground (like road markings). */
export function makeGroundTextTexture(lines: string[], color = "#ffffff") {
  const w = 1024;
  const h = 256 * lines.length;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  lines.forEach((line, i) => {
    fitFont(ctx, line, w * 0.95, i === 0 ? 150 : 90);
    ctx.fillText(line, w / 2, 128 + i * 256);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Small label for crates (tool names). */
export function makeLabelTexture(text: string, bg: string, fg = "#fff") {
  const s = 256;
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, s - 14, s - 14);
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  fitFont(ctx, text, s * 0.8, 110);
  ctx.fillText(text, s / 2, s / 2 + 4);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
