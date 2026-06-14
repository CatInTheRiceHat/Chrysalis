import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Lenis from 'lenis';
import { AnimatePresence } from 'motion/react';
import { Navbar } from './components/Navbar';
import { IntroScreen } from './components/IntroScreen';
import { RebootPage } from './components/RebootPage';
import { ReelsPage } from './components/reels/ReelsPage';
import './App.css';

function MainPage() {
  return <RebootPage />;
}

function AppShell({ showIntro, setShowIntro }) {
  const { pathname } = useLocation();
  const isAlgorithmExperience = pathname === '/algorithm' || pathname === '/reels';

  useEffect(() => {
    if (isAlgorithmExperience) return undefined;
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
  }, [isAlgorithmExperience]);

  useEffect(() => {
    if (isAlgorithmExperience || typeof window === 'undefined' || !window.location.hash) {
      return;
    }
    const id = window.location.hash.slice(1);
    const timeout = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'auto' });
    }, 100);
    return () => clearTimeout(timeout);
  }, [isAlgorithmExperience]);

  return (
    <>
      <AnimatePresence>
        {showIntro && !isAlgorithmExperience && (
          <IntroScreen key="intro" onDone={() => setShowIntro(false)} />
        )}
      </AnimatePresence>
      <div className="min-h-screen overflow-x-hidden">
        {!isAlgorithmExperience && <Navbar />}
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/algorithm" element={<ReelsPage />} />
          <Route path="/reels" element={<Navigate to="/algorithm" replace />} />
        </Routes>
      </div>
    </>
  );
}

function App() {
  const [showIntro, setShowIntro] = useState(() => {
    if (
      typeof window !== 'undefined'
      && ['/algorithm', '/reels'].includes(window.location.pathname)
    ) {
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
