"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { Shield, Droplets, Sparkles } from "lucide-react";

type Tab = "proteccion" | "proceso";

const proteccionCards = [
  {
    icon: Shield,
    title: "PPF Transparente",
    description:
      "Película de protección de pintura invisible que absorbe impactos de gravilla, rayones menores y contaminantes. Mantiene tu pintura original en condiciones de showroom.",
  },
  {
    icon: Droplets,
    title: "Recubrimiento Cerámico",
    description:
      "Capa líquida de nanocerámica que sella la superficie creando una barrera hidrofóbica. Protección química contra cloruro, resina de árboles y oxidación.",
  },
  {
    icon: Sparkles,
    title: "Corrección de Pintura",
    description:
      "Proceso de pulido multietapa que elimina hologramas, swirl marks y micro-rayones. Restaura la profundidad y el brillo original de la pintura.",
  },
];

const procesoSteps = [
  {
    number: "01",
    title: "Diagnóstico",
    description:
      "Evaluación completa del estado de la pintura, identificación de daños previos y definición del plan de trabajo personalizado.",
  },
  {
    number: "02",
    title: "Preparación",
    description:
      "Lavado descontaminante, desengrasado y aislamiento de áreas sensibles. Preparamos cada superficie con precisión quirúrgica.",
  },
  {
    number: "03",
    title: "Instalación",
    description:
      "Aplicación del servicio contratado siguiendo protocolos técnicos específicos. Cada material se maneja en condiciones controladas de temperatura y polvo.",
  },
  {
    number: "04",
    title: "Entrega",
    description:
      "Inspección final bajo luz LED especializada, documentación fotográfica del resultado y garantía por escrito de todos los trabajos realizados.",
  },
];

export default function TabSwitcher() {
  const [activeTab, setActiveTab] = useState<Tab>("proteccion");
  const [isAnimating, setIsAnimating] = useState(false);
  const [contentVisible, setContentVisible] = useState(true);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const sectionRef = useScrollReveal<HTMLElement>(0.15);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, index: number) => {
      const card = cardRefs.current[index];
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);
    },
    [],
  );

  const handleTabChange = (tab: Tab) => {
    if (tab === activeTab || isAnimating) return;

    setIsAnimating(true);
    setContentVisible(false);

    setTimeout(() => {
      setActiveTab(tab);
      // Small delay to let React mount the new content before making it visible
      requestAnimationFrame(() => {
        setContentVisible(true);
        setIsAnimating(false);
      });
    }, 200);
  };

  useEffect(() => {
    const tabsContainer = tabsRef.current;
    const indicator = indicatorRef.current;
    if (!tabsContainer || !indicator) return;

    const activeButton = tabsContainer.querySelector(
      `[data-tab="${activeTab}"]`,
    ) as HTMLElement | null;
    if (!activeButton) return;

    const containerRect = tabsContainer.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();

    const left = buttonRect.left - containerRect.left;
    const width = 60;
    const center = left + buttonRect.width / 2 - width / 2;

    indicator.style.transform = `translateX(${center}px)`;
  }, [activeTab]);

  // Helper for tab item animation styles
  const getItemStyle = (index: number, staggerMs: number) => ({
    opacity: contentVisible ? 1 : 0,
    transform: contentVisible ? "translateY(0)" : "translateY(30px)",
    transition: `opacity 0.6s cubic-bezier(0.215, 0.61, 0.355, 1) ${index * staggerMs}ms, transform 0.6s cubic-bezier(0.215, 0.61, 0.355, 1) ${index * staggerMs}ms`,
  });

  return (
    <section
      ref={sectionRef}
      className="py-20 md:py-32"
      style={{ background: "#050505" }}
    >
      <div className="max-w-[1200px] mx-auto px-6 md:px-12">
        <div
          ref={tabsRef}
          className="relative flex flex-col md:flex-row items-center justify-center gap-4 md:gap-12"
        >
          <button
            data-tab="proteccion"
            onClick={() => handleTabChange("proteccion")}
            className={`font-dm font-black tracking-[-0.03em] transition-colors duration-[400ms] ${
              activeTab === "proteccion"
                ? "text-text-primary"
                : "text-accent-muted"
            }`}
            style={{ fontSize: "clamp(28px, 4vw, 56px)" }}
          >
            PROTECCIÓN AUTOMOTRIZ
          </button>
          <button
            data-tab="proceso"
            onClick={() => handleTabChange("proceso")}
            className={`font-dm font-black tracking-[-0.03em] transition-colors duration-[400ms] ${
              activeTab === "proceso"
                ? "text-text-primary"
                : "text-accent-muted"
            }`}
            style={{ fontSize: "clamp(28px, 4vw, 56px)" }}
          >
            NUESTRO PROCESO
          </button>

          <div
            ref={indicatorRef}
            className="absolute bottom-[-12px] left-0 w-[60px] h-[2px] bg-text-primary transition-transform duration-[400ms]"
            style={{
              transitionTimingFunction: "cubic-bezier(0.33, 0, 0.2, 1)",
            }}
          />
        </div>

        <div className="mt-16">
          {activeTab === "proteccion" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {proteccionCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.title}
                    ref={(el) => {
                      cardRefs.current[index] = el;
                    }}
                    onMouseMove={(e) => handleMouseMove(e, index)}
                    className="card-glow bg-bg-card border border-[rgba(242,242,242,0.06)] p-10"
                    style={{
                      borderRadius: 0,
                      ...getItemStyle(index, 100),
                    }}
                  >
                    <div className="relative z-10">
                      <Icon
                        size={40}
                        className="text-text-primary mb-6"
                        strokeWidth={1.5}
                      />
                      <h4 className="font-dm font-bold text-[24px] text-text-primary tracking-[-0.01em] mb-4">
                        {card.title}
                      </h4>
                      <p className="font-dm font-medium text-[16px] text-text-body leading-[1.6]">
                        {card.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "proceso" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {procesoSteps.map((step, index) => (
                <div
                  key={step.number}
                  className="flex items-start gap-6"
                  style={getItemStyle(index, 150)}
                >
                  <span
                    className="font-dm font-black text-[48px] leading-none shrink-0"
                    style={{ color: "rgba(242, 242, 242, 0.08)" }}
                  >
                    {step.number}
                  </span>
                  <div>
                    <h4 className="font-dm font-bold text-[22px] text-text-primary mb-2">
                      {step.title}
                    </h4>
                    <p className="font-dm font-medium text-[16px] text-text-body leading-[1.6]">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
