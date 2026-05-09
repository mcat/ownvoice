#!/usr/bin/env node
// Renders apple-touch-icon, PWA icons, and iPad Pro splash screens from a
// runtime SVG that base64-embeds Atkinson Hyperlegible 700 — the only way
// to guarantee identical glyph rendering on dev and CI without relying on
// fontconfig knowing the brand font. PNGs are committed artifacts; this
// script regenerates them deterministically when invoked.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const fontPath = resolve(root, "public/fonts/atkinson-next-700.ttf");
const iconsDir = resolve(root, "public/icons");
const splashDir = resolve(root, "public/splash");

const fontBase64 = readFileSync(fontPath).toString("base64");
const fontFace = `
@font-face {
  font-family: "Atkinson";
  font-weight: 700;
  src: url(data:font/ttf;base64,${fontBase64}) format("truetype");
}`;

const BRAND_BLUE = "#2563EB";
const LIGHT_BG = "#FAFAF8";
const LIGHT_FG = "#1A1A1A";
const DARK_BG = "#111113";
const DARK_FG = "#F5F5F5";

function iconSvg({ size, maskable }) {
  // Maskable icons fill the whole canvas (OS clips to its preferred shape)
  // and place the mark inside the inner 80% safe zone. Regular icons get
  // a rounded square so they look correct on platforms that don't apply
  // their own mask.
  const bg = maskable
    ? `<rect width="${size}" height="${size}" fill="${BRAND_BLUE}"/>`
    : `<rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${BRAND_BLUE}"/>`;
  const fontSize = maskable ? size * 0.5 : size * 0.62;
  const yOffset = maskable ? size * 0.66 : size * 0.72;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs><style>${fontFace}</style></defs>
    ${bg}
    <text x="${size / 2}" y="${yOffset}" font-family="Atkinson" font-weight="700"
          font-size="${fontSize}" fill="white" text-anchor="middle">V</text>
  </svg>`;
}

function splashSvg({ width, height, dark }) {
  const bg = dark ? DARK_BG : LIGHT_BG;
  const fg = dark ? DARK_FG : LIGHT_FG;
  const min = Math.min(width, height);
  // Mark sits above the wordmark, both vertically centered as a group.
  const markSize = Math.round(min * 0.18);
  const wordSize = Math.round(min * 0.07);
  const gap = Math.round(min * 0.04);
  const groupH = markSize + gap + wordSize;
  const cx = width / 2;
  const cy = height / 2;
  const markX = cx - markSize / 2;
  const markY = cy - groupH / 2;
  const wordY = markY + markSize + gap + wordSize * 0.85;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs><style>${fontFace}</style></defs>
    <rect width="${width}" height="${height}" fill="${bg}"/>
    <rect x="${markX}" y="${markY}" width="${markSize}" height="${markSize}" rx="${markSize * 0.22}" fill="${BRAND_BLUE}"/>
    <text x="${cx}" y="${markY + markSize * 0.72}" font-family="Atkinson" font-weight="700"
          font-size="${markSize * 0.62}" fill="white" text-anchor="middle">V</text>
    <text x="${cx}" y="${wordY}" font-family="Atkinson" font-weight="700"
          font-size="${wordSize}" fill="${fg}" text-anchor="middle"
          letter-spacing="${wordSize * 0.005}">OwnVoice</text>
  </svg>`;
}

async function renderPng(svg, outPath) {
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(outPath);
  console.log(`  wrote ${outPath}`);
}

const ICONS = [
  { name: "apple-touch-icon-180.png", size: 180, maskable: false },
  { name: "icon-192.png", size: 192, maskable: false },
  { name: "icon-512.png", size: 512, maskable: false },
  { name: "icon-512-maskable.png", size: 512, maskable: true },
];

// iPad Pro M4/M5 device-pixel resolutions (2x).
//   11": 2420×1668 (CSS 1210×834)
//   13": 2752×2064 (CSS 1376×1032)
const SPLASHES = [
  { name: "launch-1668x2420", width: 1668, height: 2420 }, // 11" portrait
  { name: "launch-2420x1668", width: 2420, height: 1668 }, // 11" landscape
  { name: "launch-2064x2752", width: 2064, height: 2752 }, // 13" portrait
  { name: "launch-2752x2064", width: 2752, height: 2064 }, // 13" landscape
];

async function main() {
  const onlyIcon = process.argv.includes("--only-touch-icon");

  console.log("Generating icons…");
  for (const icon of ICONS) {
    if (onlyIcon && icon.name !== "apple-touch-icon-180.png") continue;
    const svg = iconSvg({ size: icon.size, maskable: icon.maskable });
    await renderPng(svg, resolve(iconsDir, icon.name));
  }

  if (onlyIcon) {
    console.log("Stopped after touch-icon (--only-touch-icon).");
    return;
  }

  console.log("Generating splash screens…");
  for (const splash of SPLASHES) {
    for (const dark of [false, true]) {
      const svg = splashSvg({ width: splash.width, height: splash.height, dark });
      const file = `${splash.name}-${dark ? "dark" : "light"}.png`;
      await renderPng(svg, resolve(splashDir, file));
    }
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
