/**
 * Lee el directorio central de un ZIP (DOCX) para conocer el tamaño descomprimido total
 * sin descomprimir nada. Protege frente a "zip bombs".
 */
export function inspectZip(buf: Buffer): { entries: number; uncompressedBytes: number } {
  const EOCD = 0x06054b50;
  const min = Math.max(0, buf.length - 65_557);
  let eocd = -1;
  for (let i = buf.length - 22; i >= min; i--) {
    if (buf.readUInt32LE(i) === EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("ZIP inválido");
  const entries = buf.readUInt16LE(eocd + 10);
  let offset = buf.readUInt32LE(eocd + 16);
  let total = 0;
  for (let n = 0; n < entries; n++) {
    if (offset + 46 > buf.length || buf.readUInt32LE(offset) !== 0x02014b50) throw new Error("ZIP inválido");
    const size = buf.readUInt32LE(offset + 24);
    if (size === 0xffffffff) throw new Error("ZIP64 no admitido");
    total += size;
    offset += 46 + buf.readUInt16LE(offset + 28) + buf.readUInt16LE(offset + 30) + buf.readUInt16LE(offset + 32);
  }
  return { entries, uncompressedBytes: total };
}
