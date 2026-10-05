const services = [
  {
    number: "01",
    icon: "✎",
    title: "Brand & Visual Design",
    description:
      "Logos, brand systems, print design and visual identities that stand out.",
  },
  {
    number: "02",
    icon: "▣",
    title: "Web Design & Development",
    description:
      "Modern, responsive websites built for performance and great user experience.",
  },
  {
    number: "03",
    icon: "⌁",
    title: "Marketing & Digital Content",
    description:
      "Social media, content strategy, campaigns and digital communication.",
  },
  {
    number: "04",
    icon: "⌕",
    title: "Creative Experiments",
    description:
      "Exploring ideas through UI, motion, code and design experiments.",
  },
];

export default function WhatIDo() {
  return (
    <section className="bg-[#080808] px-6 py-24 text-white md:px-12 md:py-28">

      <div className="mx-auto max-w-7xl">

        {/* Section Header */}
        <div className="grid gap-10 md:grid-cols-2 md:items-end">

          <div>
            <p className="mb-5 text-xs font-medium uppercase tracking-[0.2em] text-white/50">
              What I Do
            </p>

            <h2 className="max-w-xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
              How I Help Brands
              <br />
              and Businesses Grow
            </h2>
          </div>

          <div className="md:pb-1">
            <p className="max-w-sm text-sm leading-relaxed text-white/50">
              Design. Build. Market.
              <br />
              All under one creative roof.
            </p>
          </div>

        </div>


        {/* Services */}
        <div className="mt-16 grid border-t border-white/10 md:grid-cols-2 lg:grid-cols-4">

          {services.map((service) => (
            <article
              key={service.number}
              className="group border-b border-white/10 px-1 py-8 transition-all duration-300 hover:bg-white/[0.03] md:border-r md:px-6 md:first:pl-0 lg:border-b-0 lg:last:border-r-0"
            >

              {/* Icon */}
              <div className="mb-6 flex items-center justify-between">

                <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-lg text-[#FFB020] transition-all duration-300 group-hover:border-[#FFB020] group-hover:bg-[#FFB020] group-hover:text-black">
                  {service.icon}
                </span>

                <span className="text-xs text-white/30">
                  {service.number}
                </span>

              </div>


              {/* Title */}
              <h3 className="max-w-[220px] text-xl font-medium leading-tight transition-all duration-300 group-hover:translate-x-1 group-hover:text-[#FFB020]">
                {service.title}
              </h3>


              {/* Description */}
              <p className="mt-4 max-w-[240px] text-sm leading-relaxed text-white/45 transition-colors duration-300 group-hover:text-white/65">
                {service.description}
              </p>

            </article>
          ))}

        </div>

      </div>

    </section>
  );
}