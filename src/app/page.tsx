import World from "@/world/World";
import { exhibits } from "@/content/exhibits";
import { cv, districts } from "@/content/cv";

export default function Home() {
  return (
    <main>
      <World exhibits={exhibits} districts={districts} cv={cv} />
    </main>
  );
}
