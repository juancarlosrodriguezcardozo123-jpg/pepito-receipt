import { describe, expect, it } from "vitest";
import { inspectZip } from "@/server/extraction/zip-guard";
import { countWords, normalizeExtractedText } from "@/server/extraction/normalize";

function zipWithEntry(uncompressed: number): Buffer {
  // Directorio central mínimo con una entrada + EOCD.
  const name = Buffer.from("a.txt");
  const cd = Buffer.alloc(46);
  cd.writeUInt32LE(0x02014b50, 0);
  cd.writeUInt32LE(uncompressed, 24);
  cd.writeUInt16LE(name.length, 28);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(46 + name.length, 12);
  eocd.writeUInt32LE(0, 16);
  return Buffer.concat([cd, name, eocd]);
}

describe("inspectZip", () => {
  it("suma los tamaños descomprimidos sin descomprimir", () => {
    expect(inspectZip(zipWithEntry(123456))).toEqual({ entries: 1, uncompressedBytes: 123456 });
  });
  it("rechaza datos que no son ZIP", () => {
    expect(() => inspectZip(Buffer.from("hola"))).toThrow();
  });
});

describe("normalizeExtractedText", () => {
  it("une palabras cortadas con guion y limpia espacios", () => {
    expect(normalizeExtractedText("compu-\ntadora   personal\r\n\n\n\nfin")).toBe("computadora personal\n\nfin");
  });
  it("cuenta palabras con tildes y números", () => {
    expect(countWords("Año 2024: éxito, ¿sí?")).toBe(4);
  });
});
