"use client";

import { useScrollReveal } from "@/hooks/useScrollReveal";
import { Check } from "lucide-react";

export default function PersonalizacionSection() {
  const sectionRef = useScrollReveal<HTMLElement>(0.2);

  return (
    <section
      id="servicios"
      ref={sectionRef}
      className="py-20 md:py-32 lg:py-40"
      style={{ background: "#050505" }}
    >
      <div className="max-w-[1200px] mx-auto px-6 md:px-12">
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-0">
          <div className="lg:w-1/2 scroll-reveal-left">
            <div className="aspect-[3/4] w-full overflow-hidden">
              <img
                src="/images/img-wrap-car.jpg"
                alt="Superdeportivo con wrap de color personalizado"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </div>

          <div className="lg:w-1/2 lg:pl-[60px] flex flex-col gap-12">
            <div className="scroll-reveal stagger-1">
              <h3 className="font-dm font-bold text-[28px] text-text-primary tracking-[-0.02em] mb-6">
                Wrap
              </h3>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3">
                  <Check
                    size={20}
                    className="text-text-primary mt-0.5 shrink-0"
                    strokeWidth={2}
                  />
                  <span className="font-dm font-medium text-[16px] text-text-body">
                    Más de 1000 colores disponibles
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check
                    size={20}
                    className="text-text-primary mt-0.5 shrink-0"
                    strokeWidth={2}
                  />
                  <span className="font-dm font-medium text-[16px] text-text-body">
                    Calidades premium: Brillante, Mate, Satinado, Perlado, Cromo
                  </span>
                </li>
              </ul>
              <div className="space-y-2">
                <p className="font-dm font-medium text-[14px] text-accent-muted">
                  Acabados:{" "}
                  <span className="text-text-body">
                    Brillante · Mate · Satinado · Perlado · Cromo
                  </span>
                </p>
                <p className="font-dm font-medium text-[14px] text-accent-muted">
                  Diseños a Medida:{" "}
                  <span className="text-text-body">
                    Parciales · Completos · Impresión Digital
                  </span>
                </p>
              </div>
            </div>

            <div className="scroll-reveal stagger-2">
              <h3 className="font-dm font-bold text-[28px] text-text-primary tracking-[-0.02em] mb-6">
                PPF Color
              </h3>
              <p className="font-dm font-medium text-[16px] text-text-body leading-[1.6] max-w-[480px]">
                Alternativa premium que combina color y protección en una sola
                capa. Cambia la estética de tu vehículo mientras proteges la
                pintura original de impactos, rayones y desgaste.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
