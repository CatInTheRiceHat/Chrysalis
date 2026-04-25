import { useState, useEffect } from 'react';
import { motion } from 'motion/react';

const NAV_LINKS = [
  { label: 'Home',    id: 'home' },
  { label: 'About',   id: 'about' },
  { label: 'Project', id: 'project' },
  { label: 'Demo',    id: 'demo' },
  { label: 'Future',  id: 'future' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive]     = useState('home');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setActive(id);
  };

  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="fixed top-4 left-0 right-0 z-50 px-6 lg:px-14"
    >
      <div className="flex items-center justify-between">

        {/* ── Logo ── */}
        <button
          onClick={() => scrollTo('home')}
          className="flex items-center gap-2 group"
        >
          <img
            src="/butterflylogo.png"
            alt="Chrysalis butterfly"
            className="w-8 h-8 object-contain"
          />
          <span className="font-heading text-lg text-foreground tracking-tight">
            Chrysalis
          </span>
        </button>

        {/* ── Nav pill ── */}
        <div
          className="hidden md:flex items-center gap-0.5 rounded-full px-1.5 py-1 transition-all duration-300"
          style={{
            background: scrolled ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.45)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.80)',
            boxShadow: '0 4px 20px rgba(180,160,220,0.12)',
          }}
        >
          {NAV_LINKS.map(({ label, id }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className={`px-3.5 py-2 rounded-full text-sm font-body font-medium transition-all duration-200 ${
                active === id
                  ? 'bg-white/80 text-foreground shadow-sm'
                  : 'text-foreground/60 hover:text-foreground hover:bg-white/40'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Contact CTA ── */}
        <button
          onClick={() => scrollTo('contact')}
          className="liquid-glass-strong rounded-full px-4 py-2 text-sm font-body font-medium text-foreground hover:scale-105 transition-transform duration-200"
        >
          Contact
        </button>
      </div>
    </motion.nav>
  );
}
