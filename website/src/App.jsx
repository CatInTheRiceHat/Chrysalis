import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Lenis from 'lenis';
import { AnimatePresence } from 'motion/react';
import { Navbar } from './components/Navbar';
import { AlgorithmPage } from './components/LiveDemo';
import { IntroScreen } from './components/IntroScreen';
import { RebootPage } from './components/RebootPage';
import './App.css';

function MainPage() {
  return <RebootPage />;
}

function App() {
  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.location.hash) {
      return;
    }
    const id = window.location.hash.slice(1);
    const timeout = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'auto' });
    }, 100);
    return () => clearTimeout(timeout);
  }, []);

  const [showIntro, setShowIntro] = useState(() => {
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
      <AnimatePresence>
        {showIntro && (
          <IntroScreen key="intro" onDone={() => setShowIntro(false)} />
        )}
      </AnimatePresence>
      <div className="min-h-screen overflow-x-hidden">
        <Navbar />
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/algorithm" element={<AlgorithmPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
