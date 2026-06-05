import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'motion/react';

const REVEAL_SELECTOR = '[data-reveal-color], .ct-reveal-color';
const HOVER_SELECTOR = `a, button, [data-cursor], .glass-card, .liquid-glass, .liquid-glass-strong, ${REVEAL_SELECTOR}`;
export function CustomCursor() {
  const reduceMotion = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [variant, setVariant] = useState('idle');
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const smoothX = useSpring(x, { stiffness: 500, damping: 42, mass: 0.4 });
  const smoothY = useSpring(y, { stiffness: 500, damping: 42, mass: 0.4 });

  useEffect(() => {
    const query = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setEnabled(query.matches && !reduceMotion);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, [reduceMotion]);

  useEffect(() => {
    const root = document.documentElement;
    const query = window.matchMedia('(hover: hover) and (pointer: fine)');
    const updateMode = () => {
      root.classList.toggle('has-color-cursor', query.matches && !reduceMotion);
      root.classList.toggle('has-scroll-reveal', !query.matches && !reduceMotion);
    };

    updateMode();
    query.addEventListener('change', updateMode);
    return () => {
      query.removeEventListener('change', updateMode);
      root.classList.remove('has-color-cursor', 'has-scroll-reveal', 'is-reveal-active');
      root.style.removeProperty('--reveal-x');
      root.style.removeProperty('--reveal-y');
    };
  }, [reduceMotion]);

  useEffect(() => {
    if (enabled || reduceMotion) {
      return undefined;
    }

    const targets = Array.from(document.querySelectorAll(REVEAL_SELECTOR));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle('is-revealed', entry.isIntersecting);
        });
      },
      { rootMargin: '-18% 0px -22%', threshold: 0.08 },
    );

    targets.forEach((target) => observer.observe(target));
    return () => {
      observer.disconnect();
      targets.forEach((target) => target.classList.remove('is-revealed'));
    };
  }, [enabled, reduceMotion]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const root = document.documentElement;
    let revealTargets = Array.from(document.querySelectorAll(REVEAL_SELECTOR));
    let lastTargetRefresh = 0;

    const onMove = (event) => {
      x.set(event.clientX);
      y.set(event.clientY);
      root.classList.add('is-reveal-active');
      root.style.setProperty('--reveal-x', `${event.clientX}px`);
      root.style.setProperty('--reveal-y', `${event.clientY}px`);

      const now = performance.now();
      if (now - lastTargetRefresh > 1200) {
        revealTargets = Array.from(document.querySelectorAll(REVEAL_SELECTOR));
        lastTargetRefresh = now;
      }

      revealTargets.forEach((target) => {
        const rect = target.getBoundingClientRect();
        target.style.setProperty('--local-reveal-x', `${event.clientX - rect.left}px`);
        target.style.setProperty('--local-reveal-y', `${event.clientY - rect.top}px`);
      });

    };

    const onOver = (event) => {
      const target = event.target.closest(HOVER_SELECTOR);
      if (!target) {
        return;
      }
      setVariant(target.dataset.cursor || 'soft');
    };

    const onOut = (event) => {
      const target = event.target.closest(HOVER_SELECTOR);
      if (!target || target.contains(event.relatedTarget)) {
        return;
      }
      setVariant('idle');
    };

    const onLeaveWindow = () => {
      root.classList.remove('is-reveal-active');
      setVariant('idle');
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseleave', onLeaveWindow);
    document.addEventListener('mouseover', onOver);
    document.addEventListener('mouseout', onOut);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeaveWindow);
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout', onOut);
      root.classList.remove('is-reveal-active');
      root.style.removeProperty('--reveal-x');
      root.style.removeProperty('--reveal-y');
      revealTargets.forEach((target) => {
        target.style.removeProperty('--local-reveal-x');
        target.style.removeProperty('--local-reveal-y');
      });
    };
  }, [enabled, variant, x, y]);

  if (!enabled) {
    return null;
  }

  return (
    <>
      <motion.div
        aria-hidden="true"
        className={`custom-cursor custom-cursor--${variant}`}
        style={{ x: smoothX, y: smoothY }}
      >
        <span className="custom-cursor__aura" />
        <span className="custom-cursor__dot" />
      </motion.div>
    </>
  );
}
