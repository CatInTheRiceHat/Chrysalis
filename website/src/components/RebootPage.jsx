import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AnimatePresence,
  motion as MOTION,
  useInView,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react';
import {
  ArrowUpRight,
  Award,
  Brain,
  ClipboardList,
  Code2,
  Droplets,
  Github,
  Linkedin,
  Mail,
  MessageCircle,
  Newspaper,
  Route,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import awardCertificateUrl from '../assets/award.png';
import sciencePosterUrl from '../assets/synopsys-poster.jpeg';

const originCards = [
  ['Science fair origin', 'Originally developed from MorphoMedia, my Synopsys science fair project.'],
  ['SPV award recognition', 'Recognized by SPV Market Research at the 2026 Synopsys Championship Science Fair.'],
  ['Full-stack prototype', 'Built as an interactive web demo with ranking logic people can actually test.'],
  ['MorphoMedia -> Chrysalis', 'A research question became a more personal digital wellbeing prototype.'],
];

const problemRows = [
  ['01', 'People often scroll when they are bored, stressed, tired, lonely, procrastinating, or trying not to feel something.'],
  ['02', 'Chrysalis does not blame teens for using social media or tell people to delete every app.'],
  ['03', 'It asks what would change if the algorithm cared about how someone feels after using it.'],
];

const journeySteps = [
  {
    title: 'Observation',
    body: 'Through journalism, I started paying attention to how technology, AI, social media, and school pressure shape student life. The more I reported and observed, the more I noticed that scrolling was not always just entertainment. Sometimes it was a way to cope, avoid, compare, or escape.',
    image: '/images/journey-egg.png',
    icon: Newspaper,
  },
  {
    title: 'MorphoMedia',
    body: 'I turned those questions into MorphoMedia, my Synopsys science fair project. The project explored whether recommendation systems could be redesigned around teen wellbeing instead of pure engagement.',
    image: '/images/journey-caterpillar.png',
    icon: Award,
  },
  {
    title: 'Chrysalis',
    body: 'After science fair, I rebuilt the idea as Chrysalis: a more interactive full-stack web prototype with Flutter Feed, Metamorph Mode, and Daily Dew.',
    image: '/images/journey-chrysalis.png',
    icon: Code2,
  },
  {
    title: 'Butterfly',
    body: 'The long-term vision is not to shame people off social media. It is to help people emerge from digital spaces with more agency, self-awareness, and self-respect.',
    image: '/images/journey-emerged.png',
    icon: Sparkles,
  },
];

const solutionModes = [
  {
    title: 'Flutter Feed',
    body: 'The familiar feed, re-ranked. It keeps the original scrolling experience but tunes the ranking logic for diversity, balance, and wellbeing instead of pure engagement.',
    icon: SlidersHorizontal,
  },
  {
    title: 'Metamorph Mode',
    body: 'A gentle taper that helps users step down from high-friction scrolling instead of forcing an abrupt cutoff.',
    icon: Sparkles,
  },
  {
    title: 'Daily Dew',
    body: 'A daily drop of curated posts that shifts attention toward more intentional, nourishing, or creative content.',
    icon: Droplets,
  },
];

const futureNotes = [
  ['Student feedback', 'Collect anonymous student input about scrolling patterns and support preferences.'],
  ['Demo testing', 'Test the interactive prototype with students and watch where explanations are unclear.'],
  ['Dataset', 'Improve the content dataset so recommendation tradeoffs feel less abstract.'],
  ['Transparency', 'Explain why posts are boosted, softened, delayed, or redirected.'],
  ['Metamorph Mode', 'Make tapering feel supportive, not controlling.'],
  ['Limits', 'Add clearer safety and limitation notes around what the prototype can and cannot do.'],
];

const futureArtifacts = [
  {
    title: 'MorphoMedia science fair poster',
    label: 'Science fair poster',
    src: sciencePosterUrl,
    previewSrc: sciencePosterUrl,
  },
  {
    title: 'SPV Market Research award certificate',
    label: 'Award certificate',
    src: awardCertificateUrl,
    previewSrc: awardCertificateUrl,
  },
];

function getJourneyStepPercent(index) {
  return journeySteps.length > 1
    ? 12 + (index / (journeySteps.length - 1)) * 76
    : 50;
}

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
    <MOTION.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 42, filter: 'blur(12px)' }}
      animate={inView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
      transition={{ duration: 0.72, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </MOTION.div>
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
      '0 0 0 rgba(43, 38, 49, 0)',
      '0 -18px 42px rgba(43, 38, 49, 0.08)',
      '0 -34px 86px rgba(43, 38, 49, 0.18)',
    ],
  );
  const filingStyle = reduceMotion || !isDesktop
    ? undefined
    : { scale, y, rotateX, filter, opacity, boxShadow: depthShadow };

  return (
    <section id={id} ref={ref} className={`ct-section-shell ct-section-shell--${tone}`}>
      <MOTION.div
        className="ct-section"
        style={filingStyle}
      >
        <div className="ct-section__tab ct-reveal-color" aria-hidden="true">{label}</div>
        {children}
      </MOTION.div>
    </section>
  );
}

