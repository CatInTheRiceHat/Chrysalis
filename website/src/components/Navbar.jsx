import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Menu, X } from 'lucide-react';

const SCROLL_LINKS = [
  { label: 'Problem', id: 'problem' },
  { label: 'Solution', id: 'solution' },
  { label: 'Journey', id: 'journey' },
  { label: 'Future', id: 'future' },
  { label: 'Creator', id: 'creator' },
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
        className={`ct-nav ${scrolled ? 'ct-nav--scrolled' : ''}`}
      >
        <div className="ct-nav__inner">

          <button
            type="button"
            onClick={goHome}
            data-cursor="soft"
            className="ct-nav__brand"
            aria-label="Go to homepage"
          >
            <img
              src="/butterflylogo.png"
              alt=""
              className="ct-nav__logo"
              aria-hidden="true"
            />
            <span>Chrysalis</span>
          </button>

          <div className="ct-nav__links">
            {SCROLL_LINKS.map(({ label, id }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                data-cursor="wide"
                className={!onDemo && active === id ? 'is-active' : ''}
              >
                {label}
              </button>
            ))}

            <Link
              to="/demo"
              data-cursor="wide"
              className={onDemo ? 'is-active' : ''}
            >
              Demo
            </Link>
          </div>

          <div className="ct-nav__actions">
            <button
              onClick={() => scrollTo('contact')}
              data-cursor="soft"
              className="ct-nav__contact"
            >
              Contact
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              data-cursor="soft"
              className="ct-nav__menu"
              aria-label="Open navigation menu"
            >
              <Menu size={19} />
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
                <div className="ct-overlay-brand">
                  <img src="/butterflylogo.png" alt="" aria-hidden="true" />
                  <span>Chrysalis</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="nav-overlay__close"
                  aria-label="Close navigation menu"
                >
                  <X size={19} />
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
