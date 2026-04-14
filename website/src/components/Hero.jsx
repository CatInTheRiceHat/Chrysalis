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
      {/* ── Decorative background orbs ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="orb absolute w-64 h-64 opacity-40" style={{ top: '8%', right: '12%', animationDelay: '0s' }} />
        <div className="orb absolute w-40 h-40 opacity-30" style={{ bottom: '20%', left: '5%', animationDelay: '2s' }} />
        <div className="orb absolute w-24 h-24 opacity-25" style={{ top: '55%', right: '28%', animationDelay: '4s' }} />
      </div>

      {/* ── Main layout ── */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-8 lg:px-16 pt-32 pb-20">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-0">

          {/* ── Text column ── */}
          <div className="flex-1 flex flex-col items-start gap-7">

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <span className="section-badge liquid-glass">
                <span className="iridescent-text font-semibold">✦</span>
                A new kind of algorithm
              </span>
            </motion.div>

            {/* Headline */}
            <div className="max-w-2xl">
              <BlurText
                text="Social Media Was Broken. So I Fixed the Algorithm."
                className="font-heading italic text-5xl md:text-6xl lg:text-7xl leading-[0.88] tracking-[-2px] text-foreground"
                delay={120}
                direction="bottom"
              />
            </div>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, filter: 'blur(8px)', y: 16 }}
              animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
              transition={{ duration: 0.7, delay: 0.85, ease: 'easeOut' }}
              className="font-body font-light text-base md:text-lg text-foreground/60 max-w-lg leading-relaxed"
            >
              MorphoMedia is a recommendation engine built on research,
              designed for teenagers, and engineered to make you feel
              better&mdash;not worse.
            </motion.p>

            {/* CTA row */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.1, ease: 'easeOut' }}
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
              transition={{ duration: 0.8, delay: 1.4 }}
              className="flex items-center gap-8 pt-4 flex-wrap"
            >
              {[
                { val: '78', label: 'tests passing' },
                { val: '6', label: 'protection mechanisms' },
                { val: '4×', label: 'scoring dimensions' },
              ].map(({ val, label }) => (
                <div key={label} className="flex flex-col">
                  <span className="font-heading italic text-2xl iridescent-text">{val}</span>
                  <span className="font-body font-light text-xs text-foreground/45 mt-0.5">{label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* ── Butterfly column ── */}
          <div className="flex-1 flex justify-center lg:justify-end items-center relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              {/* Glow halo behind butterfly */}
              <div
                className="absolute inset-0 rounded-full opacity-40 blur-3xl pointer-events-none"
                style={{
                  background: 'radial-gradient(circle, hsla(280,80%,85%,0.6) 0%, hsla(185,80%,85%,0.3) 50%, transparent 70%)',
                  transform: 'scale(1.3)',
                }}
              />
              <ButterflyCanvas size={480} />
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── Scroll indicator ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-foreground/30"
      >
        <span className="font-body text-xs tracking-widest uppercase">scroll</span>
        <div className="scroll-line" />
        <ChevronDown className="w-3 h-3 animate-bounce" />
      </motion.div>
    </section>
  );
}
