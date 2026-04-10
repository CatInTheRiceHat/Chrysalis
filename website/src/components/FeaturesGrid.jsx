import { Zap, Palette, BarChart3, Shield } from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Days, Not Months',
    description:
      "Concept to launch at a pace that redefines fast. Because waiting isn't a strategy."
  },
  {
    icon: Palette,
    title: 'Obsessively Crafted',
    description:
      'Every pixel considered. Every element refined. Design so precise, it feels inevitable.'
  },
  {
    icon: BarChart3,
    title: 'Built to Convert',
    description:
      'Layouts informed by data. Decisions backed by performance. Results you can measure.'
  },
  {
    icon: Shield,
    title: 'Secure by Default',
    description:
      'Enterprise-grade protection comes standard. SSL, DDoS mitigation, compliance. All included.'
  }
];

export function FeaturesGrid() {
  return (
    <section className="py-24 px-4 bg-black">
      {/* Section Header */}
      <div className="text-center mb-16 max-w-3xl mx-auto">
        <div className="liquid-glass rounded-full px-3.5 py-1 text-xs font-medium text-white font-body inline-block mb-4">
          Why Us
        </div>
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading italic text-white tracking-tight leading-[0.9]">
          The difference is everything.
        </h2>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        {features.map((feature, index) => (
          <div
            key={index}
            className="liquid-glass rounded-2xl p-6 flex flex-col gap-4"
          >
            {/* Icon */}
            <div className="liquid-glass-strong rounded-full w-10 h-10 flex items-center justify-center text-white">
              <feature.icon className="w-5 h-5" />
            </div>

            {/* Title */}
            <h3 className="text-xl font-heading italic text-white">
              {feature.title}
            </h3>

            {/* Description */}
            <p className="text-white/60 font-body font-light text-sm leading-relaxed">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
