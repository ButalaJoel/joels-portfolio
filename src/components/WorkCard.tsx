type WorkCardProps = {
  project: {
    title: string;
    category: string;
    year: string;
    image: string;
  };
};

export default function WorkCard({ project }: WorkCardProps) {
  return (
    <article className="group">
      
      {/* Project Image */}
      <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-[#111] md:aspect-[4/3]">
        <img
          src={project.image}
          alt={project.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      {/* Project Information */}
      <div className="mt-4">
        <h3 className="text-lg font-medium text-black">
          {project.title}
        </h3>

        <p className="mt-1 text-sm text-black/60">
          {project.category}
        </p>

        <p className="mt-1 text-sm text-black/40">
          {project.year}
        </p>
      </div>

    </article>
  );
}