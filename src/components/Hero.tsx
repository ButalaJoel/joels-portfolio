import Navbar from "./Navbar";
import HeroSlider from "./HeroSlider";

export default function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#080808] text-white">
      <Navbar />
      <HeroSlider />
    </section>
  );
}