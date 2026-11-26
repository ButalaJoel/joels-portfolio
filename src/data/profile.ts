import type { Profile } from "@/world/World";

// Edit this file to update the About / Contact panels in the 3D world.
export const profile: Profile = {
  name: "Joel Butala",
  role: "Designer & Developer",
  location: "Kampala, Uganda",
  bio: [
    "I'm Joel, a multi-disciplinary creative with a passion for solving real problems.",
    "With a background in graphic design and marketing, and a growing focus on web development, I help brands communicate better and build meaningful digital experiences.",
    "I run NovaWorks, a brand, digital and growth studio built for brands on the rise.",
  ],
  email: "hello@joelbutala.com",
  photo: "/images/joel-hero.png",
  stats: [
    { value: "50+", label: "Projects completed" },
    { value: "5+", label: "Years of experience" },
  ],
  tools: ["Figma", "Illustrator", "Photoshop", "InDesign", "Premiere", "After Effects", "HTML", "CSS", "JavaScript", "React", "Next.js", "Tailwind", "Git", "VS Code"],
  // Add your real links here (WhatsApp, Instagram, LinkedIn, GitHub, Behance...)
  socials: [{ label: "GitHub", href: "https://github.com/ButalaJoel" }],
};
