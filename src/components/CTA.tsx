export default function CTA() {
  return (
    <section
  id="contact"
  className="bg-[#F5F5F5] px-6 py-10 text-[#080808] md:px-12 md:py-12"
>
      <div className="mx-auto max-w-7xl">

        <div className="grid gap-10 lg:grid-cols-3 lg:items-center">

          {/* Heading */}
          <div>
            <span className="inline-block rounded-full border border-[#FFB020] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.15em] text-[#080808]">
              Let's Work Together
            </span>

            <h2 className="mt-5 max-w-md text-4xl font-semibold leading-[1] tracking-tight md:text-5xl">
              Have a project
              <br />
              in mind?
            </h2>
          </div>

          {/* Description */}
          <div>
            <p className="max-w-sm text-sm leading-relaxed text-black/60">
              I'm currently available for freelance and full-time
              opportunities.
            </p>
          </div>

          {/* Button */}
          <div className="lg:flex lg:justify-end">
            <a
              href="mailto:hello@joelbutala.com"
              className="inline-flex items-center gap-5 rounded-full bg-[#FFB020] px-7 py-4 text-sm font-medium text-black transition-transform duration-300 hover:scale-105"
            >
              Get In Touch

              <span className="text-lg">
                →
              </span>
            </a>
          </div>

        </div>

      </div>
    </section>
  );
}