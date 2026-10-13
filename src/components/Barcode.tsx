/**
 * A lightweight, dependency-free barcode-style graphic. This is a decorative
 * representation (not a scannable symbology) that deterministically renders a
 * stable set of bars from the given value, with the value printed beneath —
 * matching the receipt spec's "barcode image + code" without pulling in a
 * barcode library or making any network request (offline-first).
 */
interface BarcodeProps {
  value: string;
  height?: number;
}

/** Deterministic pseudo-random bar widths derived from the value's characters. */
function barsFor(value: string): number[] {
  const seedStr = value.length > 0 ? value : '0';
  const bars: number[] = [];
  // Produce ~48 bars so the strip looks dense like a real barcode.
  for (let i = 0; i < 48; i++) {
    const code = seedStr.charCodeAt(i % seedStr.length);
    // Width 1–3 px, varied by position + char code.
    bars.push(((code + i * 7) % 3) + 1);
  }
  return bars;
}

export default function Barcode({ value, height = 48 }: BarcodeProps) {
  const bars = barsFor(value);
  const gap = 1;
  const width = bars.reduce((sum, w) => sum + w + gap, 0);

  let x = 0;

  return (
    <div className="barcode" aria-label={`Barcode ${value}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        role="img"
        aria-hidden="true"
      >
        {bars.map((w, i) => {
          const rect =
            i % 2 === 0 ? (
              <rect key={i} x={x} y={0} width={w} height={height} fill="#111" />
            ) : null;
          x += w + gap;
          return rect;
        })}
      </svg>
      <div className="barcode-value">{value}</div>
    </div>
  );
}
