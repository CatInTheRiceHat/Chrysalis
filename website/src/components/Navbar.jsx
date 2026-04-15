import { useState, useEffect } from 'react';
import { motion } from 'motion/react';

const NAV_LINKS = [
  { label: 'Home',    id: 'home' },
  { label: 'About',   id: 'about' },
  { label: 'Project', id: 'project' },
  { label: 'Demo',    id: 'demo' },
  { label: 'Future',  id: 'future' },
];

function ButterflyIcon() {
  return (
    <svg width="22" height="18" viewBox="0 0 22 18" fill="none" aria-hidden="true">
      <path d="M11 9 C8 6 2 4 1 7 C0 10 4 13 8 11 C9.5 10.2 10.5 9.5 11 9Z" fill="url(#lg1)" opacity="0.85"/>
      <path d="M11 9 C14 6 20 4 21 7 C22 10 18 13 14 11 C12.5 10.2 11.5 9.5 11 9Z" fill="url(#lg2)" opacity="0.85"/>
      <path d="M11 9 C9 11 3 12 2 10 C1 8 5 6 8.5 8 C9.5 8.5 10.5 9 11 9Z" fill="url(#lg3)" opacity="0.7"/>
      <path d="M11 9 C13 11 19 12 20 10 C21 8 17 6 13.5 8 C12.5 8.5 11.5 9 11 9Z" fill="url(#lg4)" opacity="0.7"/>
      <ellipse cx="11" cy="9" rx="0.6" ry="2.5" fill="#4a3060" opacity="0.6"/>
      <defs>
        <linearGradient id="lg1" x1="1" y1="7" x2="11" y2="9" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a78bfa"/><stop offset="1" stopColor="#67e8f9"/>
        </linearGradient>
        <linearGradient id="lg2" x1="21" y1="7" x2="11" y2="9" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f0abfc"/><stop offset="1" stopColor="#818cf8"/>
        </linearGradient>
        <linearGradient id="lg3" x1="2" y1="10" x2="11" y2="9" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fda4af"/><stop offset="1" stopColor="#a78bfa"/>
        </linearGradient>
        <linearGradient id="lg4" x1="20" y1="10" x2="11" y2="9" gradientUnits="userSpaceOnUse">
          <stop stopColor="#67e8f9"/><stop offset="1" stopColor="#f0abfc"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

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
          className="flex items-center gap-2.5 group"
        >
          <ButterflyIcon />
          <span className="font-heading text-lg text-foreground tracking-tight">
            MorphoMedia
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
