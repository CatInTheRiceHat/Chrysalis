import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import ButterflyCanvas from './ButterflyCanvas';
import { BlurText } from './BlurText';

export function Hero() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const butterflyY = useTransform(scrollYProgress, [0, 1], [0, -160]);

  const scrollToProject = () => {
    document.getElementById('problem')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      ref={heroRef}
      id="home"
      className="relative min-h-screen bg-white flex items-center overflow-hidden"
    >
      {/* Parallax layer — butterfly drifts up as hero scrolls out */}
      <motion.div
        style={{
          y: butterflyY,
          position: 'absolute',
          right: 0,
          top: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        {/* Entrance fade — separate from parallax so both work independently */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="w-full h-full"
        >
          <div className="absolute right-[-5%] top-1/2 -translate-y-1/2">
            <ButterflyCanvas width={1100} height={700} />
          </div>
        </motion.div>
      </motion.div>

      {/* ── Main layout ── */}
      <div className="relative w-full max-w-7xl mx-auto px-8 lg:px-16 pt-32 pb-20" style={{ zIndex: 2 }}>
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-0">

          {/* ── Text column ── */}
          <div className="flex-1 flex flex-col items-start gap-7">

            {/* Headline */}
            <div className="max-w-2xl">
              <BlurText
                text="Social Media Was Broken. So I Fixed the Algorithm."
                className="font-heading text-5xl md:text-6xl lg:text-7xl leading-[0.88] tracking-[-2px] text-foreground"
                delay={60}
                direction="bottom"
              />
            </div>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, filter: 'blur(8px)', y: 50, scale: 0.97 }}
              animate={{ opacity: 1, filter: 'blur(0px)', y: 0, scale: 1 }}
              transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="font-body font-light text-base md:text-lg text-foreground/60 max-w-lg leading-relaxed"
            >
              Chrysalis is a recommendation algorithm built from research on what social media
              actually does to young people — and redesigned from the ground up to do better.
            </motion.p>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 1.2, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-5 flex-wrap"
            >
              <motion.button
                onClick={scrollToProject}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="liquid-glass-strong rounded-full px-6 py-3 flex items-center gap-2 font-body font-medium text-sm text-foreground"
              >
                See the Project
                <ArrowUpRight className="w-4 h-4" />
              </motion.button>
            </motion.div>

          </div>

          {/* ── Butterfly spacer ── */}
          <div className="flex-1 hidden lg:block" />
        </div>
      </div>

    </section>
  );
}
