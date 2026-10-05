"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { projects } from "@/data/projects";

export default function HeroSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const project = projects[currentSlide];

  const nextSlide = () => {
    setCurrentSlide((current) =>
      current === projects.length - 1 ? 0 : current + 1
    );
  };

  const previousSlide = () => {
    setCurrentSlide((current) =>
      current === 0 ? projects.length - 1 : current - 1
    );
  };

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setCurrentSlide((current) =>
        current === projects.length - 1 ? 0 : current + 1
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused]);

  return (
    <section
      className="relative min-h-screen overflow-hidden bg-black text-white"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(255,176,32,0.12),transparent_40%)]" />

      {/* Main content */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1600px] items-center px-6 pb-20 pt-32 md:px-12 lg:px-16">
        
        <div className="grid w-full items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          
          {/* LEFT — Project information */}
          <div className="max-w-2xl">
            
            {/* Category */}
            <p className="mb-6 text-xs font-medium uppercase tracking-[0.25em] text-[#FFB020] md:text-sm">
              {project.category}
            </p>

            {/* Project title */}
            <h1 className="text-5xl font-bold uppercase leading-[0.88] tracking-[-0.05em] sm:text-6xl md:text-7xl lg:text-[6.5vw]">
              {project.title}
            </h1>

            {/* Description */}
            <p className="mt-8 max-w-lg text-base leading-relaxed text-white/60 md:text-lg">
              {project.description}
            </p>

            {/* CTA */}
            <Link
              href={`/work#${project.slug}`}
              className="mt-8 inline-flex items-center rounded-full border border-white/30 px-7 py-3 text-sm font-medium transition-all duration-300 hover:bg-white hover:text-black"
            >
              View Project
              <span className="ml-3">→</span>
            </Link>
          </div>

          {/* RIGHT — Project image */}
          <div className="relative">
            
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl">
              
              <Image
                key={project.image}
                src={project.image}
                alt={project.title}
                fill
                priority={currentSlide === 0}
                className="object-contain transition-all duration-700"
              />

            </div>

            {/* Image label */}
            <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/40">
              <span>{project.year}</span>
              <span>Selected Work</span>
            </div>
          </div>
        </div>
      </div>

      {/* Slider controls */}
      <div className="absolute bottom-8 left-6 right-6 z-20 flex items-center justify-between md:left-12 md:right-12">
        
        {/* Counter */}
        <span className="text-sm tracking-[0.2em] text-white/50">
          {String(currentSlide + 1).padStart(2, "0")} /{" "}
          {String(projects.length).padStart(2, "0")}
        </span>

        {/* Controls */}
        <div className="flex items-center gap-3">
          
          <button
            onClick={previousSlide}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white transition hover:bg-white hover:text-black"
            aria-label="Previous project"
          >
            ←
          </button>

          <button
            onClick={nextSlide}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white transition hover:bg-white hover:text-black"
            aria-label="Next project"
          >
            →
          </button>

        </div>
      </div>
    </section>
  );
}