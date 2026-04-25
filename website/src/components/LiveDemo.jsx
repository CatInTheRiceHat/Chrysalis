import { useState, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'motion/react';
import { AlgorithmDemo } from './AlgorithmDemo';
import { CocoonMode }    from './CocoonMode';
import { MigrationMode } from './MigrationMode';

const TABS = [
  {
    id:       'algorithm',
    label:    'Algorithm',
    title:    'Try the algorithm.',
    subtitle: 'Configure and run the Chrysalis recommendation engine against a live dataset.',
  },
  {
    id:       'cocoon',
    label:    'Cocoon Mode',
    title:    'Start your taper.',
    subtitle: 'Enroll to gradually reduce daily screen time using exponential decay — 20% less each week.',
  },
  {
    id:       'migration',
    label:    'Migration Mode',
    title:    "Today's drops.",
    subtitle: 'Non-personalized daily drops curated for diversity and wellbeing. Same content for everyone.',
  },
];

export function LiveDemo() {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const [active, setActive] = useState('algorithm');

  const meta = TABS.find((t) => t.id === active);

  return (
    <section id="demo" className="py-32 px-8 lg:px-16 gradient-mesh overflow-hidden">
      <div className="max-w-7xl mx-auto flex flex-col gap-12" ref={ref}>

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="flex flex-col gap-5 items-center text-center"
        >
          <span className="section-badge liquid-glass">Interactive Demo</span>

          {/* Tab switcher — mirrors the Navbar pill pattern */}
          <div
            className="flex items-center gap-1 p-1.5 rounded-full"
            style={{
              background:           'rgba(255,255,255,0.55)',
              backdropFilter:       'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border:               '1px solid rgba(255,255,255,0.82)',
              boxShadow:            '0 4px 20px rgba(180,160,220,0.12)',
            }}
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                className={`rounded-full px-4 py-2 font-body text-sm font-medium transition-all duration-200 ${
                  active === tab.id
                    ? 'bg-white/80 text-foreground shadow-sm'
                    : 'text-foreground/50 hover:text-foreground hover:bg-white/40'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Title + subtitle cross-fade on tab switch */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 8,  filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0,  filter: 'blur(0px)' }}
              exit={{   opacity: 0, y: -8,  filter: 'blur(4px)' }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-2 items-center"
            >
              <h2 className="font-heading text-5xl md:text-6xl text-foreground leading-[0.9] tracking-[-2px]">
                {meta.title}
              </h2>
              <p className="font-body font-light text-base text-foreground/55 max-w-lg">
                {meta.subtitle}
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* ── Tab content ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.15 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{   opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              {active === 'algorithm' && <AlgorithmDemo />}
              {active === 'cocoon'    && <CocoonMode />}
              {active === 'migration' && <MigrationMode />}
            </motion.div>
          </AnimatePresence>
        </motion.div>

      </div>
    </section>
  );
}
