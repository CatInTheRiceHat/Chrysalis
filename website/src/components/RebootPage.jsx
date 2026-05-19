import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion, useScroll, useTransform } from 'motion/react';
import {
  ArrowUpRight,
  Brain,
  Clock3,
  Database,
  Eye,
  Github,
  Linkedin,
  Mail,
  Moon,
  Route,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';

const wellbeingSignals = [
  ['Screen taper', 'Gradually reduces feed intensity instead of forcing a hard stop.'],
  ['Diversity lift', 'Balances repeated content loops with wider topic and creator exposure.'],
  ['Night guard', 'Softens high-stimulation content when sleep risk is highest.'],
  ['Crisis routing', 'Detects sharper harm signals and redirects toward safer surfaces.'],
];

const statRows = [
  ['2.5 hrs', 'Average daily teen social media use modeled as the baseline load.'],
  ['43%', 'Teens reporting social platforms can worsen mental health.'],
  ['4 modes', 'Ranking levers for time, diversity, timing, and safety.'],
];

const methodCards = [
  {
    eyebrow: '01 / Intake',
    title: 'Read the feed as a health signal.',
    body: 'Chrysalis scores each candidate post against engagement, repetition, timing, and user-defined wellbeing preferences.',
    icon: Database,
  },
  {
    eyebrow: '02 / Re-rank',
    title: 'Trade raw retention for better session shape.',
    body: 'The algorithm can still surface interesting posts, but it pays a penalty for loops that keep the user stuck.',
    icon: SlidersHorizontal,
  },
  {
    eyebrow: '03 / Explain',
    title: 'Show why the feed changed.',
    body: 'Every boost, mute, delay, or reroute should be visible enough for a teenager to understand and challenge.',
    icon: Eye,
  },
];

const buildNotes = [
  ['Algorithm', 'Wellbeing ranker, Gini diversity scoring, night mode protection.'],
  ['Backend', 'FastAPI service with testable scoring inputs and output explanations.'],
  ['Interface', 'React demo that makes ranking tradeoffs visible instead of invisible.'],
  ['Research', 'Mental health literature translated into product constraints.'],
];

function useDesktopFiling() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1025px)');
    const update = () => setIsDesktop(query.matches);

    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return isDesktop;
}

function Reveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 42, filter: 'blur(12px)' }}
      animate={inView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
      transition={{ duration: 0.72, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function SectionFrame({ id, tone = 'paper', label, children }) {
  const ref = useRef(null);
  const reduceMotion = useReducedMotion();
  const isDesktop = useDesktopFiling();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  const scale = useTransform(scrollYProgress, [0.48, 0.92], [1, 0.925]);
  const y = useTransform(scrollYProgress, [0.48, 1], [0, -42]);
  const rotateX = useTransform(scrollYProgress, [0.52, 0.96], [0, -3.5]);
  const blur = useTransform(scrollYProgress, [0.58, 0.96], [0, 7]);
  const opacity = useTransform(scrollYProgress, [0.72, 1], [1, 0.24]);
  const filter = useTransform(blur, (value) => `blur(${value}px)`);
  const depthShadow = useTransform(
    scrollYProgress,
    [0, 0.55, 1],
    [
      '0 0 0 rgba(23, 36, 32, 0)',
      '0 -18px 42px rgba(23, 36, 32, 0.08)',
      '0 -34px 86px rgba(23, 36, 32, 0.18)',
    ],
  );
  const filingStyle = reduceMotion || !isDesktop
    ? undefined
    : { scale, y, rotateX, filter, opacity, boxShadow: depthShadow };

  return (
    <section id={id} ref={ref} className={`ct-section-shell ct-section-shell--${tone}`}>
      <motion.div
        className="ct-section"
        style={filingStyle}
      >
        <div className="ct-section__tab ct-reveal-color" aria-hidden="true">{label}</div>
        {children}
      </motion.div>
    </section>
  );
}

function MetricRows() {
  return (
    <div className="ct-metric-table">
      {statRows.map(([value, label]) => (
        <div className="ct-metric-row" key={value}>
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

function SignalCard({ signal, index }) {
  const [title, body] = signal;

  return (
    <motion.article
      className="ct-signal-card ct-reveal-color"
      initial={{ opacity: 0, y: 34 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.58, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      <span>{String(index + 1).padStart(2, '0')}</span>
      <h3>{title}</h3>
      <p>{body}</p>
    </motion.article>
  );
}

function HeroVisual() {
  return (
    <div className="ct-hero-visual" aria-hidden="true">
      <div className="ct-hero-orbit ct-hero-orbit--one ct-reveal-color" />
      <div className="ct-hero-orbit ct-hero-orbit--two ct-reveal-color" />
      <div className="ct-hero-orbit ct-hero-orbit--three ct-reveal-color" />
      <div className="ct-hero-canvas ct-reveal-color">
        <img src="/butterfly.png" alt="" />
      </div>
      <div className="ct-pulse-card ct-pulse-card--top ct-reveal-color">
        <span>Session load</span>
        <strong>-22%</strong>
      </div>
      <div className="ct-pulse-card ct-pulse-card--bottom ct-reveal-color">
        <span>Diversity index</span>
        <strong>0.71</strong>
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section id="home" className="ct-hero">
      <div className="ct-hero__grid">
        <Reveal className="ct-hero__copy">
          <span className="ct-kicker">Chrysalis Algorithm Project</span>
          <h1>Rewriting the feed.</h1>
          <p>
            A recommendation system that treats attention as something to protect:
            tapering screen time, widening content diversity, and making safety logic visible.
          </p>
          <div className="ct-hero__actions">
            <a href="#problem" className="ct-button" data-cursor="soft">
              Explore the system
              <ArrowUpRight size={17} />
            </a>
            <span className="ct-pagination">01 / 06</span>
          </div>
        </Reveal>
        <HeroVisual />
      </div>
    </section>
  );
}

function ProblemSection() {
  return (
    <SectionFrame id="problem" tone="aqua" label="Problem">
      <div className="ct-split">
        <Reveal className="ct-copy-block">
          <span className="ct-kicker ct-kicker--light">The Problem</span>
          <h2>The feed is already optimized. It is just optimized for the wrong outcome.</h2>
        </Reveal>
        <Reveal className="ct-copy-block ct-copy-block--narrow" delay={0.08}>
          <p>
            Most ranking systems are excellent at keeping a session alive. Chrysalis starts from
            a different question: what should the feed do when continued engagement is no longer
            good for the person using it?
          </p>
          <MetricRows />
        </Reveal>
      </div>
    </SectionFrame>
  );
}

function SolutionSection() {
  return (
    <SectionFrame id="solution" tone="paper" label="Solution">
      <div className="ct-section-grid">
        <Reveal className="ct-copy-block">
          <span className="ct-kicker">The Solution</span>
          <h2>A ranking model with friction, context, and a memory for harm.</h2>
          <p>
            Chrysalis does not pretend attention is neutral. It scores for usefulness and delight,
            then deliberately dampens loops that are repetitive, late-night, or emotionally risky.
          </p>
        </Reveal>
        <div className="ct-signal-grid">
          {wellbeingSignals.map((signal, index) => (
            <SignalCard key={signal[0]} signal={signal} index={index} />
          ))}
        </div>
      </div>
    </SectionFrame>
  );
}

function JourneySection() {
  return (
    <SectionFrame id="journey" tone="ink" label="Method">
      <div className="ct-method-layout">
        <Reveal className="ct-copy-block">
          <span className="ct-kicker ct-kicker--light">The Method</span>
          <h2>From research note to working algorithm.</h2>
        </Reveal>
        <div className="ct-method-deck">
          {methodCards.map(({ icon: Icon, ...card }, index) => (
            <motion.article
              className="ct-method-card ct-reveal-color"
              key={card.eyebrow}
              initial={{ opacity: 0, x: 64, rotate: 2 }}
              whileInView={{ opacity: 1, x: 0, rotate: 0 }}
              viewport={{ once: true, margin: '-70px' }}
              transition={{ duration: 0.64, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <div>
                <span>{card.eyebrow}</span>
                <Icon size={22} />
              </div>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </SectionFrame>
  );
}

function FutureSection() {
  return (
    <SectionFrame id="future" tone="paper" label="Future">
      <div className="ct-data-layout">
        <Reveal className="ct-data-collage">
          <div className="ct-data-image ct-data-image--large ct-reveal-color">
            <img src="/images/hero_bg.jpeg" alt="" />
          </div>
          <div className="ct-data-image ct-data-image--small ct-reveal-color">
            <img src="/butterfly.png" alt="" />
          </div>
          <div className="ct-data-terminal ct-reveal-color">
            <span>ranking_delta.json</span>
            <code>{'{"screen_time": -0.22, "diversity": +0.31, "risk": "softened"}'}</code>
          </div>
        </Reveal>
        <Reveal className="ct-copy-block" delay={0.12}>
          <span className="ct-kicker">What Comes Next</span>
          <h2>The prototype should become a transparent layer over real feeds.</h2>
          <p>
            The larger version of Chrysalis would sit between people and the platforms they already
            use, preserving creators while changing the logic that decides what comes next.
          </p>
          <div className="ct-note-list">
            {buildNotes.map(([title, body]) => (
              <div key={title}>
                <strong>{title}</strong>
                <span>{body}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </SectionFrame>
  );
}

function CreatorSection() {
  return (
    <SectionFrame id="creator" tone="aqua" label="Creator">
      <div className="ct-creator-layout">
        <Reveal className="ct-copy-block">
          <span className="ct-kicker ct-kicker--light">About the Creator</span>
          <h2>Built from the belief that care can be made measurable.</h2>
          <p>
            Chrysalis was designed and developed by Elaine Che as part critique, part prototype,
            and part proof that recommendation systems can be judged by more than retention.
          </p>
        </Reveal>
        <Reveal className="ct-profile-card ct-reveal-color" delay={0.12}>
          <div className="ct-profile-card__mark ct-reveal-color">
            <Sparkles size={28} />
          </div>
          <span>Creator & Developer</span>
          <h3>Elaine Che</h3>
          <div className="ct-profile-card__links">
            <a href="https://github.com/CatInTheRiceHat" target="_blank" rel="noopener noreferrer">
              <Github size={17} />
              GitHub
            </a>
            <a href="https://www.linkedin.com/in/elaine-che-03647530a/" target="_blank" rel="noopener noreferrer">
              <Linkedin size={17} />
              LinkedIn
            </a>
            <a href="mailto:elaineyouyuanche@gmail.com">
              <Mail size={17} />
              Email
            </a>
          </div>
        </Reveal>
      </div>
    </SectionFrame>
  );
}

function ContactSection() {
  return (
    <footer id="contact" className="ct-footer">
      <div className="ct-footer__heading">
        <span className="ct-kicker ct-kicker--light">Contact</span>
        <h2>Let’s build a healthier feed.</h2>
      </div>
      <div className="ct-footer__grid">
        {[
          ['Open demo', '/demo', Route],
          ['Email Elaine', 'mailto:elaineyouyuanche@gmail.com', Mail],
          ['View source', 'https://github.com/CatInTheRiceHat', Github],
        ].map(([label, href, Icon]) => (
          <a key={label} href={href} className="ct-footer-card ct-reveal-color">
            <Icon size={22} />
            <span>{label}</span>
            <ArrowUpRight size={18} />
          </a>
        ))}
      </div>
      <div className="ct-footer__bottom">
        <span>Chrysalis © 2026</span>
        <span>Algorithmic wellbeing prototype</span>
      </div>
    </footer>
  );
}

function SystemRail() {
  return (
    <aside className="ct-system-rail" aria-label="System summary">
      <div>
        <Brain size={18} className="ct-reveal-color" />
        <span>wellbeing ranker</span>
      </div>
      <div>
        <Clock3 size={18} className="ct-reveal-color" />
        <span>session taper</span>
      </div>
      <div>
        <Moon size={18} className="ct-reveal-color" />
        <span>night guard</span>
      </div>
      <div>
        <ShieldCheck size={18} className="ct-reveal-color" />
        <span>safety route</span>
      </div>
    </aside>
  );
}

export function RebootPage() {
  return (
    <main className="ct-page">
      <SystemRail />
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <JourneySection />
      <FutureSection />
      <CreatorSection />
      <ContactSection />
    </main>
  );
}
