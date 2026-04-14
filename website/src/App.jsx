import { Navbar }       from './components/Navbar';
import { Hero }         from './components/Hero';
import { About }        from './components/About';
import { ProjectStory } from './components/ProjectStory';
import { LiveDemo }     from './components/LiveDemo';
import { Journey }      from './components/Journey';
import { FutureVision } from './components/FutureVision';
import { Contact }      from './components/Contact';
import './App.css';

function App() {
  return (
    <div className="bg-background min-h-screen overflow-x-hidden">
      <Navbar />
      <Hero />
      <About />
      <ProjectStory />
      <LiveDemo />
      <Journey />
      <FutureVision />
      <Contact />
    </div>
  );
}

export default App;
