import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
/** Quelle: public/logo-neu.png (App-Icon) oder fallback pwa-icon.svg */
const pngSource = path.join(root, 'public', 'logo-neu.png');
const svgSource = path.join(root, 'public', 'pwa-icon.svg');
const outDir = path.join(root, 'public', 'icons');
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

let sourceBuffer;
try {
  sourceBuffer = await readFile(pngSource);
} catch {
  sourceBuffer = await readFile(svgSource);
}

await mkdir(outDir, { recursive: true });

for (const size of sizes) {
  const png = await sharp(sourceBuffer).resize(size, size).png().toBuffer();
  await writeFile(path.join(outDir, `icon-${size}x${size}.png`), png);
}

await writeFile(
  path.join(outDir, 'apple-touch-icon.png'),
  await sharp(sourceBuffer).resize(180, 180).png().toBuffer(),
);

console.log(`Generated ${sizes.length + 1} PWA icons in public/icons/`);
