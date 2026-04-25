import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Moon, RefreshCw, Calendar, Sparkles } from 'lucide-react';
import { FeedCard } from './FeedCard';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

function StatPill({ label, value, accent }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-body text-xs text-foreground/40 uppercase tracking-wider">{label}</span>
      <span className="font-heading text-xl" style={{ color: accent ?? 'inherit' }}>
        {value}
      </span>
    </div>
  );
}

function DropCard({ drop, label, Icon, accentColor, scheduledTime }) {
  if (!drop) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="liquid-glass rounded-2xl p-8 flex flex-col items-center justify-center gap-4 text-center min-h-[280px]"
        style={{ border: '1px solid rgba(255,255,255,0.6)' }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: `${accentColor}18` }}
        >
          <Icon className="w-5 h-5" style={{ color: `${accentColor}99` }} />
        </div>
        <div className="flex flex-col gap-1">
          <p className="font-body font-medium text-sm text-foreground/45">{label} not yet delivered</p>
          <p className="font-body font-light text-xs text-foreground/30">Scheduled for {scheduledTime}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="liquid-glass rounded-2xl p-6 flex flex-col gap-5"
      style={{ border: '1px solid rgba(255,255,255,0.6)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: `${accentColor}18` }}
          >
            <Icon className="w-5 h-5" style={{ color: accentColor }} />
          </div>
          <div>
            <p className="font-body font-semibold text-sm text-foreground/80">{label}</p>
            <p className="font-body text-xs text-foreground/40">{drop.scheduled_at}</p>
          </div>
        </div>
        <span
          className="rounded-full px-3 py-1 font-body text-xs font-medium"
          style={{ background: 'rgba(167,243,208,0.3)', color: '#059669' }}
        >
          ✓ delivered
        </span>
      </div>

      {/* Feed scroll */}
      {drop.feed?.length > 0 && (
        <div className="scroll-x pb-2">
          {drop.feed.slice(0, 12).map((item, i) => (
            <FeedCard key={i} item={item} index={i} />
          ))}
        </div>
      )}

      {/* Stats */}
      <div
        className="rounded-xl px-4 py-3 flex items-center gap-5"
        style={{ background: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.6)' }}
      >
        <StatPill label="Items" value={drop.item_count} accent={accentColor} />
        <div className="w-px h-8 bg-foreground/8" />
        <StatPill label="Mode" value={<span className="capitalize text-foreground/60 font-body text-sm font-medium">{drop.mode}</span>} />
      </div>
    </motion.div>
  );
}

export function MigrationMode() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const fetchDrops = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/api/migration/today`);
      if (res.status === 404) { setData({ empty: true }); return; }
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e.message.includes('fetch') ? 'offline' : e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDrops(); }, []);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <div className="flex flex-col gap-6">

      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div
          className="flex items-center gap-2 rounded-full px-4 py-2"
          style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.75)' }}
        >
          <Calendar className="w-3.5 h-3.5 text-foreground/45" />
          <span className="font-body text-sm text-foreground/60">{today}</span>
        </div>
        <button
          onClick={fetchDrops}
          disabled={loading}
          className="flex items-center gap-1.5 font-body text-sm text-foreground/40 hover:text-foreground/70 transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Explainer strip */}
      <div
        className="rounded-2xl px-5 py-4 flex items-start gap-4"
        style={{
          background: 'linear-gradient(135deg, rgba(167,139,250,0.08), rgba(103,232,249,0.08))',
          border: '1px solid rgba(167,139,250,0.15)',
        }}
      >
        <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#a78bfa' }} />
        <p className="font-body font-light text-sm text-foreground/55 leading-relaxed">
          Migration Mode replaces your personalized feed with two non-personalized daily drops — one in the
          morning, one in the evening — curated for diversity and positivity. Same content for everyone.
        </p>
      </div>

      <AnimatePresence mode="wait">

        {loading && !data && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center gap-4 liquid-glass rounded-2xl p-16"
          >
            <div className="butterfly-spinner" />
            <p className="font-body font-light text-sm text-foreground/40">Fetching today's drops…</p>
          </motion.div>
        )}

        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="liquid-glass rounded-2xl p-8 flex flex-col gap-3 items-center text-center"
          >
            <p className="font-body font-medium text-sm text-foreground/70">
              {error === 'offline' ? 'Backend not running' : 'Could not load drops'}
            </p>
            {error === 'offline' && (
              <>
                <p className="font-body font-light text-sm text-foreground/45">
                  Start the FastAPI server to enable drops:
                </p>
                <code
                  className="rounded-lg px-4 py-2 font-mono text-sm text-foreground/60"
                  style={{ background: 'rgba(0,0,0,0.04)' }}
                >
                  python api.py
                </code>
              </>
            )}
            <button
              onClick={fetchDrops}
              className="flex items-center gap-1.5 font-body text-sm text-foreground/50 hover:text-foreground transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Try again
            </button>
          </motion.div>
        )}

        {data?.empty && (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="liquid-glass rounded-2xl p-12 flex flex-col items-center gap-6 text-center"
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="text-5xl"
            >
              🌅
            </motion.div>
            <div className="flex flex-col gap-2">
              <p className="font-heading text-xl text-foreground/50">No drops yet today</p>
              <p className="font-body font-light text-sm text-foreground/35 max-w-sm">
                The morning drop delivers at <strong className="text-foreground/55">07:00</strong> and
                the evening drop at <strong className="text-foreground/55">19:00</strong>.
                Start the scheduler to enable automatic drops.
              </p>
            </div>
            <code
              className="rounded-xl px-5 py-3 font-mono text-sm text-foreground/50"
              style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)' }}
            >
              python api.py
            </code>
          </motion.div>
        )}

        {data && !data.empty && (
          <motion.div
            key="drops"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="grid lg:grid-cols-2 gap-6"
          >
            <DropCard
              drop={data.morning}
              label="Morning Drop"
              Icon={Sun}
              accentColor="#f59e0b"
              scheduledTime="07:00"
            />
            <DropCard
              drop={data.evening}
              label="Evening Drop"
              Icon={Moon}
              accentColor="#818cf8"
              scheduledTime="19:00"
            />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
