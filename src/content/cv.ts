import type { CV, District } from "./types";

// Joel's CV. Everything here is stated by Joel; nothing is invented.
// Items still missing (dates, Egate and Grola Tech roles, LinkedIn) are left out until confirmed.
export const cv: CV = {
  name: "Joel Butala",
  identity: "Multidisciplinary Creative, Marketing & Technology Professional",
  location: "Kampala, Uganda",
  summary: [
    "I work across creativity, marketing, communications, technology and entrepreneurship.",
    "I lead marketing and communications at Peacock Paints, run NovaWorks, my brand, digital and growth studio, and design and build brands, websites and software for Ugandan businesses.",
  ],
  email: "btljoel97@gmail.com",
  phones: [
    { display: "0786 713 906", tel: "+256786713906" },
    { display: "0791 483 971", tel: "+256791483971" },
  ],
  whatsapp: "256786713906",
  links: [{ label: "GitHub", href: "https://github.com/ButalaJoel" }],
  photo: "/images/joel-hero.png",
  education: [],
  ambitions: [],
  experience: [
    {
      org: "Peacock Paints Ltd, Uganda",
      role: "Marketing & Communications Manager",
      period: "March 2025 – Present",
      summary: "Earlier responsibilities in the role centred on graphic design and marketing.",
      groups: [
        {
          label: "Graphic design",
          items: [
            "Corporate graphic design",
            "Advertising & product ads",
            "Brochures & catalogues",
            "Product technical sheets",
            "Packaging & labels",
            "Exhibition graphics",
            "Banners & posters",
            "Vehicle & outdoor branding",
            "Social media graphics",
            "Newsletters & company profiles",
            "Infographics & presentations",
          ],
        },
        {
          label: "Marketing",
          items: [
            "Campaign development",
            "Marketing strategy",
            "Product launches",
            "Social media management",
            "Marketing calendars & reports",
            "Brand positioning",
            "Promotional campaigns",
            "Exhibition planning",
            "Marketing budget proposals",
            "Contractor-focused communication",
          ],
        },
        {
          label: "Communications",
          items: ["Corporate communications", "Customer newsletters", "Internal publications", "Product information", "Educational content"],
        },
        {
          label: "Digital",
          items: ["Facebook, Instagram, TikTok, X & WhatsApp", "Organic social growth", "Short-form video", "Website UX & content"],
        },
      ],
      highlights: [
        "UMA Exhibition",
        "Peacock Chronicles and Peacock Bulletin newsletters",
        "Product catalogue",
        "Launches: WeatherShield Plus, Polatex, MBasecoat Aluminium, Shifa Emulsion, Concrete Sealer",
        "Television commercial development and wall branding campaigns",
        "Social media management",
      ],
    },
    {
      org: "NovaWorks (Nova Creative Works Ltd)",
      role: "Founder",
      period: "Own company",
      summary: "Brand, Digital & Growth Studio — built for brands on the rise. Branding, websites, software, motion and marketing for growing Ugandan businesses.",
    },
    {
      org: "Freelance",
      role: "Creative & Web Designer",
      period: "2023 – Present",
      groups: [
        {
          label: "Services",
          items: ["Logo design", "Brand identity", "Graphic design", "Social media design", "Marketing materials", "Website design", "UI/UX", "Website development"],
        },
      ],
    },
  ],
  skills: [
    {
      tier: "Core skills",
      note: "Used every day",
      items: ["Adobe Illustrator", "Adobe Photoshop", "Adobe InDesign", "Adobe After Effects", "Adobe Premiere Pro", "Canva", "Blender", "HTML", "CSS", "React"],
    },
    {
      tier: "Working experience",
      note: "Used to ship real projects",
      items: ["JavaScript", "TypeScript", "Next.js", "Vite", "Tailwind CSS", "Figma", "Node.js", "MongoDB", "Git & GitHub", "API development", "Cloudinary", "UI/UX", "Responsive design", "AI-assisted development"],
    },
    {
      tier: "Developing",
      note: "Learning and experimenting",
      items: ["ESP32", "Raspberry Pi", "Embedded systems", "Robotics", "Game development", "Simulation"],
    },
  ],
  disciplines: [
    "Graphic design",
    "Brand identity",
    "Marketing & communications",
    "Digital & social media",
    "Advertising",
    "Motion graphics & video",
    "Website & UI/UX design",
    "Frontend & software development",
    "Entrepreneurship",
  ],
  achievements: [
    "Marketing & Communications Manager at Peacock Paints",
    "Founded NovaWorks (Nova Creative Works Ltd)",
    "Live systems in daily use, including a point-of-sale system for MS Security Systems",
  ],
};

export const districts: District[] = [
  { id: "marketing", name: "Marketing City", short: "Marketing", blurb: "Peacock Paints, campaigns, exhibitions, social media and communications.", color: "#1f8a8a" },
  { id: "creative", name: "Creative District", short: "Creative", blurb: "Branding, packaging, print, advertising, video and motion.", color: "#d6402b" },
  { id: "digital", name: "Digital District", short: "Digital", blurb: "Websites, apps, software and UI/UX I've designed and built.", color: "#2e6fd1" },
  { id: "business", name: "Business District", short: "Business", blurb: "NovaWorks and the businesses I run.", color: "#FFB020" },
  { id: "innovation", name: "Innovation Lab", short: "Innovation", blurb: "Products in development, concepts and experiments.", color: "#7b4fd1" },
];
