/**
 * Read width/height from a PNG or JPEG header. Never fetches the whole file —
 * callers should pass the first ~64–128 KB.
 * @param {Buffer} buf
 * @returns {{ width: number, height: number } | null}
 */
export function sizeFromImageHeader(buf) {
  if (!buf || buf.length < 24) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    if (width > 0 && height > 0) return { width, height };
    return null;
  }
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buf[offset + 1];
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const size = buf.readUInt16BE(offset + 2);
    if (size < 2) return null;
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isSof) {
      const height = buf.readUInt16BE(offset + 5);
      const width = buf.readUInt16BE(offset + 7);
      if (width > 0 && height > 0) return { width, height };
      return null;
    }
    offset += 2 + size;
  }
  return null;
}

/**
 * Probe width/height without downloading the whole object.
 * @param {string} url
 * @returns {Promise<{ width: number, height: number } | null>}
 */
export async function probeImageSize(url) {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Range: 'bytes=0-131071' },
    });
    if (!res.ok && res.status !== 206) return null;
    const reader = res.body?.getReader();
    if (!reader) {
      const buf = Buffer.from(await res.arrayBuffer());
      return sizeFromImageHeader(buf);
    }
    const chunks = [];
    let total = 0;
    while (total < 131072) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(Buffer.from(value));
      total += value.length;
      if (total >= 4096) {
        const header = sizeFromImageHeader(Buffer.concat(chunks));
        if (header) {
          reader.cancel().catch(() => {});
          return header;
        }
      }
    }
    return sizeFromImageHeader(Buffer.concat(chunks));
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
