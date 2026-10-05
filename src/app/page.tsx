import Hero from "@/components/Hero";
import SelectedWork from "@/components/SelectedWork";
import WhatIDo from "@/components/WhatIDo";
import About from "@/components/About";
import Experience from "@/components/Experience";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Hero />
      <SelectedWork />
      <WhatIDo />
      <About />
      <Experience />
      <CTA />
      <Footer />
    </main>
  );
}