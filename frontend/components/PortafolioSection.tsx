"use client";

import { useScrollReveal } from "@/hooks/useScrollReveal";

const portfolioItems = [
  {
    id: 1,
    image: "/images/img-portfolio-1.jpg",
    title: "Porsche 911 Satin Green",
    large: true,
  },
  {
    id: 2,
    image: "/images/img-portfolio-2.jpg",
    title: "BMW M4 Chrome",
    large: false,
  },
  {
    id: 3,
    image: "/images/img-portfolio-3.jpg",
    title: "Mercedes-AMG GT PPF",
    large: false,
  },
  {
    id: 4,
    image: "/images/img-portfolio-4.jpg",
    title: "Audi R8 Two-Tone",
    large: false,
  },
  {
    id: 5,
    image: "/images/img-portfolio-5.jpg",
    title: "Precision Install",
    large: false,
  },
  {
    id: 6,
    image: "/images/img-portfolio-6.jpg",
    title: "Tesla Ceramic",
    large: false,
  },
];

export default function PortafolioSection() {
  const sectionRef = useScrollReveal<HTMLElement>(0.15);

  return (
    <section
      id="portafolio"
      ref={sectionRef}
      className="py-20 md:py-32"
      style={{ background: "#050505" }}
    >
      <div className="max-w-[1200px] mx-auto px-6 md:px-12">
        <div className="mb-16">
          <h2
            className="font-dm font-black tracking-[-0.04em] text-text-primary scroll-reveal"
            style={{ fontSize: "clamp(36px, 5vw, 72px)" }}
          >
            Trabajos Recientes
          </h2>
          <p className="font-dm font-medium text-[18px] text-text-body mt-4 scroll-reveal stagger-1">
            Una selección de proyectos realizados en nuestro estudio.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 portfolio-item scroll-reveal stagger-1">
            <div className="aspect-video overflow-hidden">
              <img
                src={portfolioItems[0].image}
                alt={portfolioItems[0].title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="portfolio-overlay">
                <span className="font-dm font-bold text-[18px] text-text-primary">
                  {portfolioItems[0].title}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="portfolio-item scroll-reveal stagger-2">
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={portfolioItems[1].image}
                  alt={portfolioItems[1].title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="portfolio-overlay">
                  <span className="font-dm font-bold text-[18px] text-text-primary">
                    {portfolioItems[1].title}
                  </span>
                </div>
              </div>
            </div>
            <div className="portfolio-item scroll-reveal stagger-3">
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={portfolioItems[2].image}
                  alt={portfolioItems[2].title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="portfolio-overlay">
                  <span className="font-dm font-bold text-[18px] text-text-primary">
                    {portfolioItems[2].title}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {portfolioItems.slice(3).map((item, index) => (
            <div
              key={item.id}
              className={`portfolio-item scroll-reveal stagger-${index + 1}`}
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="portfolio-overlay">
                  <span className="font-dm font-bold text-[18px] text-text-primary">
                    {item.title}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
