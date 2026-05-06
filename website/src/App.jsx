import { Routes, Route, Outlet } from 'react-router-dom';
import { Navbar }       from './components/Navbar';
import { Hero }         from './components/Hero';
import { About }        from './components/About';
import { ProjectStory } from './components/ProjectStory';
import { LiveDemo }     from './components/LiveDemo';
import { Journey }      from './components/Journey';
import { FutureVision } from './components/FutureVision';
import { Contact }      from './components/Contact';
import './App.css';

function Layout() {
  return (
    <div className="bg-background min-h-screen overflow-x-hidden">
      <Navbar />
      <Outlet />
    </div>
  );
}

function FuturePage() {
  return <><FutureVision /><Journey /></>;
}

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/"        element={<Hero />} />
        <Route path="/about"   element={<About />} />
        <Route path="/project" element={<ProjectStory />} />
        <Route path="/demo"    element={<LiveDemo />} />
        <Route path="/future"  element={<FuturePage />} />
        <Route path="/contact" element={<Contact />} />
      </Route>
    </Routes>
  );
}

export default App;
