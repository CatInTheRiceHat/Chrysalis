import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Menu, X } from 'lucide-react';

const SCROLL_LINKS = [
  { label: 'Problem', id: 'problem' },
  { label: 'Solution', id: 'solution' },
  { label: 'Project', id: 'project' },
  { label: 'Journey', id: 'journey' },
  { label: 'Future', id: 'future' },
  { label: 'Contact', id: 'contact' },
];

export function Navbar() {
  const [scrolled, setScrolled]   = useState(false);
  const [active, setActive]       = useState('');
  const [menuOpen, setMenuOpen]   = useState(false);
  const { pathname }              = useLocation();
  const navigate                  = useNavigate();
  const onDemo                    = pathname === '/demo';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const scrollTo = (id) => {
    setMenuOpen(false);
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

  const goHome = () => {
    setMenuOpen(false);
    navigate('/');
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, pathname === '/' ? 0 : 100);
  };

  return (
    <>
      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="fixed top-4 left-0 right-0 z-50 px-5 lg:px-14"
      >
        <div className="flex items-center justify-between">

          <button
            type="button"
            onClick={goHome}
            data-cursor="soft"
            className="liquid-glass rounded-full px-3 py-2 flex items-center gap-2 group"
            aria-label="Go to homepage"
          >
            <img
              src="/butterflylogo.png"
              alt=""
              className="w-8 h-8 object-contain"
              aria-hidden="true"
            />
            <span className="font-heading text-lg text-foreground tracking-tight pr-1">
              Chrysalis
            </span>
          </button>

          <div
            className="hidden xl:flex items-center gap-0.5 rounded-full px-1.5 py-1 transition-all duration-300"
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
                data-cursor="wide"
                className={`px-3.5 py-2 rounded-full text-sm font-body font-medium transition-all duration-200 ${
                  !onDemo && active === id
                    ? 'bg-white/80 text-foreground shadow-sm'
                    : 'text-foreground/60 hover:text-foreground hover:bg-white/40'
                }`}
              >
                {label}
              </button>
            ))}

            <Link
              to="/demo"
              data-cursor="wide"
              className={`px-3.5 py-2 rounded-full text-sm font-body font-medium transition-all duration-200 ${
                onDemo
                  ? 'bg-white/80 text-foreground shadow-sm'
                  : 'text-foreground/60 hover:text-foreground hover:bg-white/40'
              }`}
            >
              Demo
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollTo('contact')}
              data-cursor="soft"
              className="hidden sm:flex liquid-glass-strong rounded-full px-4 py-2 text-sm font-body font-medium text-foreground hover:scale-105 transition-transform duration-200"
            >
              Contact
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              data-cursor="soft"
              className="liquid-glass-strong rounded-full w-11 h-11 flex items-center justify-center text-foreground"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="nav-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
          >
            <motion.div
              className="nav-overlay__panel"
              initial={{ y: '-100%', borderRadius: '0 0 80px 80px' }}
              animate={{ y: 0, borderRadius: '0 0 36px 36px' }}
              exit={{ y: '-100%', borderRadius: '0 0 80px 80px' }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="nav-overlay__top">
                <div className="flex items-center gap-3">
                  <img src="/butterflylogo.png" alt="" className="w-9 h-9 brightness-0 invert" aria-hidden="true" />
                  <span className="font-heading text-2xl text-white">Chrysalis</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="nav-overlay__close"
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="nav-overlay__links">
                {SCROLL_LINKS.map(({ label, id }, index) => (
                  <motion.button
                    key={id}
                    type="button"
                    onClick={() => scrollTo(id)}
                    initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.5, delay: 0.12 + index * 0.05 }}
                  >
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    {label}
                  </motion.button>
                ))}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.48 }}
                >
                  <Link to="/demo" onClick={() => setMenuOpen(false)} className="nav-overlay__demo">
                    Open Demo
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
