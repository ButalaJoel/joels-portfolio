import World from "@/world/World";
import { projects } from "@/data/projects";
import { profile } from "@/data/profile";

export default function Home() {
  return (
    <main>
      <World projects={projects} profile={profile} />
    </main>
  );
}
