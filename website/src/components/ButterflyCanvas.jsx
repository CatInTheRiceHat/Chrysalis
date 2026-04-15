const ANNOTATIONS = [
  { label: ['Wellbeing-First', 'Scoring'], x: 16,  y: 22,  dx: -90, dy: -18 },
  { label: ['Session Cap'],               x: 30,  y: 10,  dx: -15, dy: -55 },
  { label: ['Content Diversity'],         x: 40,  y: 27,  dx:  45, dy: -40 },
  { label: ['Emotional Balance'],         x: 40,  y: 54,  dx:  45, dy:  18 },
  { label: ['Sleep-Safe Hours'],          x: 27,  y: 72,  dx: -15, dy:  55 },
  { label: ['Crisis Detection'],          x: 14,  y: 60,  dx: -90, dy:  18 },
];

// ── Tune these to frame the shot ─────────────────────────────
const ROTATION    = 15;   // degrees clockwise
const SCALE       = 2;  // zoom
const TRANSLATE_X = 15;   // % left/right
const TRANSLATE_Y = 5;   // % up/down
// ─────────────────────────────────────────────────────────────

export default function ButterflyCanvas({ width = 900, height = 700 }) {
  const imgW = width;
  const imgH = Math.round(width * (1482 / 2048));

  return (
    // No overflow:hidden here — the parent hero section clips at its edge.
    // The butterfly PNG is transparent so no box is visible.
    <div
      style={{ width: imgW, height: imgH, position: 'relative' }}
      className="butterfly-float pointer-events-none"
      aria-hidden="true"
    >
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          transform: `rotate(${ROTATION}deg) scale(${SCALE}) translate(${TRANSLATE_X}%, ${TRANSLATE_Y}%)`,
          transformOrigin: 'center center',
        }}
      >
        {/* Left wing */}
        <div
          className="wing-left"
          style={{ position: 'absolute', top: 0, left: 0, width: '50%', height: '100%', overflow: 'hidden' }}
        >
          <img
            src="/butterfly.png"
            alt=""
            style={{ width: imgW, height: imgH, display: 'block', maxWidth: 'none' }}
            draggable={false}
          />
        </div>

        {/* Right wing */}
        <div
          className="wing-right"
          style={{ position: 'absolute', top: 0, right: 0, width: '50%', height: '100%', overflow: 'hidden' }}
        >
          <img
            src="/butterfly.png"
            alt=""
            style={{
              width: imgW, height: imgH, display: 'block', maxWidth: 'none',
              position: 'relative', left: `-${imgW / 2}px`,
            }}
            draggable={false}
          />
        </div>

        {/* SVG annotations */}
        <svg
          style={{
            position: 'absolute', top: 0, left: 0,
            width: imgW, height: imgH,
            overflow: 'visible', pointerEvents: 'none',
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
                <line x1={sx} y1={sy} x2={ex} y2={ey} stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
                <circle cx={sx} cy={sy} r="2.5" fill="rgba(255,255,255,0.6)" />
                <g transform={`translate(${ex},${ey}) rotate(${-ROTATION})`}>
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
    </div>
  );
}
