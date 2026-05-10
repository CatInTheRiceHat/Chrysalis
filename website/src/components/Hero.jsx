import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import ButterflyCanvas from './ButterflyCanvas';

const TAGLINES = [
  'Social Media Was Broken. So I Fixed the Algorithm.',
  "The Algorithm Didn't Care About You.",
  'What If Your Feed Actually Helped You?',
];

function CyclingHeadline() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex(i => (i + 1) % TAGLINES.length);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="max-w-2xl w-full" style={{ minHeight: '5.5rem' }}>
      <AnimatePresence mode="wait">
        <motion.h1
          key={index}
          initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -18, filter: 'blur(4px)' }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="font-heading text-5xl md:text-6xl lg:text-7xl leading-[0.88] tracking-[-2px] text-foreground"
        >
          {TAGLINES[index]}
        </motion.h1>
      </AnimatePresence>
    </div>
  );
}

export function Hero() {
  const heroRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 90, damping: 24 });
  const smoothY = useSpring(pointerY, { stiffness: 90, damping: 24 });
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const butterflyY = useTransform(scrollYProgress, [0, 1], [0, -160]);
  const butterflyX = useTransform(smoothX, [-1, 1], [-28, 28]);
  const butterflyTilt = useTransform(smoothX, [-1, 1], [-5, 5]);
  const butterflyLift = useTransform(smoothY, [-1, 1], [-22, 22]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const textBlur = useTransform(scrollYProgress, [0.55, 1], [0, 6]);
  const textFilter = useTransform(textBlur, (value) => `blur(${value}px)`);

  const scrollToProject = () => {
    document.getElementById('problem')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handlePointerMove = (event) => {
    if (reduceMotion) {
      return;
    }
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    pointerX.set(((event.clientX - rect.left) / rect.width - 0.5) * 2);
    pointerY.set(((event.clientY - rect.top) / rect.height - 0.5) * 2);
  };

  return (
    <section
      ref={heroRef}
      id="home"
      className="relative min-h-screen bg-white flex items-center overflow-hidden"
      onPointerMove={handlePointerMove}
    >
      {/* Parallax layer — butterfly drifts up as hero scrolls out */}
      <motion.div
        style={{
          y: butterflyY,
          x: reduceMotion ? 0 : butterflyX,
          rotate: reduceMotion ? 0 : butterflyTilt,
          position: 'absolute',
          right: 0,
          top: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        {/* Entrance fade */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="w-full h-full"
        >
          <motion.div
            className="absolute right-[-5%] top-1/2 -translate-y-1/2"
            style={{ pointerEvents: 'auto', y: reduceMotion ? 0 : butterflyLift }}
          >
            <ButterflyCanvas width={1100} height={700} />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* ── Main layout ── */}
      <motion.div
        className="relative w-full max-w-7xl mx-auto px-8 lg:px-16 pt-32 pb-20"
        style={{
          zIndex: 2,
          y: reduceMotion ? 0 : textY,
          filter: reduceMotion ? undefined : textFilter,
        }}
      >
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-0">

          {/* ── Text column ── */}
          <div className="flex-1 flex flex-col items-start gap-7">

            {/* Cycling headline */}
            <CyclingHeadline />

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
                data-cursor="soft"
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
      </motion.div>

    </section>
  );
}
