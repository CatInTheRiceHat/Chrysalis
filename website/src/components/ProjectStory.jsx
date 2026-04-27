import { useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { Brain, Zap, FlaskConical, TrendingUp } from 'lucide-react';

function CountUp({ target, suffix = '', inView }) {
  const ref = useRef(null);
  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0, y: 8 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="font-heading text-4xl md:text-5xl iridescent-text"
    >
      {target}{suffix}
    </motion.span>
  );
}

function Block({ icon: Icon, badge, heading, body, children, flip, delay }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center ${flip ? 'lg:grid-flow-col-dense' : ''}`}
    >
      {/* Text */}
      <div className={`flex flex-col gap-5 ${flip ? 'lg:col-start-2' : ''}`}>
        <span className="section-badge liquid-glass self-start">
          <Icon className="w-3 h-3" />
          {badge}
        </span>
        <h3 className="font-heading text-3xl md:text-4xl text-foreground leading-[0.95] tracking-[-0.5px]">
          {heading}
        </h3>
        <p className="font-body font-light text-base text-foreground/60 leading-relaxed">
          {body}
        </p>
      </div>

      {/* Visual */}
      <div className={flip ? 'lg:col-start-1' : ''}>
        {children}
      </div>
    </motion.div>
  );
}

const HARMS = [
  { icon: '📱', label: 'Doomscrolling',        sub: 'Passive streak decay',        tint: '#a78bfa' },
  { icon: '🪞', label: 'Body comparison',      sub: 'Similarity mindset modifier', tint: '#f0abfc' },
  { icon: '🌀', label: 'Filter bubbles',        sub: 'Gini-coefficient diversity',  tint: '#67e8f9' },
  { icon: '😢', label: 'Emotional contagion',   sub: 'Valence tracking',            tint: '#fda4af' },
  { icon: '🚨', label: 'Crisis rabbit holes',   sub: 'Wellness injection',          tint: '#a7f3d0' },
  { icon: '🎯', label: 'Viral amplification',   sub: 'Rabbit hole interrupt',       tint: '#818cf8' },
];

const METRICS = [
  { label: 'Prosocial content ratio', subtitle: 'Share of posts that build up rather than tear down', improved: '31%', baseline: '18%', pct: 72 },
  { label: 'Diversity@10', subtitle: 'How many different topics in your first 10 posts', improved: '6.4', baseline: '3.1', pct: 85 },
  { label: 'Max same-topic streak', subtitle: 'Longest unbroken run of the same topic (lower = better)', improved: '2', baseline: '8+', pct: 25, lower: true },
];

export function ProjectStory() {
  const rootRef = useRef(null);
  const inView  = useInView(rootRef, { once: true, margin: '-60px' });

  return (
    <section id="project" className="py-32 px-8 lg:px-16 overflow-hidden">
      <div className="max-w-7xl mx-auto flex flex-col gap-28" ref={rootRef}>

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="flex flex-col gap-4 items-center text-center"
        >
          <span className="section-badge liquid-glass">The Project</span>
          <h2 className="font-heading text-5xl md:text-6xl text-foreground leading-[0.9] tracking-[-2px] max-w-2xl">
            The problem. The research. The solution.
          </h2>
          <p className="font-body font-light text-base text-foreground/55 max-w-xl">
            How I went from "the algorithm is hurting people" to building a different one.
          </p>
        </motion.div>

        {/* ── Block 1: THE PROBLEM ── */}
        <Block
          icon={Brain}
          badge="The Problem"
          heading="Algorithms are designed to keep you scrolling."
          body="48% of teenagers say social media harms people their age. More than 1 in 10 show signs of problematic use. The reason isn't the content alone — it's the algorithm. Engagement-at-all-costs means anxiety, comparison, and doomscrolling are features, not bugs."
          delay={0}
          flip={false}
        >
          {/* Bar chart visual */}
          <div className="liquid-glass rounded-2xl p-6 flex flex-col gap-4">
            <p className="font-body text-xs font-medium text-foreground/40 uppercase tracking-wider">
              What traditional algorithms optimize for
            </p>
            {[
              { label: 'Watch time', pct: 95, color: '#fda4af' },
              { label: 'Clicks',     pct: 88, color: '#f0abfc' },
              { label: 'Shares',     pct: 72, color: '#a78bfa' },
              { label: 'Well-being', pct: 4,  color: '#67e8f9', muted: true },
            ].map(({ label, pct, color, muted }, i) => (
              <div key={label} className="flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className={`font-body text-sm ${muted ? 'text-foreground/40' : 'text-foreground/70'}`}>{label}</span>
                  <span className={`font-body text-sm font-medium ${muted ? 'text-foreground/30' : 'text-foreground/50'}`}>{pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-foreground/8 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={inView ? { width: `${pct}%` } : {}}
                    transition={{ duration: 1, delay: 0.3 + i * 0.08, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: color, opacity: muted ? 0.5 : 1 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Block>

        {/* ── Block 2: THE RESEARCH ── */}
        <Block
          icon={FlaskConical}
          badge="The Research"
          heading="Six documented harms. Six targeted fixes."
          body="The research pointed to six specific mechanisms through which recommendation algorithms harm teenage mental health. Chrysalis addresses each one with a targeted fix — not a content filter, but precise, tunable algorithmic interventions."
          delay={0.1}
          flip={true}
        >
          <div className="grid grid-cols-2 gap-3">
            {HARMS.map(({ icon, label, sub, tint }) => (
              <div
                key={label}
                className="rounded-xl p-4 flex flex-col gap-2 min-h-[100px]"
                style={{ background: `${tint}10`, border: `1px solid ${tint}25` }}
              >
                <span className="text-xl">{icon}</span>
                <p className="font-body font-medium text-sm text-foreground/80">{label}</p>
                <p className="font-body font-light text-xs text-foreground/45">{sub}</p>
              </div>
            ))}
          </div>
        </Block>

        {/* ── Block 3: THE SOLUTION ── */}
        <Block
          icon={Zap}
          badge="The Solution"
          heading="A multi-dimensional algorithm that actually cares."
          body="Instead of chasing a single engagement number, Chrysalis weighs four things at once: how relevant content is, how varied your feed is, whether what you're seeing builds you up or tears you down, and how risky it is. It also adapts in real time — based on your age, how long you've been scrolling, and the time of day."
          delay={0.1}
          flip={false}
        >
          {/* Formula card */}
          <div className="glass-card rounded-2xl p-6 flex flex-col gap-5">
            <p className="font-body text-xs font-medium text-foreground/40 uppercase tracking-wider">
              The scoring formula
            </p>
            <div
              className="font-mono text-sm text-foreground/80 leading-loose p-4 rounded-xl"
              style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.12)' }}
            >
              <span className="iridescent-text font-semibold">Score</span>
              {' = '}
              <span style={{ color: '#818cf8' }}>engagement</span>
              {' × w_e'}
              <br />
              {'      + '}
              <span style={{ color: '#67e8f9' }}>diversity</span>
              {' × w_d'}
              <br />
              {'      + '}
              <span style={{ color: '#a7f3d0' }}>prosocial</span>
              {' × w_p'}
              <br />
              {'      − '}
              <span style={{ color: '#fda4af' }}>risk</span>
              {' × w_r'}
              <br />
              {'      + active_boost'}
              <br />
              {'      + opinion_bonus'}
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Age-aware', color: '#a78bfa' },
                { label: 'Session-adaptive', color: '#67e8f9' },
                { label: 'Crisis-routing', color: '#fda4af' },
                { label: 'User-controllable', color: '#a7f3d0' },
              ].map(({ label, color }) => (
                <span
                  key={label}
                  className="rounded-full px-3 py-1 font-body text-xs font-medium"
                  style={{ background: `${color}18`, color, border: `1px solid ${color}40` }}
                >
                  {label}
                </span>
              ))}
            </div>
            <p className="font-body font-light text-xs text-foreground/35 italic leading-relaxed">
              In plain terms: every post gets a score that balances engagement with wellbeing — and the balance shifts depending on who's watching and when.
            </p>
          </div>
        </Block>

        {/* ── Block 4: THE RESULTS ── */}
        <Block
          icon={TrendingUp}
          badge="The Results"
          heading="The numbers don't lie."
          body="Tested against a real social media dataset with a baseline engagement-only algorithm as the control. Chrysalis consistently outperforms on every well-being metric while maintaining content discovery quality."
          delay={0.1}
          flip={true}
        >
          <div className="flex flex-col gap-4">
            {METRICS.map(({ label, subtitle, improved, baseline, pct, lower }) => (
              <div key={label} className="liquid-glass rounded-xl p-5 flex flex-col gap-3">
                <div className="flex flex-col gap-0.5">
                  <p className="font-body text-sm font-medium text-foreground/70">{label}</p>
                  {subtitle && <p className="font-body text-xs text-foreground/35">{subtitle}</p>}
                </div>
                <div className="flex items-end justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="font-body text-xs text-foreground/40 mb-1">Baseline</span>
                    <span className="font-heading text-xl text-foreground/40">{baseline}</span>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full bg-foreground/10" />
                    <span className="font-body text-xs text-foreground/30">→</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-body text-xs text-foreground/40 mb-1">Chrysalis</span>
                    <span className="font-heading text-2xl iridescent-text">{improved}</span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-1 rounded-full bg-foreground/8 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={inView ? { width: `${lower ? 100 - pct : pct}%` } : {}}
                    transition={{ duration: 1.2, delay: 0.4, ease: 'easeOut' }}
                    className="h-full rounded-full metric-bar"
                  />
                </div>
              </div>
            ))}
          </div>
        </Block>

      </div>
    </section>
  );
}
