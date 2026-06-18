import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Lenis from 'lenis';
import { AnimatePresence } from 'motion/react';
import { Navbar } from './components/Navbar';
import { IntroScreen } from './components/IntroScreen';
import { RebootPage } from './components/RebootPage';
import { ReelsPage } from './components/reels/ReelsPage';
import { AuthProvider } from './lib/AuthProvider';
import { AuthPage } from './components/profile/AuthPage';
import { ProfilePage } from './components/profile/ProfilePage';
import { EditProfileForm } from './components/profile/EditProfileForm';
import './App.css';
import './auth.css';

function MainPage() {
  return <RebootPage />;
}

// Standalone "app" routes render without the marketing Navbar / Lenis smooth
// scroll / intro overlay (same treatment as the /algorithm feed).
function isAppPath(pathname) {
  return (
    pathname === '/algorithm'
    || pathname === '/reels'
    || pathname === '/login'
    || pathname === '/signup'
    || pathname === '/profile'
    || pathname === '/profile/edit'
    || pathname.startsWith('/u/')
  );
}

function AppShell({ showIntro, setShowIntro }) {
  const { pathname } = useLocation();
  const isAlgorithmExperience = isAppPath(pathname);

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
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />
          <Route path="/profile" element={<ProfilePage mode="me" />} />
          <Route path="/profile/edit" element={<EditProfileForm />} />
          <Route path="/u/:username" element={<ProfilePage mode="public" />} />
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
      <AuthProvider>
        <AppShell showIntro={showIntro} setShowIntro={setShowIntro} />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
