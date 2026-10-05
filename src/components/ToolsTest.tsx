const tools = [
  { name: "Figma", short: "F" },
  { name: "Illustrator", short: "Ai" },
  { name: "Photoshop", short: "Ps" },
  { name: "InDesign", short: "Id" },
  { name: "Premiere Pro", short: "Pr" },
  { name: "After Effects", short: "Ae" },
  { name: "HTML", short: "5" },
  { name: "CSS", short: "3" },
  { name: "JavaScript", short: "JS" },
  { name: "React", short: "⚛" },
  { name: "Next.js", short: "N" },
  { name: "Tailwind", short: "≈" },
  { name: "Git", short: "◆" },
  { name: "VS Code", short: ">" },
];

export default function ToolsTest() {
  return (
    <section className="bg-[#f5f5f0] px-6 py-10 text-black md:px-10 lg:px-12">
      <div className="mx-auto max-w-7xl">

        {/* Section Label */}
        <p className="mb-6 text-xs font-medium uppercase tracking-[0.2em] text-black/60">
          Tools I Use
        </p>

        {/* Tools */}
        <div className="flex flex-wrap gap-x-8 gap-y-6">
          {tools.map((tool) => (
            <div
              key={tool.name}
              className="flex w-12 flex-col items-center"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#111111] text-sm font-semibold text-white">
                {tool.short}
              </div>

              <p className="mt-2 text-[10px] text-black/60">
                {tool.name}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}