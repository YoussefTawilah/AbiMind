import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'public', 'pwa-icon.svg');
const outDir = path.join(root, 'public', 'icons');
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const svg = await readFile(source);
await mkdir(outDir, { recursive: true });

for (const size of sizes) {
  const png = await sharp(svg).resize(size, size).png().toBuffer();
  await writeFile(path.join(outDir, `icon-${size}x${size}.png`), png);
}

await writeFile(path.join(outDir, 'apple-touch-icon.png'), await sharp(svg).resize(180, 180).png().toBuffer());

console.log(`Generated ${sizes.length + 1} PWA icons in public/icons/`);
