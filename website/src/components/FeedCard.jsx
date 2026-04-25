import { motion } from 'motion/react';

const EMOJIS   = ['🎬','🎵','📚','🌿','🎨','💬','🌏','🏃','🍳','🔬'];
const PALETTES = [
  'hsla(270,70%,88%,0.6)',
  'hsla(185,70%,82%,0.6)',
  'hsla(330,80%,88%,0.6)',
  'hsla(150,60%,85%,0.6)',
];

export function FeedCard({ item, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="liquid-glass rounded-xl p-4 flex-shrink-0 w-48 flex flex-col gap-3"
    >
      <div
        className="w-full h-24 rounded-lg flex items-center justify-center text-2xl"
        style={{
          background: `linear-gradient(135deg, ${PALETTES[index % 4]}, rgba(255,255,255,0.3))`,
        }}
      >
        {EMOJIS[index % 10]}
      </div>

      <div className="flex flex-col gap-1">
        <span className="font-body text-xs font-medium text-foreground/70 capitalize">
          {item.topic || 'Content'}
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {item.prosocial === 1 && (
            <span
              className="rounded-full px-2 py-0.5 font-body text-xs"
              style={{ background: 'rgba(167,243,208,0.3)', color: '#059669' }}
            >
              prosocial
            </span>
          )}
          {item.risk > 0.5 && (
            <span
              className="rounded-full px-2 py-0.5 font-body text-xs"
              style={{ background: 'rgba(253,164,175,0.25)', color: '#e11d48' }}
            >
              risk
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
