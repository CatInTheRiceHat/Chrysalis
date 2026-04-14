// Annotation positions as % of the full container (left wing segments)
// dx/dy = screen pixel offset from dot to label text
const ANNOTATIONS = [
  { label: ['Wellbeing-First', 'Scoring'], x: 16,  y: 22,  dx: -90, dy: -18 },
  { label: ['Session Cap'],               x: 30,  y: 10,  dx: -15, dy: -55 },
  { label: ['Content Diversity'],         x: 40,  y: 27,  dx:  45, dy: -40 },
  { label: ['Emotional Balance'],         x: 40,  y: 54,  dx:  45, dy:  18 },
  { label: ['Sleep-Safe Hours'],          x: 27,  y: 72,  dx: -15, dy:  55 },
  { label: ['Crisis Detection'],          x: 14,  y: 60,  dx: -90, dy:  18 },
];

export default function ButterflyCanvas({ width = 680, height = 480 }) {
  // Container keeps the image at a consistent size regardless of prop
  const imgW = width;
  const imgH = Math.round(width * (1482 / 2048)); // maintain aspect ratio

  return (
    <div
      style={{
        width: imgW,
        height: imgH,
        position: 'relative',
        transform: 'rotate(30deg) scale(1.7)',
        transformOrigin: 'center center',
      }}
      className="butterfly-float pointer-events-none"
      aria-hidden="true"
    >
      {/* ── Left wing (clips left half, hinges at center) ── */}
      <div
        className="wing-left"
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '50%', height: '100%',
          overflow: 'hidden',
        }}
      >
        <img
          src="/butterfly.png"
          alt=""
          style={{ width: imgW, height: imgH, display: 'block', maxWidth: 'none' }}
          draggable={false}
        />
      </div>

      {/* ── Right wing (clips right half, hinges at center) ── */}
      <div
        className="wing-right"
        style={{
          position: 'absolute',
          top: 0, right: 0,
          width: '50%', height: '100%',
          overflow: 'hidden',
        }}
      >
        <img
          src="/butterfly.png"
          alt=""
          style={{
            width: imgW, height: imgH,
            display: 'block', maxWidth: 'none',
            position: 'relative', left: `-${imgW / 2}px`,
          }}
          draggable={false}
        />
      </div>

      {/* ── SVG annotation overlay ── */}
      <svg
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: imgW, height: imgH,
          overflow: 'visible',
          pointerEvents: 'none',
        }}
      >
        {ANNOTATIONS.map((ann, i) => {
          const sx = (ann.x / 100) * imgW;
          const sy = (ann.y / 100) * imgH;
          const ex = sx + ann.dx;
          const ey = sy + ann.dy;
          const alignEnd = ann.dx < 0;

          return (
            <g key={i}>
              <line
                x1={sx} y1={sy} x2={ex} y2={ey}
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="0.8"
              />
              <circle cx={sx} cy={sy} r="2.5" fill="rgba(255,255,255,0.6)" />
              <g transform={`translate(${ex},${ey}) rotate(-30)`}>
                {ann.label.map((line, li) => (
                  <text
                    key={li}
                    x={alignEnd ? -6 : 6}
                    y={li * 13 - (ann.label.length - 1) * 6}
                    textAnchor={alignEnd ? 'end' : 'start'}
                    dominantBaseline="middle"
                    fill="rgba(255,255,255,0.80)"
                    fontSize="9"
                    fontFamily="system-ui, -apple-system, sans-serif"
                    letterSpacing="1.8"
                  >
                    {line.toUpperCase()}
                  </text>
                ))}
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
