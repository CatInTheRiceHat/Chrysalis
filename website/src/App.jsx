import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Problem } from './components/Problem';
import { Solution } from './components/Solution';
import { Contact } from './components/Contact';
import { LiveDemo } from './components/LiveDemo';
import './App.css';

function MainPage() {
  return (
    <>
      <Hero />
      <Problem />
      <Solution />
      <Contact />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="bg-white min-h-screen overflow-x-hidden">
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
