import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(process.cwd(), 'public', 'favicon');
const src = resolve(process.cwd(), 'public', 'logo', 'logo_circle.png');

const targets = [
  { file: 'favicon-16x16.png', size: 16 },
  { file: 'favicon-32x32.png', size: 32 },
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'android-chrome-192x192.png', size: 192 },
  { file: 'android-chrome-512x512.png', size: 512 },
];

const buffers = {};
for (const { file, size } of targets) {
  const buf = await sharp(src)
    .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();
  await writeFile(resolve(root, file), buf);
  buffers[size] = buf;
  console.log(`wrote ${file}`);
}

// Build multi-image ICO containing 16, 32, 48 PNG-encoded entries.
const ico48 = await sharp(src)
  .resize(48, 48, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
  .png()
  .toBuffer();

const entries = [
  { size: 16, buf: buffers[16] },
  { size: 32, buf: buffers[32] },
  { size: 48, buf: ico48 },
];

const headerSize = 6;
const dirSize = 16;
const dataStart = headerSize + dirSize * entries.length;

const header = Buffer.alloc(headerSize);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(entries.length, 4);

const dirs = [];
const datas = [];
let offset = dataStart;
for (const { size, buf } of entries) {
  const dir = Buffer.alloc(dirSize);
  dir.writeUInt8(size === 256 ? 0 : size, 0);
  dir.writeUInt8(size === 256 ? 0 : size, 1);
  dir.writeUInt8(0, 2); // colors
  dir.writeUInt8(0, 3); // reserved
  dir.writeUInt16LE(1, 4); // planes
  dir.writeUInt16LE(32, 6); // bpp
  dir.writeUInt32LE(buf.length, 8);
  dir.writeUInt32LE(offset, 12);
  dirs.push(dir);
  datas.push(buf);
  offset += buf.length;
}

const ico = Buffer.concat([header, ...dirs, ...datas]);
await writeFile(resolve(root, 'favicon.ico'), ico);
console.log('wrote favicon.ico');
