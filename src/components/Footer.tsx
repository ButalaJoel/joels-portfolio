export default function Footer() {
  return (
    <footer className="bg-[#080808] text-white">

      <div className="mx-auto max-w-7xl px-6 py-6 md:px-12">

        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

          {/* Logo */}
          <div className="text-xl font-bold tracking-tight">
            JB.
          </div>

          {/* Copyright */}
          <p className="text-xs text-white/40">
            © 2026 Joel Butala. All rights reserved.
          </p>

          {/* Navigation */}
          <nav className="flex items-center gap-6 text-xs text-white/60">

            <a
              href="#"
              className="transition-colors hover:text-[#FFB020]"
            >
              Home
            </a>

            <a
              href="#work"
              className="transition-colors hover:text-[#FFB020]"
            >
              Work
            </a>

            <a
              href="#about"
              className="transition-colors hover:text-[#FFB020]"
            >
              About
            </a>

            <a
              href="#contact"
              className="transition-colors hover:text-[#FFB020]"
            >
              Contact
            </a>

          </nav>

          {/* Built With */}
          <p className="text-xs text-white/40">
            Built with Next.js & Tailwind CSS
          </p>

          {/* Back To Top */}
          <a
            href="#"
            aria-label="Back to top"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-sm transition-all duration-300 hover:border-[#FFB020] hover:text-[#FFB020]"
          >
            ↑
          </a>

        </div>

      </div>

    </footer>
  );
}