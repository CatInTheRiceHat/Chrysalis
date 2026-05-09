import { useRef } from 'react';
import { motion, useInView } from 'motion/react';

export function Problem() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="problem" ref={ref} className="px-6 lg:px-20 py-28 lg:py-40">
      <div className="max-w-4xl">
        <motion.span
          initial={{ opacity: 0, x: -30 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="font-body text-sm uppercase tracking-widest text-foreground/40 mb-8 block"
        >
          The Problem
        </motion.span>

        <motion.h2
          initial={{ opacity: 0, y: 80, filter: 'blur(12px)' }}
          animate={inView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="font-heading text-6xl md:text-8xl text-foreground leading-[0.92] tracking-tight mb-10"
        >
          The feed is working exactly<br />
          as designed.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 40, filter: 'blur(8px)' }}
          animate={inView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
          transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="font-body font-light text-xl text-foreground/55 max-w-xl leading-relaxed"
        >
          Today's algorithms optimize for one metric: time on screen. The result is content
          engineered to spike dopamine, disrupt sleep, and leave you scrolling past empty.
        </motion.p>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={inView ? { scaleX: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: 'left' }}
          className="mt-16 h-px w-32 bg-gradient-to-r from-violet-400 via-cyan-300 to-pink-400 opacity-60"
        />
      </div>
    </section>
  );
}
