import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

const SCROLL_LINKS = [
  { label: 'About',    id: 'problem' },
  { label: 'Solution', id: 'solution' },
  { label: 'Contact',  id: 'contact' },
];

export function Navbar() {
  const [scrolled, setScrolled]   = useState(false);
  const [active, setActive]       = useState('');
  const { pathname }              = useLocation();
  const navigate                  = useNavigate();
  const onDemo                    = pathname === '/demo';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    if (pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
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

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <img
            src="/butterflylogo.png"
            alt="Chrysalis"
            className="w-8 h-8 object-contain"
          />
          <span className="font-heading text-lg text-foreground tracking-tight">
            Chrysalis
          </span>
        </Link>

        {/* Nav pill */}
        <div
          className="hidden md:flex items-center gap-0.5 rounded-full px-1.5 py-1 transition-all duration-300"
          style={{
            background: scrolled ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.60)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.80)',
            boxShadow: '0 4px 20px rgba(180,160,220,0.10)',
          }}
        >
          {SCROLL_LINKS.map(({ label, id }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className={`px-3.5 py-2 rounded-full text-sm font-body font-medium transition-all duration-200 ${
                !onDemo && active === id
                  ? 'bg-white/80 text-foreground shadow-sm'
                  : 'text-foreground/60 hover:text-foreground hover:bg-white/40'
              }`}
            >
              {label}
            </button>
          ))}

          {/* Demo — separate page link */}
          <Link
            to="/demo"
            className={`px-3.5 py-2 rounded-full text-sm font-body font-medium transition-all duration-200 ${
              onDemo
                ? 'bg-white/80 text-foreground shadow-sm'
                : 'text-foreground/60 hover:text-foreground hover:bg-white/40'
            }`}
          >
            Demo
          </Link>
        </div>

        {/* Contact CTA */}
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
