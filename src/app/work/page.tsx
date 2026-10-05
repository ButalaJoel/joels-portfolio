import Link from "next/link";
import "./work.css";

type Project = {
  id: number;
  title: string;
  category: string;
  year: string;
  description: string;
  image?: string;
  slug: string;
};

const projects: Project[] = [
  {
    id: 1,
    title: "Concrete Finisher UG",
    category: "Web Design & Development",
    year: "2026",
    description:
      "A complete digital and visual identity experience developed for a concrete finishing and flooring company.",
    image:
      "/images/projects/concrete-finisher/concrete-finisher.png",
    slug: "concrete-finisher-ug",
  },

  {
    id: 2,
    title: "Project Two",
    category: "Brand & Visual Design",
    year: "2026",
    description:
      "Brand identity and visual communication developed for a growing business.",
    slug: "project-two",
  },

  {
    id: 3,
    title: "Project Three",
    category: "Marketing & Digital Content",
    year: "2026",
    description:
      "Digital content and campaign assets created to help a brand communicate and grow.",
    slug: "project-three",
  },

  {
    id: 4,
    title: "Project Four",
    category: "Creative Experiments",
    year: "2026",
    description:
      "An experimental creative project exploring motion, visual storytelling and digital design.",
    slug: "project-four",
  },

  {
    id: 5,
    title: "Project Five",
    category: "Web Design & Development",
    year: "2026",
    description:
      "A digital experience designed around usability, visual hierarchy and brand expression.",
    slug: "project-five",
  },

  {
    id: 6,
    title: "Project Six",
    category: "Brand & Visual Design",
    year: "2026",
    description:
      "A visual identity system created to give a growing business a stronger presence.",
    slug: "project-six",
  },
];

const PROJECTS_PER_PAGE = 3;

type WorkPageProps = {
  searchParams: Promise<{
    page?: string;
  }>;
};

export default async function Work({
  searchParams,
}: WorkPageProps) {
  const params = await searchParams;

  const requestedPage = Number(params.page) || 1;

  const totalPages = Math.ceil(
    projects.length / PROJECTS_PER_PAGE
  );

  /*
    Make sure the page can never be:
    - less than 1
    - greater than the final page
  */
  const currentPage = Math.min(
    Math.max(requestedPage, 1),
    totalPages
  );

  /*
    Work out which three projects belong
    to the current page.
  */
  const startIndex =
    (currentPage - 1) * PROJECTS_PER_PAGE;

  const visibleProjects = projects.slice(
    startIndex,
    startIndex + PROJECTS_PER_PAGE
  );

  return (
    <main className="work-page">

      {/* =========================================
          HERO
      ========================================= */}

      <section className="work-hero">

        <div className="work-hero-content">

          <p className="eyebrow">
            SELECTED WORK
          </p>

          <h1>
            Work That
            <br />
            Builds Brands.
          </h1>

          <p className="work-intro">
            A collection of branding, digital experiences,
            marketing content and creative experiments built
            for real businesses.
          </p>

        </div>

        {/* FEATURED PROJECT */}

        <Link
          href="/work/concrete-finisher-ug"
          className="work-hero-project"
        >

          <div className="work-hero-image">

            <img
              src="/images/projects/concrete-finisher/concrete-finisher.png"
              alt="Concrete Finisher UG website"
            />

            <div className="hero-image-overlay">

              <span>
                01 / {String(projects.length).padStart(2, "0")}
              </span>

              <span>
                FEATURED PROJECT
              </span>

            </div>

          </div>

        </Link>

      </section>


      {/* =========================================
          INTRODUCTION
      ========================================= */}

      <section className="work-introduction">

        <div>

          <p className="eyebrow">
            THE WORK
          </p>

          <h2>
            Design.
            <br />
            Build.
            <br />
            Market.
          </h2>

        </div>

        <p className="work-description">
          From visual identities and websites to digital
          campaigns, motion and creative experiments, this is
          a selection of projects developed across different
          stages of a brand&apos;s journey.
        </p>

      </section>


      {/* =========================================
          PROJECTS
      ========================================= */}

      <section className="work-projects">

        {/* FILTERS */}

        <div className="work-filters">

          <button className="active">
            All Work
          </button>

          <button>
            Brand &amp; Visual Design
          </button>

          <button>
            Web Design &amp; Development
          </button>

          <button>
            Marketing &amp; Digital Content
          </button>

          <button>
            Creative Experiments
          </button>

        </div>


        {/* =========================================
            PROJECT GRID

            DESKTOP:
            3 PROJECTS PER PAGE

            MOBILE:
            1 PROJECT PER PAGE
        ========================================= */}

        <div className="projects-grid">

          {visibleProjects.map((project) => (

            <article
              className="project-card"
              key={project.id}
            >

              <Link
                href={`/work/${project.slug}`}
                className="project-card-link"
              >

                {/* IMAGE */}

                <div className="project-image">

                  {project.image ? (

                    <img
                      src={project.image}
                      alt={project.title}
                    />

                  ) : (

                    <div className="project-image-placeholder">

                      <span>
                        PROJECT{" "}
                        {String(project.id).padStart(2, "0")}
                      </span>

                    </div>

                  )}

                </div>


                {/* INFORMATION */}

                <div className="project-info">

                  <div>

                    <p className="project-category">
                      {project.category}
                    </p>

                    <h3>
                      {project.title}
                    </h3>

                  </div>

                  <span className="project-year">
                    {project.year}
                  </span>

                </div>


                {/* DESCRIPTION */}

                <p className="project-description">
                  {project.description}
                </p>


                {/* LINK */}

                <span className="project-link">
                  View Project →
                </span>

              </Link>

            </article>

          ))}

        </div>


        {/* =========================================
            PAGINATION
        ========================================= */}

        <nav
          className="work-pagination"
          aria-label="Work pagination"
        >

          {/* PREVIOUS */}

          {currentPage > 1 ? (

            <Link
              href={`/work?page=${currentPage - 1}`}
              className="pagination-arrow"
              aria-label="Previous page"
            >
              ←
            </Link>

          ) : (

            <span
              className="pagination-arrow disabled"
              aria-hidden="true"
            >
              ←
            </span>

          )}


          {/* PAGE NUMBERS */}

          <div className="pagination-pages">

            {Array.from(
              { length: totalPages },
              (_, index) => {

                const page = index + 1;

                return (

                  <Link
                    key={page}
                    href={`/work?page=${page}`}
                    className={
                      `pagination-number ${
                        currentPage === page
                          ? "active"
                          : ""
                      }`
                    }
                  >
                    {page}
                  </Link>

                );
              }
            )}

          </div>


          {/* NEXT */}

          {currentPage < totalPages ? (

            <Link
              href={`/work?page=${currentPage + 1}`}
              className="pagination-arrow"
              aria-label="Next page"
            >
              →
            </Link>

          ) : (

            <span
              className="pagination-arrow disabled"
              aria-hidden="true"
            >
              →
            </span>

          )}

        </nav>

      </section>


      {/* =========================================
          CTA
      ========================================= */}

      <section className="work-cta">

        <p className="eyebrow">
          HAVE A PROJECT?
        </p>

        <h2>
          Let&apos;s build something
          <br />
          worth remembering.
        </h2>

        <Link
          href="/contact"
          className="work-cta-button"
        >
          Let&apos;s Talk →
        </Link>

      </section>

    </main>
  );
}