import { projects } from "@/data/projects";
import WorkCard from "./WorkCard";

export default function SelectedWork() {
  return (
    <section className="bg-[#f5f5f0] px-6 py-24 md:px-12">

      {/* Section Header */}
      <div className="mx-auto flex max-w-7xl items-end justify-between">

        <div>
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-black/60">
            Selected Work
          </p>

          <h2 className="text-4xl font-semibold tracking-tight text-black md:text-6xl">
            Projects worth showing.
          </h2>
        </div>

        <button className="hidden text-sm text-black md:block">
          View All Projects →
        </button>

      </div>

      {/* Selected Projects */}
      <div className="mx-auto mt-12 grid max-w-7xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {projects.slice(0, 4).map((project) => (
          <WorkCard
            key={project.id}
            project={project}
          />
        ))}
      </div>

    </section>
  );
}