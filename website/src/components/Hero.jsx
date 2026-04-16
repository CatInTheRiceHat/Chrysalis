import { motion } from 'motion/react';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import ButterflyCanvas from './ButterflyCanvas';
import { BlurText } from './BlurText';

export function Hero() {
  const scrollToProject = () => {
    document.getElementById('project')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToDemo = () => {
    document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      id="home"
      className="relative min-h-screen gradient-mesh flex items-center overflow-hidden"
    >
      {/* ── Butterfly background layer ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, delay: 0.3 }}
        className="absolute right-0 top-0 w-full h-full pointer-events-none"
        style={{ zIndex: 1 }}
      >
        <div className="absolute right-[-5%] top-1/2 -translate-y-1/2">
          <ButterflyCanvas width={900} height={700} />
        </div>
      </motion.div>

{/* ── Main layout ── */}
      <div className="relative w-full max-w-7xl mx-auto px-8 lg:px-16 pt-32 pb-20" style={{ zIndex: 2 }}>
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-0">

          {/* ── Text column ── */}
          <div className="flex-1 flex flex-col items-start gap-7">

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <span className="section-badge-plain liquid-glass">
                <span className="font-semibold">✦</span>
                A new kind of algorithm
              </span>
            </motion.div>

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
              initial={{ opacity: 0, filter: 'blur(8px)', y: 16 }}
              animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
              className="font-body font-light text-base md:text-lg text-foreground/60 max-w-lg leading-relaxed"
            >
              Chrysalis is a recommendation engine built on research,
              designed for teenagers, and engineered to make you feel
              better&mdash;not worse.
            </motion.p>

            {/* CTA row */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45, ease: 'easeOut' }}
              className="flex items-center gap-5 flex-wrap"
            >
              <button
                onClick={scrollToProject}
                className="liquid-glass-strong rounded-full px-6 py-3 flex items-center gap-2 font-body font-medium text-sm text-foreground hover:scale-105 transition-transform duration-200"
              >
                See the Project
                <ArrowUpRight className="w-4 h-4" />
              </button>

              <button
                onClick={scrollToDemo}
                className="flex items-center gap-2 font-body font-light text-sm text-foreground/60 hover:text-foreground transition-colors group"
              >
                Try it live
                <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
              </button>
            </motion.div>

            {/* Stats strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.55 }}
              className="flex items-center gap-8 pt-4 flex-wrap"
            >
              {[
                { val: '78', label: 'tests passing' },
                { val: '6', label: 'protection mechanisms' },
                { val: '4×', label: 'scoring dimensions' },
              ].map(({ val, label }) => (
                <div key={label} className="flex flex-col">
                  <span className="font-heading text-2xl iridescent-text">{val}</span>
                  <span className="font-body font-light text-xs text-foreground/45 mt-0.5">{label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* ── Butterfly (spacer so text doesn't overlap) ── */}
          <div className="flex-1 hidden lg:block" />
        </div>
      </div>

      {/* ── Scroll indicator ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-foreground/30"
      >
        <span className="font-body text-xs tracking-widest uppercase">scroll</span>
        <div className="scroll-line" />
        <ChevronDown className="w-3 h-3 animate-bounce" />
      </motion.div>
    </section>
  );
}
