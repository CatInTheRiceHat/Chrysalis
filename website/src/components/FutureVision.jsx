import { useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { Globe, Plug, Eye, ArrowUpRight } from 'lucide-react';

const GOALS = [
  {
    icon: Globe,
    color: '#a78bfa',
    title: 'Open Platform',
    body: 'Make Chrysalis freely available — open-source code, open weights, open research. Anyone should be able to run a healthier feed without needing permission from a tech giant.',
  },
  {
    icon: Plug,
    color: '#67e8f9',
    title: 'Real Content Integration',
    body: 'Connect to real social feeds via APIs — Instagram, TikTok, YouTube — and reroute them through the Chrysalis algorithm in real time. The same content, a fundamentally different experience.',
  },
  {
    icon: Eye,
    color: '#f0abfc',
    title: 'Teen Transparency Dashboard',
    body: 'Give teenagers a live view of what their algorithm is doing: which mechanisms fired, why certain content appeared, and direct controls to adjust it. Transparency as a feature, not an afterthought.',
  },
];

export function FutureVision() {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section id="future" className="py-32 px-8 lg:px-16 gradient-mesh overflow-hidden">
      <div className="max-w-7xl mx-auto flex flex-col gap-14" ref={ref}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="flex flex-col gap-4 items-center text-center"
        >
          <span className="section-badge liquid-glass">What's Next</span>
          <h2 className="font-heading text-5xl md:text-6xl text-foreground leading-[0.9] tracking-[-2px] max-w-2xl">
            The algorithm is just the beginning.
          </h2>
          <p className="font-body font-light text-base text-foreground/55 max-w-xl">
            Chrysalis is a working prototype today. The goal is a real product —
            free, open, and in the hands of the teenagers who need it most.
          </p>
        </motion.div>

        {/* Goal cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {GOALS.map(({ icon: Icon, color, title, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 28 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.65, delay: 0.1 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="glass-card rounded-2xl p-7 flex flex-col gap-5 group hover:scale-[1.02] transition-transform duration-300"
            >
              {/* Icon */}
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{ background: `${color}20`, border: `1px solid ${color}40` }}
              >
                <Icon className="w-5 h-5" style={{ color }} />
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="font-heading text-2xl text-foreground">{title}</h3>
                <p className="font-body font-light text-sm text-foreground/60 leading-relaxed">{body}</p>
              </div>

              {/* Iridescent bottom line on hover */}
              <div
                className="h-px rounded-full opacity-0 group-hover:opacity-50 transition-opacity duration-400 mt-auto"
                style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}
              />
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="flex flex-col items-center gap-4 text-center pt-4"
        >
          <p className="font-body font-light text-base text-foreground/55">
            Want to help build it?
          </p>
          <button
            onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
            className="liquid-glass-strong rounded-full px-7 py-3 font-body font-medium text-sm text-foreground flex items-center gap-2 hover:scale-105 transition-transform duration-200"
          >
            Get in touch <ArrowUpRight className="w-4 h-4" />
          </button>
        </motion.div>

      </div>
    </section>
  );
}
