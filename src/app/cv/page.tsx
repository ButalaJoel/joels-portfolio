import type { Metadata } from "next";
import { cv } from "@/content/cv";
import { exhibits } from "@/content/exhibits";
import Link from "next/link";
import PrintButton from "./PrintButton";
import "./cv.css";

export const metadata: Metadata = {
  title: "CV — Joel Butala",
  description: `${cv.name}, ${cv.identity}, ${cv.location}.`,
};

// Selected live work for the CV, straight from the portfolio data.
const selected = exhibits.filter((e) => e.status === "live" && e.district !== "marketing" && e.client && e.slug !== "brand-identities" && e.slug !== "motion-video").slice(0, 8);

export default function CVPage() {
  return (
    <main className="cv">
      <div className="cv-bar">
        <Link href="/">← Back to JOELVERSE</Link>
        <PrintButton />
      </div>
      <article className="cv-page">
        <header className="cv-head">
          <div>
            <h1>{cv.name}</h1>
            <p className="cv-identity">{cv.identity}</p>
          </div>
          <ul className="cv-contact">
            <li>{cv.location}</li>
            <li>{cv.email}</li>
            <li>{cv.phones.map((p) => p.display).join(" · ")}</li>
            {cv.links.map((l) => (
              <li key={l.href}>{l.href.replace(/^https?:\/\//, "")}</li>
            ))}
          </ul>
        </header>

        <section>
          <h2>Profile</h2>
          {cv.summary.map((s) => (
            <p key={s}>{s}</p>
          ))}
        </section>

        <section>
          <h2>Experience</h2>
          {cv.experience.map((x) => (
            <div key={x.org} className="cv-job">
              <div className="cv-job-head">
                <h3>
                  {x.role} — {x.org}
                </h3>
                <span>{x.period}</span>
              </div>
              {x.summary && <p>{x.summary}</p>}
              {x.groups?.map((g) => (
                <p key={g.label}>
                  <b>{g.label}:</b> {g.items.join(", ")}.
                </p>
              ))}
              {x.highlights && (
                <ul>
                  {x.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>

        <section>
          <h2>Selected projects</h2>
          <ul className="cv-projects">
            {selected.map((e) => (
              <li key={e.slug}>
                <b>{e.title}</b> — {e.summary}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2>Education</h2>
          {cv.education.map((ed) => (
            <p key={ed.award}>
              <b>{ed.award}</b>, {ed.school}
            </p>
          ))}
          {cv.ambitions.length > 0 && <p>Next: {cv.ambitions.join(", ")}.</p>}
        </section>

        <section>
          <h2>Skills</h2>
          {cv.skills.map((s) => (
            <p key={s.tier}>
              <b>{s.tier}:</b> {s.items.join(", ")}.
            </p>
          ))}
        </section>
      </article>
    </main>
  );
}
