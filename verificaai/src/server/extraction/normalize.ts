/** Limpieza del texto extraído: saltos de línea, caracteres de control y espacios. */
export function normalizeExtractedText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/­/g, "")
    .replace(/(\p{L})-\n(\p{Ll})/gu, "$1$2")
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function countWords(text: string): number {
  return text.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
}
