export function Testimonials() {
  const testimonials = [
    {
      quote:
        "A complete rebuild in five days. The result outperformed everything we'd spent months building before.",
      name: 'Sarah Chen',
      role: 'CEO, Luminary'
    },
    {
      quote:
        "Conversions up 4x. That's not a typo. The design just works differently when it's built on real data.",
      name: 'Marcus Webb',
      role: 'Head of Growth, Arcline'
    },
    {
      quote:
        "They didn't just design our site. They defined our brand. World-class doesn't begin to cover it.",
      name: 'Elena Voss',
      role: 'Brand Director, Helix'
    }
  ];

  return (
    <section className="py-24 px-4 bg-black">
      {/* Section Header */}
      <div className="text-center mb-16 max-w-3xl mx-auto">
        <div className="liquid-glass rounded-full px-3.5 py-1 text-xs font-medium text-white font-body inline-block mb-4">
          What They Say
        </div>
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading italic text-white tracking-tight leading-[0.9]">
          Don't take our word for it.
        </h2>
      </div>

      {/* Testimonials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {testimonials.map((testimonial, index) => (
          <div
            key={index}
            className="liquid-glass rounded-2xl p-8 flex flex-col gap-4"
          >
            {/* Quote */}
            <p className="text-white/80 font-body font-light text-sm italic leading-relaxed">
              "{testimonial.quote}"
            </p>

            {/* Name */}
            <span className="text-white font-body font-medium text-sm">
              {testimonial.name}
            </span>

            {/* Role */}
            <span className="text-white/50 font-body font-light text-xs">
              {testimonial.role}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
