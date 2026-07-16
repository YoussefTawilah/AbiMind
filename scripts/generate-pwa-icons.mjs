import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const pngSource = path.join(root, 'public', 'logo-neu.png');
const svgSource = path.join(root, 'public', 'pwa-icon.svg');
const outDir = path.join(root, 'public', 'icons');
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

/** App-Hintergrund – kein Weiß auf dem Homescreen */
const APP_BG = { r: 15, g: 16, b: 20, alpha: 1 }; // #0f1014

let sourceBuffer;
try {
  sourceBuffer = await readFile(pngSource);
} catch {
  sourceBuffer = await readFile(svgSource);
}

/** Entfernt schwarze Ränder um das eigentliche Icon (letterboxing) */
async function trimLogoPadding(buffer) {
  try {
    return await sharp(buffer).trim({ threshold: 12 }).png().toBuffer();
  } catch {
    return buffer;
  }
}

/** Icon randlos auf quadratische Fläche – füllt das ganze App-Icon aus */
async function buildAppIcon(trimmedBuffer, size) {
  const logo = await sharp(trimmedBuffer)
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer();

  return sharp({
    create: { width: size, height: size, channels: 4, background: APP_BG },
  })
    .composite([{ input: logo, top: 0, left: 0 }])
    .png()
    .toBuffer();
}

const trimmed = await trimLogoPadding(sourceBuffer);

await mkdir(outDir, { recursive: true });

/** Zugeschnittenes Icon für Header & künftige Verwendung */
await writeFile(path.join(root, 'public', 'logo-icon.png'), trimmed);

for (const size of sizes) {
  const png = await buildAppIcon(trimmed, size);
  await writeFile(path.join(outDir, `icon-${size}x${size}.png`), png);
}

await writeFile(
  path.join(outDir, 'apple-touch-icon.png'),
  await buildAppIcon(trimmed, 180),
);

console.log(`Generated ${sizes.length + 1} PWA icons (trimmed, full-bleed) in public/icons/`);
