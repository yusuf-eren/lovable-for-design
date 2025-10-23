import Image from "next/image";

export function HeroSection() {
  return (
    <div className="w-full text-center">
      <div className="transition-all duration-500 delay-100 opacity-100 translate-y-0">
        <Image
          src="/arc-logo.png"
          alt="Arc AI"
          width={200}
          height={53}
          className="mx-auto mb-8"
          priority
        />
      </div>

      <div className="transition-all duration-500 delay-200 opacity-100 translate-y-0">
        <h1
          className="text-[32px] leading-[1.1] font-thin mb-3"
          style={{ fontFamily: "var(--font-dm-serif)" }}
        >
          Instant design
          <br />
          for non-design teams
        </h1>

        <p className="text-[16px] leading-[1.4] mb-6">
          All your design needs – done.
          <br />
          Instant. 100% on-brand.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5 mb-6 transition-all duration-500 delay-300 opacity-100 translate-y-0">
        {["Ads", "Visuals", "Docs", "Assets", "Slides"].map((item) => (
          <button
            key={item}
            className="px-3 py-1.5 text-[13px] border border-black/20 rounded-[32px] hover:border-black/40 transition-colors"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

