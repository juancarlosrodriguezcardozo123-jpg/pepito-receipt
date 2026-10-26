export const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleString("es", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export const fmtDay = (d: Date | string) => new Date(d).toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" });

export const fmtBytes = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

export const fmtNum = (n: number) => n.toLocaleString("es");

/** Fecha de hace `n` días (para consultas de estadísticas). */
export const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
