"use client";

import Link from "next/link";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export default function ContactoSection() {
  const sectionRef = useScrollReveal<HTMLElement>(0.15);

  return (
    <section
      id="contacto"
      ref={sectionRef}
      className="py-24 md:py-40"
      style={{ background: "#050505" }}
    >
      <div className="max-w-[800px] mx-auto px-6 md:px-12 text-center">
        <h2
          className="font-dm font-black tracking-[-0.04em] text-text-primary scroll-reveal"
          style={{ fontSize: "clamp(36px, 6vw, 72px)" }}
        >
          Cotiza tu próximo proyecto.
        </h2>

        <p className="font-dm font-medium text-[18px] text-text-body max-w-[500px] mx-auto mt-6 scroll-reveal stagger-1">
          Transformación garantizada para vehículos de alta gama. Respuesta en
          menos de 24 horas.
        </p>

        <div className="flex flex-col items-center gap-4 mt-12 scroll-reveal stagger-2">
          <a
            href="https://wa.me/5210000000000"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 font-dm font-bold text-[16px] px-12 py-[18px] rounded-lg bg-text-primary text-bg-base hover:bg-[#E0E0E0] active:scale-[0.98] transition-all duration-200"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Contactar por WhatsApp
          </a>

          <Link
            href="/enlaces"
            className="inline-flex items-center gap-2 font-dm font-medium text-[16px] px-12 py-[18px] rounded-lg bg-transparent text-text-primary border border-[rgba(242,242,242,0.15)] hover:bg-[rgba(242,242,242,0.05)] hover:border-[rgba(242,242,242,0.25)] transition-all duration-300"
          >
            Visita nuestros enlaces
          </Link>
        </div>

        <div className="w-full h-px bg-[rgba(242,242,242,0.06)] mt-24" />

        <footer className="mt-12 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-dm font-black text-[16px] text-text-primary">
            7FITMENT
          </span>

          <span className="font-dm font-medium text-[14px] text-accent-muted">
            © {new Date().getFullYear()} 7Fitment. Todos los derechos
            reservados.
          </span>

          <div className="flex items-center gap-4">
            {["Instagram", "TikTok", "YouTube"].map((social) => (
              <a
                key={social}
                href="#"
                className="font-dm font-medium text-[14px] text-accent-muted hover:text-text-primary transition-colors duration-200"
              >
                {social}
              </a>
            ))}
          </div>
        </footer>
      </div>
    </section>
  );
}
