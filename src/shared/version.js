// Compares dotted versions like "1.2.10" (a leading "v" is fine). Returns -1, 0 or 1; null if either is not a version.
export function compareVersions(a, b) {
  const parse = v => { const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(String(v ?? "").trim()); return m ? m.slice(1).map(Number) : null; };
  const x = parse(a), y = parse(b);
  if (!x || !y) return null;
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  return 0;
}
