import type { ReactNode } from "react";

export type Highlight = { start: number; end: number; className: string; id?: string; title?: string; href?: string };

/** Renderiza el texto con fragmentos resaltados (los solapamientos se recortan). */
export function HighlightedText({ text, highlights }: { text: string; highlights: Highlight[] }) {
  const sorted = [...highlights].sort((a, b) => a.start - b.start);
  const out: ReactNode[] = [];
  let pos = 0;
  sorted.forEach((h, i) => {
    const start = Math.max(h.start, pos);
    const end = Math.min(h.end, text.length);
    if (end <= start) return;
    if (start > pos) out.push(text.slice(pos, start));
    out.push(
      <mark key={i} id={h.id} title={h.title} className={`hl ${h.className}`}>
        {h.href ? (
          <a href={h.href} className="text-inherit no-underline">
            {text.slice(start, end)}
          </a>
        ) : (
          text.slice(start, end)
        )}
      </mark>,
    );
    pos = end;
  });
  if (pos < text.length) out.push(text.slice(pos));
  return <div className="whitespace-pre-wrap break-words font-serif text-[15px] leading-7">{out}</div>;
}
