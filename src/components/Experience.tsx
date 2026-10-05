export default function Experience() {
  const experiences = [
    {
      date: "2022 — Present",
      company: "Peacock Paints Ltd",
      role: "Marketing & Communications Manager",
      description:
        "Leading marketing, branding, content and communications strategies.",
    },
    {
      date: "2024 — Present",
      company: "Concrete Finisher UG",
      role: "Web Design & Development",
      description:
        "Designed and developed the official website and digital presence.",
    },
    {
      date: "2025 — Present",
      company: "IJ Gadgets",
      role: "Brand Owner",
      description:
        "Running a gaming hub business focused on consoles, accessories and repairs.",
    },
    {
      date: "2026 — Present",
      company: "Nova Works",
      role: "Founder",
      description:
        "Building a creative studio helping brands with design, digital and growth.",
    },
  ];

  return (
    <section className="bg-[#111111] px-6 py-20 text-white md:px-10 md:py-24 lg:px-12">
      <div className="mx-auto max-w-7xl">

        {/* Section Header */}
        <div className="mb-14 flex items-end justify-between">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/60">
            Experience
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">

          {/* Horizontal Line */}
          <div className="absolute left-0 right-0 top-[7px] hidden h-px bg-white/20 lg:block" />

          {/* Experience Items */}
          <div className="grid gap-12 lg:grid-cols-4 lg:gap-8">
            {experiences.map((experience, index) => (
              <div key={experience.company} className="relative">

                {/* Timeline Dot */}
                <div className="mb-8 flex items-center lg:mb-7">
                  <div className="relative z-10 h-3 w-3 rounded-full bg-[#FFB020]" />
                </div>

                {/* Date */}
                <p className="mb-4 text-xs text-white/50">
                  {experience.date}
                </p>

                {/* Company */}
                <h3 className="text-lg font-medium tracking-tight">
                  {experience.company}
                </h3>

                {/* Role */}
                <p className="mt-1 text-sm text-white/60">
                  {experience.role}
                </p>

                {/* Description */}
                <p className="mt-6 max-w-xs text-sm leading-relaxed text-white/50">
                  {experience.description}
                </p>

              </div>
            ))}
          </div>

        </div>

      </div>
    </section>
  );
}