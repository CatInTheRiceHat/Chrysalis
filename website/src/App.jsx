import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import { AnimatePresence } from 'motion/react';
import { Navbar } from './components/Navbar';
import { AlgorithmPage } from './components/LiveDemo';
import { IntroScreen } from './components/IntroScreen';
import { RebootPage } from './components/RebootPage';
import { ReelsPage } from './components/reels/ReelsPage';
import './App.css';

function MainPage() {
  return <RebootPage />;
}

function AppShell({ showIntro, setShowIntro }) {
  const { pathname } = useLocation();
  const isReels = pathname === '/reels';

  useEffect(() => {
    if (isReels) return undefined;
    const lenis = new Lenis();
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    const rafId = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, [isReels]);

  useEffect(() => {
    if (isReels || typeof window === 'undefined' || !window.location.hash) {
      return;
    }
    const id = window.location.hash.slice(1);
    const timeout = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'auto' });
    }, 100);
    return () => clearTimeout(timeout);
  }, [isReels]);

  return (
    <>
      <AnimatePresence>
        {showIntro && !isReels && (
          <IntroScreen key="intro" onDone={() => setShowIntro(false)} />
        )}
      </AnimatePresence>
      <div className="min-h-screen overflow-x-hidden">
        {!isReels && <Navbar />}
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/algorithm" element={<AlgorithmPage />} />
          <Route path="/reels" element={<ReelsPage />} />
        </Routes>
      </div>
    </>
  );
}

function App() {
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/reels') {
      return false;
    }
    if (typeof window !== 'undefined' && window.location.hash) {
      return false;
    }
    if (typeof window !== 'undefined' && sessionStorage.getItem('chrysalis-intro-seen')) {
      return false;
    }
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('chrysalis-intro-seen', '1');
    }
    return true;
  });

  return (
    <BrowserRouter>
      <AppShell showIntro={showIntro} setShowIntro={setShowIntro} />
    </BrowserRouter>
  );
}

export default App;
