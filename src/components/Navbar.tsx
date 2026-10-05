"use client";

import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* NAVBAR */}
      <header className="absolute top-0 left-0 z-[9999] w-full px-6 py-6 md:px-12">
        <nav className="relative z-[9999] mx-auto flex max-w-7xl items-center justify-between">

          {/* Logo */}
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight text-white"
          >
            JB.
          </Link>

          {/* Desktop Navigation */}
<div className="hidden items-center rounded-full border border-white/15 bg-white/5 px-2 py-2 backdrop-blur-md md:flex">

  <Link
    href="/"
    className="rounded-full px-5 py-2 text-sm text-white transition-all duration-300 hover:bg-white/10"
  >
    Home
  </Link>

  <Link
    href="/work"
    className="rounded-full px-5 py-2 text-sm text-white transition-all duration-300 hover:bg-white/10"
  >
    Work
  </Link>

  <Link
    href="/about"
    className="rounded-full px-5 py-2 text-sm text-white transition-all duration-300 hover:bg-white/10"
  >
    About
  </Link>

  <Link
    href="/contact"
    className="rounded-full px-5 py-2 text-sm text-white transition-all duration-300 hover:bg-white/10"
  >
    Contact
  </Link>

</div>
          {/* Desktop CTA */}
          <Link
            href="/contact"
            className="hidden rounded-full border border-white/40 bg-white/5 px-5 py-2.5 text-sm text-white backdrop-blur-md transition-all duration-300 hover:bg-white hover:text-black md:block"          >
            Let's Talk <span className="ml-2">→</span>
          </Link>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="relative z-[10000] flex h-12 w-12 items-center justify-center rounded-full border border-white/60 text-white md:hidden"
            aria-label="Open menu"
          >
            ☰
          </button>

        </nav>
      </header>

      {/* MOBILE SIDEBAR */}
      <div
        className={`fixed inset-0 z-[20000] md:hidden ${
          menuOpen
            ? "pointer-events-auto"
            : "pointer-events-none"
        }`}
      >

        {/* Overlay */}
        <div
          onClick={() => setMenuOpen(false)}
          className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${
            menuOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Sidebar */}
        <aside
          className={`absolute right-0 top-0 h-full w-[85%] max-w-sm bg-[#111] p-6 text-white transition-transform duration-300 ease-out ${
            menuOpen
              ? "translate-x-0"
              : "translate-x-full"
          }`}
        >

          {/* Sidebar Header */}
          <div className="flex items-center justify-between">

            <span className="text-2xl font-bold tracking-tight">
              JB.
            </span>

            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/30 text-xl transition hover:bg-white hover:text-black"
              aria-label="Close menu"
            >
              ×
            </button>

          </div>

          {/* Navigation */}
          <div className="mt-16 flex flex-col gap-6">

  <Link
    href="/"
    onClick={() => setMenuOpen(false)}
    className="text-2xl font-medium transition-all duration-300 hover:translate-x-2 hover:text-[#FFB020] active:text-[#FFB020]"
  >
    Home
  </Link>

  <Link
    href="/work"
    onClick={() => setMenuOpen(false)}
    className="text-2xl font-medium transition-all duration-300 hover:translate-x-2 hover:text-[#FFB020] active:text-[#FFB020]"
  >
    Work
  </Link>

  <Link
    href="/about"
    onClick={() => setMenuOpen(false)}
    className="text-2xl font-medium transition-all duration-300 hover:translate-x-2 hover:text-[#FFB020] active:text-[#FFB020]"
  >
    About
  </Link>

  <Link
    href="/contact"
    onClick={() => setMenuOpen(false)}
    className="text-2xl font-medium transition-all duration-300 hover:translate-x-2 hover:text-[#FFB020] active:text-[#FFB020]"
  >
    Contact
  </Link>

</div>
          {/* CTA */}
          <div className="absolute bottom-8 left-6 right-6">
            <Link
              href="/contact"
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center justify-center rounded-full bg-[#FFB020] px-6 py-3.5 text-sm font-medium text-black transition-all duration-300 hover:bg-white hover:translate-y-[-2px]"
            >
              Let's Talk →
            </Link>
          </div>

        </aside>
      </div>
    </>
  );
}