function MetricRows() {
  return (
    <div className="ct-metric-table">
      {problemRows.map(([value, label]) => (
        <div className="ct-metric-row" key={value}>
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

function SignalCard({ signal, index }) {
  const { title, body, icon: ICON } = signal;

  return (
    <MOTION.article
      className="ct-signal-card ct-reveal-color"
      initial={{ opacity: 0, y: 34 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.58, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      <div>
        <span>{String(index + 1).padStart(2, '0')}</span>
        <ICON size={21} aria-hidden="true" />
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
    </MOTION.article>
  );
}

function ArtifactPreview({ artifact, onClose }) {
  useEffect(() => {
    if (!artifact) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [artifact, onClose]);

  return (
    <AnimatePresence>
      {artifact && (
        <MOTION.div
          className="ct-artifact-preview"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onMouseDown={onClose}
        >
          <MOTION.div
            className="ct-artifact-preview__panel"
            role="dialog"
            aria-modal="true"
            aria-label={`${artifact.title} preview`}
            initial={{ opacity: 0, y: 24, scale: 0.96, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 18, scale: 0.97, filter: 'blur(8px)' }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="ct-artifact-preview__close"
              aria-label="Close preview"
              onClick={onClose}
            >
              <X size={20} />
            </button>
            <img src={artifact.previewSrc || artifact.src} alt={artifact.title} />
            <span>{artifact.label}</span>
          </MOTION.div>
        </MOTION.div>
      )}
    </AnimatePresence>
  );
}

function clampUnit(value) {
  return Math.min(1, Math.max(-1, value));
}

function orbitArtifact(element, clientX, clientY, sectionRect) {
  const rect = element.getBoundingClientRect();
  const nx = clampUnit((clientX - (rect.left + rect.width / 2)) / (sectionRect.width / 2));
  const ny = clampUnit((clientY - (rect.top + rect.height / 2)) / (sectionRect.height / 2));

  element.style.setProperty('--tilt-x', `${(-ny * 8).toFixed(2)}deg`);
  element.style.setProperty('--tilt-y', `${(nx * 10).toFixed(2)}deg`);
  element.style.setProperty('--shift-x', `${(nx * 10).toFixed(2)}px`);
  element.style.setProperty('--shift-y', `${(ny * 8).toFixed(2)}px`);
}

function resetArtifactTilt(element) {
  element.style.setProperty('--tilt-x', '0deg');
  element.style.setProperty('--tilt-y', '0deg');
  element.style.setProperty('--shift-x', '0px');
  element.style.setProperty('--shift-y', '0px');
}

const heroVerbs = ['Rewriting', 'Changing', 'Improving', 'Diversifying', 'Rebalancing'];

function RotatingTitle() {
  const reduceMotion = useReducedMotion();
  const [verbIndex, setVerbIndex] = useState(0);

  useEffect(() => {
    if (reduceMotion) {
      return undefined;
    }

    const id = setInterval(() => {
      setVerbIndex((index) => (index + 1) % heroVerbs.length);
    }, 2500);
    return () => clearInterval(id);
  }, [reduceMotion]);

  return (
    <h1 aria-label="Rewriting the feed.">
      <span className="ct-hero-title__verb" aria-hidden="true">
        <AnimatePresence mode="wait" initial={false}>
          <MOTION.span
            key={heroVerbs[verbIndex]}
            initial={{ opacity: 0, y: '0.55em', filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: '-0.45em', filter: 'blur(10px)' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {heroVerbs[verbIndex]}
          </MOTION.span>
        </AnimatePresence>
      </span>
      <span className="ct-hero-title__rest" aria-hidden="true">the feed.</span>
    </h1>
  );
}

function HeroVisual() {
  return (
    <div className="ct-hero-visual">
      <div className="ct-hero-canvas ct-reveal-color" aria-hidden="true">
        <div className="ct-hero-butterfly">
          <img className="ct-hero-wing ct-hero-wing--left" src="/images/hero-butterfly.png" alt="" />
          <img className="ct-hero-wing ct-hero-wing--right" src="/images/hero-butterfly.png" alt="" />
          <img className="ct-hero-body" src="/images/hero-butterfly.png" alt="" />
        </div>
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section id="home" className="ct-hero">
      <HeroVisual />
      <div className="ct-hero__grid">
        <Reveal className="ct-hero__copy">
          <span className="ct-kicker">Teen-built digital wellbeing prototype</span>
          <RotatingTitle />
          <p>
            Chrysalis is a teen-built digital wellbeing prototype exploring how social media
            recommendation systems could support balance, self-awareness, and agency instead
            of only maximizing attention.
          </p>
          <p className="ct-origin-line">
            Originally developed from MorphoMedia, my Synopsys science fair project.
          </p>
          <div className="ct-hero__actions">
            <a href="#journey" className="ct-button" data-cursor="soft">
              Follow the story
              <ArrowUpRight size={17} />
            </a>
            <Link to="/demo" className="ct-button ct-button--ghost" data-cursor="soft">
              Try the demo
              <ArrowUpRight size={17} />
            </Link>
            <span className="ct-pagination">01 / 07</span>
          </div>
          <div className="ct-origin-grid" aria-label="Project origin highlights">
            {originCards.map(([title, body], index) => (
              <div className={`ct-origin-card ct-origin-card--${index + 1} ct-reveal-color`} key={title}>
                <span>{title}</span>
                <strong>{body}</strong>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function ProblemSection() {
  return (
    <SectionFrame id="problem" tone="aqua" label="Problem">
      <div className="ct-split">
        <Reveal className="ct-copy-block">
          <span className="ct-kicker ct-kicker--light">Problem</span>
          <h2>The feed is not neutral.</h2>
        </Reveal>
        <Reveal className="ct-copy-block ct-copy-block--narrow" delay={0.08}>
          <p>
            Social media is not just entertainment. People often scroll when they are bored,
            stressed, tired, lonely, procrastinating, or trying not to feel something.
            Chrysalis is not about blaming teens for using social media or telling people
            to delete every app. It asks a different question: what if the algorithm cared
            about how someone feels after using it, not just how long they stayed?
          </p>
          <MetricRows />
        </Reveal>
      </div>
    </SectionFrame>
  );
}

function JourneySection() {
  const ref = useRef(null);
  const reduceMotion = useReducedMotion();
  const isDesktop = useDesktopFiling();
  const [activeStep, setActiveStep] = useState(0);
  const [lockState, setLockState] = useState('before');
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });
  const progressScale = useTransform(scrollYProgress, [0.08, 0.92], [0, 1]);
  const shouldPin = isDesktop && !reduceMotion;
  const activeJourneyStep = journeySteps[activeStep];

  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    if (!shouldPin) {
      return;
    }

    const nextStep = Math.min(
      journeySteps.length - 1,
      Math.max(0, Math.floor(latest * journeySteps.length)),
    );
    const nextLockState = latest >= 0.995 ? 'after' : latest > 0.002 ? 'active' : 'before';

    setActiveStep((current) => (current === nextStep ? current : nextStep));
    setLockState((current) => (current === nextLockState ? current : nextLockState));
  });

  return (
    <section
      id="journey"
      ref={ref}
      className={`ct-journey-shell ct-journey-shell--${lockState} ct-section-shell ct-section-shell--paper`}
    >
      <div className="ct-journey-sticky ct-section">
        <div className="ct-section__tab ct-reveal-color" aria-hidden="true">Journey</div>
        <div className="ct-journey-layout">
          <Reveal className="ct-copy-block ct-journey-copy">
            <span className="ct-kicker">Journey</span>
            <h2>From observation to butterfly.</h2>
            <p>
              Chrysalis grew from the intersection of reporting, research, and building.
              Journalism helped me notice the human side of the problem. Science fair gave
              me a way to test the idea. Code helped me turn it into something people could
              actually interact with.
            </p>
          </Reveal>

          <div className="ct-journey-lock" aria-label="Chrysalis journey timeline">
            <div className="ct-journey-stage-art" aria-hidden="true">
              {journeySteps.map((step, index) => {
                const isActive = activeStep === index;

                return (
                  <MOTION.figure
                    className={`ct-journey-image ${isActive ? 'is-active' : ''}`}
                    key={step.title}
                    animate={{
                      opacity: isActive ? 1 : 0,
                      scale: isActive ? 1 : 0.88,
                      y: isActive ? 0 : 24,
                      filter: isActive ? 'blur(0px)' : 'blur(12px)',
                    }}
                    transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <img src={step.image} alt="" />
                  </MOTION.figure>
                );
              })}
            </div>

            <div className="ct-journey-caption" aria-live="polite">
              <span>{String(activeStep + 1).padStart(2, '0')} / {activeJourneyStep.title}</span>
              <MOTION.h3
                key={`${activeJourneyStep.title}-heading`}
                initial={shouldPin ? { opacity: 0, y: 18, filter: 'blur(8px)' } : false}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              >
                {activeJourneyStep.title}
              </MOTION.h3>
              <MOTION.p
                key={`${activeJourneyStep.title}-body`}
                initial={shouldPin ? { opacity: 0, y: 16 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.42, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              >
                {activeJourneyStep.body}
              </MOTION.p>
            </div>

            <div className="ct-journey-timeline" aria-hidden="true">
              <div className="ct-journey-progress">
                <MOTION.div
                  className="ct-journey-progress__fill"
                  style={{ scaleY: shouldPin ? progressScale : 1 }}
                />
              </div>

              <div className="ct-journey-nodes">
                {journeySteps.map((step, index) => {
                  const ICON = step.icon;
                  const isActive = activeStep === index;
                  const isPast = activeStep > index;
                  const stepPercent = getJourneyStepPercent(index);

                  return (
                    <MOTION.div
                      className={`ct-journey-node ${isActive ? 'is-active' : ''} ${isPast ? 'is-past' : ''}`}
                      key={step.title}
                      style={{ '--step-y': `${stepPercent}%` }}
                      animate={{
                        opacity: 1,
                        scale: isActive ? 1 : 0.92,
                      }}
                      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <span className="ct-journey-node__icon">
                        <ICON size={20} />
                      </span>
                      <span className="ct-journey-node__label">{step.title}</span>
                    </MOTION.div>
                  );
                })}
              </div>
            </div>

            <div className="ct-journey-stage-symbols" aria-hidden="true">
              {journeySteps.map((step, index) => (
                <MOTION.img
                  className={`ct-journey-stage-symbol ${activeStep === index ? 'is-active' : ''}`}
                  key={`${step.title}-symbol`}
                  src={step.image}
                  alt=""
                  animate={{
                    opacity: activeStep === index ? 1 : 0.36,
                    scale: activeStep === index ? 1.14 : 1,
                  }}
                  transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                />
              ))}
            </div>

            <div className="ct-journey-mobile-list">
              {journeySteps.map((step, index) => {
                const ICON = step.icon;

                return (
                  <article className="ct-journey-mobile-step" key={step.title}>
                    <div className="ct-journey-mobile-step__mark">
                      <ICON size={19} aria-hidden="true" />
                      <span>{String(index + 1).padStart(2, '0')}</span>
                    </div>
                    <img src={step.image} alt="" />
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.body}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SolutionSection() {
  return (
    <SectionFrame id="solution" tone="ink" label="Solution">
      <div className="ct-solution-layout">
        <Reveal className="ct-copy-block ct-solution-copy">
          <span className="ct-kicker">Solution</span>
          <h2>A prototype that tests a different design goal.</h2>
          <p>
            Chrysalis explores what a feed could do if it optimized for balance, variety,
            and agency. It simulates ranking choices that support healthier patterns without
            pretending to diagnose, treat, or solve every problem social media creates.
          </p>
        </Reveal>
        <div className="ct-mode-showcase">
          {solutionModes.map((mode, index) => (
            <SignalCard key={mode.title} signal={mode} index={index} />
          ))}
        </div>
      </div>
    </SectionFrame>
  );
}

function FutureSection() {
  const [previewArtifact, setPreviewArtifact] = useState(null);
  const closePreview = () => setPreviewArtifact(null);

  useEffect(() => {
    const shell = document.getElementById('future');
    if (!shell) {
      return undefined;
    }

    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const artifacts = () => Array.from(shell.querySelectorAll('.ct-data-image'));

    const onPointerMove = (event) => {
      if (event.pointerType === 'touch' || reduceQuery.matches) {
        return;
      }

      const sectionRect = shell.getBoundingClientRect();
      artifacts().forEach((element) => {
        orbitArtifact(element, event.clientX, event.clientY, sectionRect);
      });
    };
    const onPointerLeave = () => {
      artifacts().forEach(resetArtifactTilt);
    };

    shell.addEventListener('pointermove', onPointerMove);
    shell.addEventListener('pointerleave', onPointerLeave);

    return () => {
      shell.removeEventListener('pointermove', onPointerMove);
      shell.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

  return (
    <>
      <SectionFrame id="future" tone="paper" label="Future">
        <div className="ct-data-layout">
          <Reveal className="ct-data-collage">
            {futureArtifacts.map((artifact, index) => (
              <button
                type="button"
                className={`ct-data-image ct-data-image--${index === 0 ? 'poster' : 'certificate'} ct-reveal-color`}
                key={artifact.src}
                onClick={() => setPreviewArtifact(artifact)}
                aria-label={`Preview ${artifact.title}`}
                data-cursor="soft"
              >
                <img src={artifact.src} alt={artifact.title} />
              </button>
            ))}
          </Reveal>
          <Reveal className="ct-copy-block" delay={0.12}>
            <span className="ct-kicker">Future</span>
            <h2>More grounded, more transparent, and still honest about its limits.</h2>
            <p>
              Chrysalis is still a prototype. The next step is making it more grounded in
              real student experiences and more transparent about how its recommendations change.
            </p>
            <div className="ct-note-list">
              {futureNotes.map(([title, body]) => (
                <div key={title}>
                  <strong>{title}</strong>
                  <span>{body}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </SectionFrame>
      <ArtifactPreview artifact={previewArtifact} onClose={closePreview} />
    </>
  );
}

function CreatorSection() {
  return (
    <SectionFrame id="about" tone="aqua" label="About">
      <div className="ct-creator-layout">
        <Reveal className="ct-copy-block">
          <span className="ct-kicker ct-kicker--light">About</span>
          <h2>Built by Elaine.</h2>
          <p>
            I am Elaine Che, a student journalist, builder, and researcher interested in how
            technology shapes the way people think, feel, and live. As a journalist, I report
            on student life, media, AI, internet culture, and pressure. As a builder, I try
            to turn those observations into tools people can actually interact with.
          </p>
          <p>
            Chrysalis is where those two sides meet. It began as MorphoMedia, my Synopsys
            science fair project, and grew into a prototype about healthier recommendation
            systems. I am interested in building technology that does not just capture attention,
            but helps people understand themselves better.
          </p>
        </Reveal>
        <Reveal className="ct-profile-card ct-reveal-color" delay={0.12}>
          <div className="ct-profile-card__mark ct-reveal-color">
            <img src="/images/me.png" alt="Portrait of Elaine Che" />
          </div>
          <span>Student journalist, builder, researcher</span>
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
        <h2>Let us build a more humane feed.</h2>
      </div>
      <div className="ct-footer__grid">
        {[
          ['Open demo', '/demo', <Route size={22} aria-hidden="true" />],
          ['Email Elaine', 'mailto:elaineyouyuanche@gmail.com', <Mail size={22} aria-hidden="true" />],
          ['View source', 'https://github.com/CatInTheRiceHat', <Github size={22} aria-hidden="true" />],
        ].map(([label, href, icon]) => (
          <a key={label} href={href} className="ct-footer-card ct-reveal-color">
            {icon}
            <span>{label}</span>
            <ArrowUpRight size={18} />
          </a>
        ))}
      </div>
      <div className="ct-footer__bottom">
        <span>Chrysalis © 2026</span>
        <span>Teen-built recommendation systems prototype</span>
      </div>
    </footer>
  );
}

function SystemRail() {
  return (
    <aside className="ct-system-rail" aria-label="System summary">
      <div>
        <Newspaper size={18} className="ct-reveal-color" />
        <span>journalism</span>
      </div>
      <div>
        <Award size={18} className="ct-reveal-color" />
        <span>science fair</span>
      </div>
      <div>
        <Code2 size={18} className="ct-reveal-color" />
        <span>prototype</span>
      </div>
      <div>
        <ClipboardList size={18} className="ct-reveal-color" />
        <span>student input</span>
      </div>
      <div>
        <MessageCircle size={18} className="ct-reveal-color" />
        <span>agency</span>
      </div>
      <div>
        <Brain size={18} className="ct-reveal-color" />
        <span>wellbeing aware</span>
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
      <JourneySection />
      <SolutionSection />
      <FutureSection />
      <CreatorSection />
      <ContactSection />
    </main>
  );
}
