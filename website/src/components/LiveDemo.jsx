import { useState, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'motion/react';
import { Play, Moon, Users, BarChart2, RefreshCw } from 'lucide-react';

const PRESETS = ['entertainment', 'inspiration', 'learning'];
const AGE_GROUPS = [
  { label: 'General', val: null },
  { label: 'Teen 16–17', val: '16-17' },
  { label: 'Teen 13–15', val: '13-15' },
];

function WeightBar({ label, value, color }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between">
        <span className="font-body text-xs text-foreground/60">{label}</span>
        <span className="font-body text-xs font-medium text-foreground/50">{(value * 100).toFixed(0)}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.06)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

function MetricCard({ label, improved, baseline, suffix = '' }) {
  const better = parseFloat(improved) > parseFloat(baseline);
  return (
    <div className="liquid-glass rounded-xl p-4 flex flex-col gap-2">
      <span className="font-body text-xs text-foreground/45 font-medium uppercase tracking-wider">{label}</span>
      <div className="flex items-end gap-3">
        <span className="font-heading italic text-3xl iridescent-text">{improved}{suffix}</span>
        <div className="flex flex-col pb-1">
          <span className="font-body text-xs text-foreground/35">vs baseline</span>
          <span className="font-body text-xs text-foreground/45">{baseline}{suffix}</span>
        </div>
      </div>
      <span
        className="self-start rounded-full px-2 py-0.5 font-body text-xs"
        style={{
          background: better ? 'rgba(167,243,208,0.3)' : 'rgba(253,164,175,0.3)',
          color: better ? '#059669' : '#e11d48',
        }}
      >
        {better ? '↑ improved' : '↓ reduced'}
      </span>
    </div>
  );
}

function FeedCard({ item, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="liquid-glass rounded-xl p-4 flex-shrink-0 w-48 flex flex-col gap-3"
    >
      {/* Thumbnail placeholder */}
      <div
        className="w-full h-24 rounded-lg flex items-center justify-center text-2xl"
        style={{
          background: `linear-gradient(135deg, ${
            ['hsla(270,70%,88%,0.6)', 'hsla(185,70%,82%,0.6)', 'hsla(330,80%,88%,0.6)', 'hsla(150,60%,85%,0.6)'][index % 4]
          }, rgba(255,255,255,0.3))`,
        }}
      >
        {['🎬','🎵','📚','🌿','🎨','💬','🌏','🏃','🍳','🔬'][index % 10]}
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-body text-xs font-medium text-foreground/70 capitalize">
          {item.topic || 'Content'}
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {item.prosocial === 1 && (
            <span className="rounded-full px-2 py-0.5 font-body text-xs" style={{ background: 'rgba(167,243,208,0.3)', color: '#059669' }}>prosocial</span>
          )}
          {item.risk > 0.5 && (
            <span className="rounded-full px-2 py-0.5 font-body text-xs" style={{ background: 'rgba(253,164,175,0.25)', color: '#e11d48' }}>risk</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function LiveDemo() {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  const [preset,    setPreset]    = useState('entertainment');
  const [nightMode, setNightMode] = useState(false);
  const [ageGroup,  setAgeGroup]  = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState(null);
  const [error,     setError]     = useState(null);

  const runAlgorithm = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('http://localhost:8000/api/run/local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preset,
          night_mode: nightMode,
          passive_streak: 0,
          user_profile: { age_group: ageGroup },
        }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e.message.includes('fetch') ? 'offline' : e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="demo" className="py-32 px-8 lg:px-16 gradient-mesh overflow-hidden">
      <div className="max-w-7xl mx-auto flex flex-col gap-14" ref={ref}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="flex flex-col gap-4 items-center text-center"
        >
          <span className="section-badge liquid-glass"><Play className="w-3 h-3" /> Live Demo</span>
          <h2 className="font-heading italic text-5xl md:text-6xl text-foreground leading-[0.9] tracking-[-2px]">
            Try the algorithm.
          </h2>
          <p className="font-body font-light text-base text-foreground/55 max-w-lg">
            This runs the real MorphoMedia algorithm against a live dataset.
            Adjust the controls and see how the feed — and the metrics — change.
          </p>
        </motion.div>

        {/* Controls + results grid */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="grid lg:grid-cols-[340px_1fr] gap-8 items-start"
        >

          {/* ── Controls panel ── */}
          <div className="liquid-glass-strong rounded-2xl p-6 flex flex-col gap-7">
            {/* Preset */}
            <div className="flex flex-col gap-3">
              <label className="font-body text-xs font-medium text-foreground/45 uppercase tracking-wider">
                Preset mode
              </label>
              <div className="flex flex-col gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPreset(p)}
                    className={`rounded-full px-4 py-2 font-body text-sm font-medium text-left capitalize transition-all duration-200 ${
                      preset === p
                        ? 'liquid-glass-strong text-foreground'
                        : 'text-foreground/50 hover:text-foreground hover:bg-white/30'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Age group */}
            <div className="flex flex-col gap-3">
              <label className="font-body text-xs font-medium text-foreground/45 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3 h-3" /> Age protection
              </label>
              <div className="flex flex-col gap-2">
                {AGE_GROUPS.map(({ label, val }) => (
                  <button
                    key={label}
                    onClick={() => setAgeGroup(val)}
                    className={`rounded-full px-4 py-2 font-body text-sm font-medium text-left transition-all duration-200 ${
                      ageGroup === val
                        ? 'liquid-glass-strong text-foreground'
                        : 'text-foreground/50 hover:text-foreground hover:bg-white/30'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Night mode toggle */}
            <div className="flex items-center justify-between">
              <label className="font-body text-sm font-medium text-foreground/60 flex items-center gap-2">
                <Moon className="w-4 h-4" /> Night mode
              </label>
              <button
                onClick={() => setNightMode(!nightMode)}
                className={`relative w-10 h-5 rounded-full transition-all duration-300 ${
                  nightMode ? 'bg-violet-400' : 'bg-foreground/15'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${
                    nightMode ? 'left-5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Run button */}
            <button
              onClick={runAlgorithm}
              disabled={loading}
              className="liquid-glass-strong rounded-full py-3 font-body font-medium text-sm text-foreground flex items-center justify-center gap-2 hover:scale-105 transition-transform duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="butterfly-spinner scale-75" />
                  Running…
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run the Algorithm
                </>
              )}
            </button>
          </div>

          {/* ── Results panel ── */}
          <div className="flex flex-col gap-6 min-h-[400px]">
            <AnimatePresence mode="wait">
              {!result && !error && !loading && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center gap-4 liquid-glass rounded-2xl p-12 text-center"
                >
                  <div className="butterfly-spinner" />
                  <p className="font-body font-light text-sm text-foreground/40">
                    Configure and run the algorithm to see live results
                  </p>
                </motion.div>
              )}

              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="liquid-glass rounded-2xl p-8 flex flex-col gap-3"
                >
                  {error === 'offline' ? (
                    <>
                      <p className="font-body font-medium text-sm text-foreground/70">Backend not running</p>
                      <p className="font-body font-light text-sm text-foreground/50">
                        Start the FastAPI server first:
                      </p>
                      <code
                        className="rounded-lg px-4 py-2 font-mono text-sm text-foreground/70"
                        style={{ background: 'rgba(0,0,0,0.05)' }}
                      >
                        python api.py
                      </code>
                    </>
                  ) : (
                    <p className="font-body text-sm text-foreground/60">{error}</p>
                  )}
                  <button
                    onClick={runAlgorithm}
                    className="self-start flex items-center gap-1.5 font-body text-sm text-foreground/50 hover:text-foreground transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Try again
                  </button>
                </motion.div>
              )}

              {result && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-6"
                >
                  {/* Weights used */}
                  {result.weights && (
                    <div className="liquid-glass rounded-xl p-5 flex flex-col gap-4">
                      <p className="font-body text-xs font-medium text-foreground/45 uppercase tracking-wider flex items-center gap-1.5">
                        <BarChart2 className="w-3 h-3" /> Algorithm weights
                      </p>
                      <WeightBar label="Engagement"  value={result.weights.e ?? 0} color="#818cf8" />
                      <WeightBar label="Diversity"   value={result.weights.d ?? 0} color="#67e8f9" />
                      <WeightBar label="Prosocial"   value={result.weights.p ?? 0} color="#a7f3d0" />
                      <WeightBar label="Risk shield" value={result.weights.r ?? 0} color="#fda4af" />
                    </div>
                  )}

                  {/* Metrics comparison */}
                  {result.improved_metrics && result.baseline_metrics && (
                    <div className="grid grid-cols-3 gap-3">
                      <MetricCard
                        label="Prosocial ratio"
                        improved={(result.improved_metrics.prosocial_ratio * 100).toFixed(0)}
                        baseline={(result.baseline_metrics.prosocial_ratio * 100).toFixed(0)}
                        suffix="%"
                      />
                      <MetricCard
                        label="Diversity@10"
                        improved={result.improved_metrics.diversity_at_10?.toFixed(1) ?? '—'}
                        baseline={result.baseline_metrics.diversity_at_10?.toFixed(1) ?? '—'}
                      />
                      <MetricCard
                        label="Max streak"
                        improved={result.improved_metrics.max_streak ?? '—'}
                        baseline={result.baseline_metrics.max_streak ?? '—'}
                      />
                    </div>
                  )}

                  {/* Feed preview */}
                  {result.improved_feed && result.improved_feed.length > 0 && (
                    <div className="flex flex-col gap-3">
                      <p className="font-body text-xs font-medium text-foreground/45 uppercase tracking-wider">
                        Top 10 recommended items
                      </p>
                      <div className="scroll-x pb-2">
                        {result.improved_feed.slice(0, 10).map((item, i) => (
                          <FeedCard key={i} item={item} index={i} />
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
