import { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { ArrowUpRight } from 'lucide-react';

export function CtaFooter() {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const src = 'https://stream.mux.com/8wrHPCX2dC3msyYU9ObwqNdm00u3ViXvOSHUMRYSEe5Q.m3u8';

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {});
      });
    }
  }, []);

  return (
    <section className="relative py-24 px-4 bg-black">
      {/* HLS Video Background */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Top Gradient Fade */}
      <div
        className="absolute top-0 left-0 right-0 h-[200px] z-10 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, black, transparent)'
        }}
      />

      {/* Bottom Gradient Fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[200px] z-10 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, black, transparent)'
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-4">
        {/* Heading */}
        <h2 className="text-5xl md:text-6xl lg:text-7xl font-heading italic text-white leading-[0.85] mb-6">
          Your next website starts here.
        </h2>

        {/* Subtext */}
        <p className="text-white/60 font-body font-light text-sm md:text-base max-w-lg mb-8">
          Book a free strategy call. See what AI-powered design can do. No
          commitment, no pressure. Just possibilities.
        </p>

        {/* Buttons */}
        <div className="flex items-center gap-4 mb-32">
          <button className="liquid-glass-strong rounded-full px-6 py-3 flex items-center gap-2 text-white font-body font-medium hover:opacity-90 transition-opacity">
            Book a Call
            <ArrowUpRight className="w-4 h-4" />
          </button>
          <button className="bg-white text-black rounded-full px-6 py-3 flex items-center gap-2 font-body font-medium hover:opacity-90 transition-opacity">
            View Pricing
          </button>
        </div>

        {/* Footer Bar */}
        <div className="mt-32 pt-8 border-t border-white/10 w-full max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="text-white/40 text-xs font-body">
            (c) 2026 Studio. All rights reserved.
          </span>
          <div className="flex items-center gap-6">
            <a
              href="/privacy"
              className="text-white/40 text-xs font-body hover:text-white/70 transition-colors"
            >
              Privacy
            </a>
            <a
              href="/terms"
              className="text-white/40 text-xs font-body hover:text-white/70 transition-colors"
            >
              Terms
            </a>
            <a
              href="/contact"
              className="text-white/40 text-xs font-body hover:text-white/70 transition-colors"
            >
              Contact
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
