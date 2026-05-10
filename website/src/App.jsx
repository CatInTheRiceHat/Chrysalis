import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Problem } from './components/Problem';
import { Solution } from './components/Solution';
import { Contact } from './components/Contact';
import { LiveDemo } from './components/LiveDemo';
import { IntroScreen } from './components/IntroScreen';
import { ProjectStory } from './components/ProjectStory';
import { Journey } from './components/Journey';
import { FutureVision } from './components/FutureVision';
import { CustomCursor } from './components/CustomCursor';
import './App.css';

function MainPage() {
  return (
    <>
      <Hero />
      <Problem />
      <Solution />
      <ProjectStory />
      <Journey />
      <FutureVision />
      <Contact />
    </>
  );
}

function App() {
  const [showIntro, setShowIntro] = useState(() => {
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
      <div className="bg-white min-h-screen overflow-x-hidden">
        <CustomCursor />
        <Navbar />
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/demo" element={<LiveDemo />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
