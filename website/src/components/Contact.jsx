import { useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { Github, Linkedin, Mail, Instagram, ArrowUpRight } from 'lucide-react';

const LINKS = [
  {
    icon: Github,
    label: 'GitHub',
    sub: 'See the code',
    href: 'https://github.com/elainec',   // ← update with real handle
    color: '#818cf8',
  },
  {
    icon: Linkedin,
    label: 'LinkedIn',
    sub: "Let's connect",
    href: 'https://linkedin.com/in/elainec', // ← update with real profile
    color: '#67e8f9',
  },
  {
    icon: Mail,
    label: 'Email',
    sub: 'Say hello',
    href: 'mailto:hello@elainec.com',       // ← update with real email
    color: '#f0abfc',
  },
  {
    icon: Instagram,
    label: 'Instagram',
    sub: 'Follow along',
    href: 'https://instagram.com/elainec',  // ← update with real handle
    color: '#fda4af',
  },
];

function ButterflyFooterIcon() {
  return (
    <svg width="32" height="26" viewBox="0 0 32 26" fill="none" aria-hidden="true">
      <path d="M16 13 C12 9 3 6 1 10 C-1 14 5 19 11 16 C13 15 15 14 16 13Z" fill="url(#fl1)" opacity="0.7"/>
      <path d="M16 13 C20 9 29 6 31 10 C33 14 27 19 21 16 C19 15 17 14 16 13Z" fill="url(#fl2)" opacity="0.7"/>
      <path d="M16 13 C13 16 4 17 2 14 C0 11 6 8 11.5 11 C13 12 15 13 16 13Z" fill="url(#fl3)" opacity="0.55"/>
      <path d="M16 13 C19 16 28 17 30 14 C32 11 26 8 20.5 11 C19 12 17 13 16 13Z" fill="url(#fl4)" opacity="0.55"/>
      <ellipse cx="16" cy="13" rx="0.8" ry="3.5" fill="#4a3060" opacity="0.5"/>
      <defs>
        <linearGradient id="fl1" x1="1" y1="10" x2="16" y2="13" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a78bfa"/><stop offset="1" stopColor="#67e8f9"/>
        </linearGradient>
        <linearGradient id="fl2" x1="31" y1="10" x2="16" y2="13" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f0abfc"/><stop offset="1" stopColor="#818cf8"/>
        </linearGradient>
        <linearGradient id="fl3" x1="2" y1="14" x2="16" y2="13" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fda4af"/><stop offset="1" stopColor="#a78bfa"/>
        </linearGradient>
        <linearGradient id="fl4" x1="30" y1="14" x2="16" y2="13" gradientUnits="userSpaceOnUse">
          <stop stopColor="#67e8f9"/><stop offset="1" stopColor="#f0abfc"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Contact() {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section id="contact" className="relative py-32 px-8 lg:px-16 gradient-mesh overflow-hidden">
      {/* Decorative orbs */}
      <div className="orb absolute w-72 h-72 opacity-30 pointer-events-none" style={{ top: '5%', right: '-6%', animationDelay: '1s' }} />
      <div className="orb absolute w-48 h-48 opacity-20 pointer-events-none" style={{ bottom: '10%', left: '-4%', animationDelay: '3.5s' }} />

      <div className="max-w-5xl mx-auto flex flex-col gap-16" ref={ref}>

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="flex flex-col gap-5 items-center text-center"
        >
          <span className="section-badge liquid-glass">Contact</span>
          <h2 className="font-heading text-6xl md:text-7xl text-foreground leading-[0.88] tracking-[-3px]">
            Let's talk.
          </h2>
          <p className="font-body font-light text-base text-foreground/55 max-w-md">
            Whether you're a researcher, a recruiter, or just someone who cares
            about the same things I do — I'd love to hear from you.
          </p>
        </motion.div>

        {/* Contact links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {LINKS.map(({ icon: Icon, label, sub, href, color }, i) => (
            <motion.a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.08 }}
              className="liquid-glass-strong rounded-2xl p-6 flex flex-col gap-4 group hover:scale-105 transition-transform duration-200"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: `${color}18`, border: `1px solid ${color}35` }}
              >
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="font-body font-medium text-sm text-foreground/80">{label}</p>
                <p className="font-body font-light text-xs text-foreground/45">{sub}</p>
              </div>
              <ArrowUpRight
                className="w-4 h-4 text-foreground/25 group-hover:text-foreground/60 transition-colors ml-auto mt-auto"
              />
            </motion.a>
          ))}
        </motion.div>

        {/* Footer bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex items-center justify-between pt-6"
          style={{ borderTop: '1px solid rgba(0,0,0,0.07)' }}
        >
          <p className="font-body font-light text-xs text-foreground/35">
            MorphoMedia © 2026 — Elaine Che
          </p>
          <div className="flex items-center gap-2">
            <ButterflyFooterIcon />
          </div>
        </motion.div>

      </div>
    </section>
  );
}
