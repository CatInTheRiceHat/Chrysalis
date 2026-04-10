import { ArrowUpRight } from 'lucide-react';
import logoIcon from '../assets/logo-icon.png';

export function Navbar() {
  return (
    <nav className="fixed top-4 left-0 right-0 z-50 px-8 lg:px-16 py-3">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <img src={logoIcon} alt="Logo" className="h-12 w-12" />

        {/* Navigation Links - Desktop Only */}
        <div className="hidden md:flex items-center gap-1 liquid-glass rounded-full px-1.5 py-1">
          {['Home', 'Services', 'Work', 'Process', 'Pricing'].map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase()}`}
              className="px-3 py-2 text-sm font-medium text-foreground/90 font-body hover:text-foreground transition-colors"
            >
              {link}
            </a>
          ))}
          <button className="bg-white text-black rounded-full px-3.5 py-1.5 text-sm font-medium flex items-center gap-1 hover:opacity-90 transition-opacity">
            Get Started
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </nav>
  );
}
