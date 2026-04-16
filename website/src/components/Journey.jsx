import { useRef } from 'react';
import { motion, useInView } from 'motion/react';

const MILESTONES = [
  { icon: '📂', label: 'First dataset loaded',         sub: 'VK-LSVD social media dataset' },
  { icon: '📊', label: 'Baseline algorithm',            sub: 'Engagement-only ranking' },
  { icon: '🔬', label: 'Research deep-dive',           sub: '20+ papers on teen harm' },
  { icon: '🌀', label: 'Gini diversity scoring',       sub: 'Filter bubble prevention' },
  { icon: '🌙', label: 'Night mode + UCRS',            sub: 'User-controllable system' },
  { icon: '🧪', label: '78 tests passing',             sub: 'Full algorithm coverage' },
  { icon: '🦋', label: '6 teen protections added',    sub: 'Age-aware + crisis routing' },
  { icon: '🚀', label: 'Live API connected',           sub: 'FastAPI + YouTube integration' },
];

const CARDS = [
  {
    label: 'Algorithm Output',
    desc: 'Improved vs baseline metric comparison across 100 runs',
    src: '/screenshots/algorithm-output.png',
    alt: 'Algorithm output comparison',
    imgDesc: 'Algorithm output comparison',
  },
  {
    label: 'Dataset Exploration',
    desc: 'Processing and validating the VK-LSVD social media dataset',
    src: '/screenshots/dataset-exploration.png',
    alt: 'Dataset exploration',
    imgDesc: 'Dataset exploration',
  },
  {
    label: 'Research Notes',
    desc: 'Mapping published findings to algorithmic interventions',
    src: '/screenshots/research-notes.png',
    alt: 'Research notes',
    imgDesc: 'Research notes',
  },
  {
    label: 'Live Demo Running',
    desc: 'FastAPI server + React frontend working end-to-end',
    src: '/screenshots/live-demo.png',
    alt: 'Live demo running',
    imgDesc: 'Live demo running',
  },
];

export function Journey() {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section id="journey" className="py-32 px-8 lg:px-16 overflow-hidden">
      <div className="max-w-7xl mx-auto flex flex-col gap-16" ref={ref}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="flex flex-col gap-4"
        >
          <span className="section-badge liquid-glass self-start">The Journey</span>
          <h2 className="font-heading text-5xl md:text-6xl text-foreground leading-[0.9] tracking-[-2px] max-w-xl">
            From idea to algorithm.
          </h2>
          <p className="font-body font-light text-base text-foreground/55 max-w-lg">
            Every milestone in the build — the research, the code, the failures, the breakthroughs.
          </p>
        </motion.div>

        {/* Timeline grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {MILESTONES.map(({ icon, label, sub }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              className="liquid-glass rounded-xl p-4 flex flex-col gap-3 group hover:scale-[1.02] transition-transform duration-200"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{icon}</span>
                <span className="font-body text-xs text-foreground/35 font-medium">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-body font-medium text-sm text-foreground/80 leading-snug">{label}</p>
                <p className="font-body font-light text-xs text-foreground/45">{sub}</p>
              </div>
              {/* Iridescent bottom accent */}
              <div
                className="h-0.5 rounded-full opacity-0 group-hover:opacity-60 transition-opacity duration-300"
                style={{ background: 'linear-gradient(90deg, #a78bfa, #67e8f9)' }}
              />
            </motion.div>
          ))}
        </div>

        {/* Screenshot gallery — stylized cards since we don't have real screenshots */}
        <div className="flex flex-col gap-6">
          <p className="font-body text-xs font-medium text-foreground/40 uppercase tracking-wider">
            Build snapshots
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {CARDS.map(({ label, desc, src, alt, imgDesc }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.55, delay: 0.3 + i * 0.08 }}
                className="liquid-glass rounded-2xl overflow-hidden aspect-square flex flex-col"
              >
                {/* Screenshot area */}
                <div className="relative flex-1">
                  <img
                    src={src}
                    alt={alt}
                    className="w-full h-full object-cover rounded-xl"
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                  />
                  <div className="hidden w-full h-full items-center justify-center rounded-xl bg-white/20 border border-white/30">
                    <p className="font-body text-xs text-foreground/50 text-center px-4">{imgDesc}</p>
                  </div>
                </div>
                {/* Caption */}
                <div className="p-3 flex flex-col gap-0.5">
                  <p className="font-body font-medium text-xs text-foreground/70">{label}</p>
                  <p className="font-body font-light text-xs text-foreground/40 leading-snug">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
