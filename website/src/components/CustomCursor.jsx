import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'motion/react';

const HOVER_SELECTOR = 'a, button, [data-cursor], .glass-card, .liquid-glass, .liquid-glass-strong';

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
    if (!enabled) {
      return undefined;
    }

    const onMove = (event) => {
      x.set(event.clientX);
      y.set(event.clientY);
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

    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseover', onOver);
    document.addEventListener('mouseout', onOut);

    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout', onOut);
    };
  }, [enabled, x, y]);

  if (!enabled) {
    return null;
  }

  return (
    <motion.div
      aria-hidden="true"
      className={`custom-cursor custom-cursor--${variant}`}
      style={{ x: smoothX, y: smoothY }}
    >
      <span className="custom-cursor__core" />
      <span className="custom-cursor__wing custom-cursor__wing--left" />
      <span className="custom-cursor__wing custom-cursor__wing--right" />
    </motion.div>
  );
}
