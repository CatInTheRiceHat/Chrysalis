import { ArrowUpRight } from 'lucide-react';
import feature1Gif from '../assets/feature-1.gif';
import feature2Gif from '../assets/feature-2.gif';

export function FeaturesChess() {
  return (
    <section className="relative py-24 px-4 bg-black">
      {/* Section Header */}
      <div className="text-center mb-16">
        <div className="liquid-glass rounded-full px-3.5 py-1 text-xs font-medium text-white font-body inline-block mb-4">
          Capabilities
        </div>
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading italic text-white tracking-tight leading-[0.9]">
          Pro features. Zero complexity.
        </h2>
      </div>

      {/* Row 1 - Content Left / Image Right */}
      <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16 mb-24 max-w-6xl mx-auto">
        {/* Content */}
        <div className="flex-1 text-left">
          <h3 className="text-2xl md:text-3xl font-heading italic text-white mb-4">
            Designed to convert. Built to perform.
          </h3>
          <p className="text-white/60 font-body font-light text-sm md:text-base mb-6 leading-relaxed">
            Every pixel is intentional. Our AI studies what works across
            thousands of top sites--then builds yours to outperform them all.
          </p>
          <button className="liquid-glass-strong rounded-full px-5 py-2.5 flex items-center gap-2 text-white font-body font-medium hover:opacity-90 transition-opacity">
            Learn more
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Image */}
        <div className="flex-1 w-full">
          <div className="liquid-glass rounded-2xl overflow-hidden">
            <img
              src={feature1Gif}
              alt="Feature preview"
              className="w-full h-auto"
            />
          </div>
        </div>
      </div>

      {/* Row 2 - Content Right / Image Left (reversed) */}
      <div className="flex flex-col lg:flex-row-reverse items-center gap-8 lg:gap-16 max-w-6xl mx-auto">
        {/* Content */}
        <div className="flex-1 text-left">
          <h3 className="text-2xl md:text-3xl font-heading italic text-white mb-4">
            It gets smarter. Automatically.
          </h3>
          <p className="text-white/60 font-body font-light text-sm md:text-base mb-6 leading-relaxed">
            Your site evolves on its own. AI monitors every click, scroll, and
            conversion--then optimizes in real time. No manual updates. Ever.
          </p>
          <button className="liquid-glass-strong rounded-full px-5 py-2.5 flex items-center gap-2 text-white font-body font-medium hover:opacity-90 transition-opacity">
            See how it works
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Image */}
        <div className="flex-1 w-full">
          <div className="liquid-glass rounded-2xl overflow-hidden">
            <img
              src={feature2Gif}
              alt="Feature preview"
              className="w-full h-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
