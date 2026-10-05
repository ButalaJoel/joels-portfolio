import Image from "next/image";


export default function About() {
  const tools = [
    { name: "Figma", icon: "F" },
    { name: "Illustrator", icon: "Ai" },
    { name: "Photoshop", icon: "Ps" },
    { name: "InDesign", icon: "Id" },
    { name: "Premiere Pro", icon: "Pr" },
    { name: "After Effects", icon: "Ae" },
    { name: "HTML", icon: "5" },
    { name: "CSS", icon: "3" },
    { name: "JavaScript", icon: "JS" },
    { name: "React", icon: "⚛" },
    { name: "Next.js", icon: "N" },
    { name: "Tailwind", icon: "≋" },
    { name: "Git", icon: "◆" },
    { name: "VS Code", icon: ">" },
  ];

  return (
    <section className="bg-[#f5f5f0] px-6 py-16 text-black md:px-10 md:py-20 lg:px-12">
      
      <div className="mx-auto max-w-7xl">

        {/* =========================
            SECTION LABEL
        ========================== */}
        <p className="mb-10 text-xs font-medium uppercase tracking-[0.2em] text-black/60">
          About Me
        </p>


        {/* =========================
            MAIN CONTENT
        ========================== */}
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.9fr_0.45fr] lg:gap-12">


          {/* =========================
              LEFT — ABOUT TEXT
          ========================== */}
          <div>

            <h2 className="max-w-xl text-4xl font-semibold leading-[0.98] tracking-[-0.04em] md:text-5xl lg:text-[52px]">
              I’m Joel, a multi-disciplinary creative with a passion for
              solving real problems.
            </h2>

            <p className="mt-7 max-w-lg text-base leading-relaxed text-black/60 md:text-lg">
              With a background in graphic design and marketing, and a growing
              focus on web development, I help brands communicate better and
              build meaningful digital experiences.
            </p>

            <a
              href="/about"
              className="mt-8 inline-flex items-center rounded-full border border-[#FFB020] px-6 py-3 text-sm font-medium transition-all duration-300 hover:bg-[#FFB020] hover:text-black"
            >
              More About Me
              <span className="ml-3 text-lg">→</span>
            </a>

          </div>


          {/* =========================
              CENTER — PHOTO
          ========================== */}
          <div className="relative mx-auto w-full max-w-lg">

            {/* Orange Shape */}
            <div className="absolute inset-x-8 bottom-0 top-10 rounded-3xl bg-[#FFB020]" />

            {/* Image */}
            <div className="relative z-10 overflow-hidden rounded-3xl">
              <Image
                src="/images/joel-hero.png"
                alt="Joel Butala"
                width={900}
                height={1100}
                className="h-auto w-full object-cover grayscale"
                priority
              />
            </div>

          </div>


          {/* =========================
              RIGHT — METRICS
          ========================== */}
          <div className="flex flex-col gap-5">

            {/* Projects */}
            <div className="rounded-2xl border border-black/10 bg-white/40 p-6">

              <p className="text-4xl font-semibold tracking-tight md:text-5xl">
                50+
              </p>

              <p className="mt-2 text-sm font-medium">
                Projects Completed
              </p>

              <div className="my-5 h-px bg-black/10" />

              <p className="text-sm leading-relaxed text-black/50">
                Delivering creative solutions that drive real results.
              </p>

            </div>


            {/* Experience */}
            <div className="rounded-2xl border border-black/10 bg-white/40 p-6">

              <p className="text-4xl font-semibold tracking-tight md:text-5xl">
                5+
              </p>

              <p className="mt-2 text-sm font-medium">
                Years of Experience
              </p>

              <div className="my-5 h-px bg-black/10" />

              <p className="text-sm leading-relaxed text-black/50">
                Helping brands grow through design, strategy and technology.
              </p>

            </div>

          </div>

        </div>


        {/* =========================
            TOOLS I USE
        ========================== */}
        <div className="mt-20 border-t border-black/10 pt-8">

          <div className="mb-6 flex items-center gap-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-black/60">
              Tools I Use
            </p>

            <div className="h-px flex-1 bg-black/10" />
          </div>


          <div className="grid grid-cols-4 gap-4 sm:grid-cols-7 lg:grid-cols-14">

            {tools.map((tool) => (
              <div
                key={tool.name}
                className="group flex flex-col items-center gap-2"
              >

                {/* Icon Box */}
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#111111] text-sm font-semibold text-white transition-transform duration-300 group-hover:-translate-y-1">
                  {tool.icon}
                </div>

                {/* Tool Name */}
                <p className="text-center text-[10px] font-medium text-black/60">
                  {tool.name}
                </p>

              </div>
            ))}

          </div>

        </div>

      </div>

    </section>
  );
}