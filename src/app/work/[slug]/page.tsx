
import Link from "next/link";
import { notFound } from "next/navigation";
import { projects } from "@/data/projects";
import LoopVideo from "./LoopVideo";
import MediaLightbox from "./MediaLightbox";
import "./project.css";

type ProjectPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return projects.map((project) => ({
    slug: project.slug,
  }));
}

export default async function ProjectPage({
  params,
}: ProjectPageProps) {
  const { slug } = await params;

  const project = projects.find(
    (item) => item.slug === slug
  );

  if (!project) {
    notFound();
  }

  const currentIndex = projects.findIndex(
    (item) => item.slug === project.slug
  );

  const nextProject =
    projects[(currentIndex + 1) % projects.length];

  return (
    <main className="project-page">

      {/* =========================
          PROJECT HERO
      ========================= */}

      <section className="project-hero">

        <div className="project-hero-top">

          <div>
            <p className="project-eyebrow">
              SELECTED PROJECT
            </p>

            <p className="project-index">
              {String(project.id).padStart(2, "0")} /{" "}
              {String(projects.length).padStart(2, "0")}
            </p>
          </div>

          <span className="project-year">
            {project.year}
          </span>

        </div>

        <div className="project-hero-content">

          <div className="project-hero-copy">

            <p className="project-category">
              {project.category}
            </p>

            <h1>
              {project.title}
            </h1>

            <p className="project-summary">
              A business that had the skill, but not yet the
              brand presence to match it. We built a clear,
              credible identity and digital presence that
              brought the business together in one place.
            </p>

          </div>

          <div className="project-hero-image">

            <img
              src={project.image}
              alt={`${project.title} project`}
            />

          </div>

        </div>

      </section>


      {/* =========================
          PROJECT OVERVIEW
      ========================= */}

      <section className="project-overview">

        <div className="project-section-label">

          <p className="project-eyebrow">
            THE PROJECT
          </p>

        </div>

        <div className="project-overview-content">

          <h2>
            Turning a business
            <br />
            into a brand.
          </h2>

          <p>
            Concrete Finisher UG existed as a service business,
            but its identity was scattered. Work, information
            and contact details were not organised in one
            reliable place, while images of completed projects
            could easily be found elsewhere and used by
            copycats posing as concrete finishers.
            <br />
            <br />
            The solution was to bring the business together
            under one recognisable identity and create a
            central digital home where clients could discover
            the company, understand its services, see its work
            and get in touch.
          </p>

        </div>

      </section>


      {/* =========================
          DELIVERABLES
      ========================= */}

      <section className="project-deliverables">

        <div className="project-deliverables-header">

          <p className="project-eyebrow">
            WHAT I CREATED
          </p>

          <p className="deliverables-count">
            {String(project.deliverables.length).padStart(2, "0")}{" "}
            Deliverables
          </p>

        </div>


        <div className="deliverables-list">

          {project.deliverables.map((deliverable, index) => (

            <article
  className="deliverable"
  key={`${deliverable.title}-${index}`}
  data-type={deliverable.type.toUpperCase()}
>
              <div className="deliverable-meta">

                <span>
                  {String(index + 1).padStart(2, "0")}
                </span>

                <span>
                  {deliverable.type}
                </span>

              </div>


              <div className="deliverable-content">

                <div className="deliverable-copy">

                  <h2>
                    {deliverable.title}
                  </h2>

                  <p>
                    {deliverable.description}
                  </p>

                </div>


                {/* SINGLE IMAGE */}

                {deliverable.image && (
  <MediaLightbox
    images={[deliverable.image]}
    title={deliverable.title}
  />
)}

                {/* MULTIPLE IMAGES */}

                {deliverable.images && (
  <MediaLightbox
    images={deliverable.images}
    title={deliverable.title}
  />
)}

                {/* VIDEO */}

                {deliverable.video && (
                  <div className="deliverable-video">

                    <video
                      controls
                      playsInline
                      preload="metadata"
                    >

                      <source
                        src={deliverable.video}
                        type="video/mp4"
                      />

                      Your browser does not support
                      the video element.

                    </video>

                  </div>
                )}

              </div>

            </article>

          ))}

        </div>

      </section>


      {/* =========================
          NEXT PROJECT
      ========================= */}

      <section className="project-navigation">

        <Link
          href={`/work/${nextProject.slug}`}
          className="next-project"
        >

          <div>

            <p className="project-eyebrow">
              NEXT PROJECT
            </p>

            <h2>
              {nextProject.title}
            </h2>

          </div>

          <span className="next-project-arrow">
            →
          </span>

        </Link>

      </section>


      {/* =========================
          BACK TO WORK
      ========================= */}

      <section className="project-back">

        <Link href="/work">
          ← Back to all work
        </Link>

      </section>

    </main>
  );
}