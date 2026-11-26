export type DistrictId = "marketing" | "creative" | "digital" | "business" | "innovation";

export type ExhibitStatus = "live" | "in-progress" | "planned" | "concept" | "role" | "business";

export type Section = { title: string; body: string; media: string[] };

export type Exhibit = {
  slug: string;
  title: string;
  district: DistrictId;
  status: ExhibitStatus;
  client: string;
  role: string;
  sector: string;
  summary: string;
  problem: string;
  solution: string;
  deliverables: string[];
  stack: string[];
  link: string;
  /** large image for the case study */
  cover: string;
  /** small image for the 3D billboard (falls back to cover) */
  board: string;
  sections: Section[];
};

export type District = {
  id: DistrictId;
  name: string;
  short: string;
  blurb: string;
  color: string;
};

export type Experience = {
  org: string;
  role: string;
  period: string;
  summary?: string;
  groups?: { label: string; items: string[] }[];
  highlights?: string[];
};

export type CV = {
  name: string;
  identity: string;
  location: string;
  summary: string[];
  email: string;
  phones: { display: string; tel: string }[];
  whatsapp: string;
  links: { label: string; href: string }[];
  photo: string;
  education: { award: string; school: string; note?: string }[];
  ambitions: string[];
  experience: Experience[];
  skills: { tier: string; note: string; items: string[] }[];
  disciplines: string[];
  achievements: string[];
};

export const STATUS_LABEL: Record<ExhibitStatus, string> = {
  live: "Live / delivered",
  "in-progress": "In progress",
  planned: "Planned",
  concept: "Concept",
  role: "Peacock Paints role",
  business: "Own business",
};
