/** Small ZIP32 writer: UTF-8 filenames, STORE compression, no dependencies. */
export interface ZipEntry { name: string; data: string | Uint8Array }

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function validatePath(name: string): void {
  if (!name || /[\\:\u0000-\u001f\u007f]/.test(name) || name.split("/").some((part) =>
    !part || part === "." || part === ".." || /[. ]$/.test(part) ||
    /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) {
    throw new Error("Unsafe ZIP path/name: " + name);
  }
}

export function createZip(entries: readonly ZipEntry[]): Uint8Array {
  if (entries.length > 65535) throw new Error("ZIP32 entry limit exceeded");
  const encoder = new TextEncoder();
  const names = new Set<string>();
  const records = entries.map((entry) => {
    validatePath(entry.name);
    const key = entry.name.normalize("NFC").toLowerCase();
    if (names.has(key)) throw new Error("Duplicate ZIP name: " + entry.name);
    names.add(key);
    const name = encoder.encode(entry.name);
    const data = typeof entry.data === "string" ? encoder.encode(entry.data) : entry.data;
    if (name.length > 65535 || data.length > 0xffffffff) throw new Error("ZIP32 size limit exceeded");
    return { name, data, crc: crc32(data), offset: 0 };
  });
  const size = records.reduce((total, entry) => total + 76 + entry.name.length * 2 + entry.data.length, 22);
  if (size > 0xffffffff) throw new Error("ZIP32 archive limit exceeded");
  const output = new Uint8Array(size);
  const view = new DataView(output.buffer);
  let offset = 0;
  const u16 = (value: number) => { view.setUint16(offset, value, true); offset += 2; };
  const u32 = (value: number) => { view.setUint32(offset, value, true); offset += 4; };
  const append = (value: Uint8Array) => { output.set(value, offset); offset += value.length; };
  for (const entry of records) {
    entry.offset = offset;
    u32(0x04034b50); u16(20); u16(0x800); u16(0); u16(0); u16(33);
    u32(entry.crc); u32(entry.data.length); u32(entry.data.length);
    u16(entry.name.length); u16(0); append(entry.name); append(entry.data);
  }
  const central = offset;
  for (const entry of records) {
    u32(0x02014b50); u16(20); u16(20); u16(0x800); u16(0); u16(0); u16(33);
    u32(entry.crc); u32(entry.data.length); u32(entry.data.length);
    u16(entry.name.length); u16(0); u16(0); u16(0); u16(0); u32(0); u32(entry.offset);
    append(entry.name);
  }
  const centralSize = offset - central;
  u32(0x06054b50); u16(0); u16(0); u16(records.length); u16(records.length);
  u32(centralSize); u32(central); u16(0);
  return output;
}
