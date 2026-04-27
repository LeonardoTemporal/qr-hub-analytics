"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useScrollPosition } from "@/hooks/useScrollPosition";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Inicio", href: "#inicio" },
  { label: "Servicios", href: "#servicios" },
  { label: "Portafolio", href: "#portafolio" },
  { label: "Contacto", href: "#contacto" },
];

export default function Navbar() {
  const scrollY = useScrollPosition();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isScrolled = scrollY > 50;

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 h-[72px] flex items-center transition-all duration-[400ms]"
        style={{
          background: isScrolled ? "rgba(5, 5, 5, 0.85)" : "transparent",
          backdropFilter: isScrolled ? "blur(12px)" : "none",
          WebkitBackdropFilter: isScrolled ? "blur(12px)" : "none",
          borderBottom: isScrolled
            ? "1px solid rgba(242, 242, 242, 0.06)"
            : "1px solid transparent",
        }}
      >
        <div className="w-full max-w-[1200px] mx-auto px-6 md:px-12 flex items-center justify-between">
          <a
            href="#inicio"
            onClick={(e) => handleNavClick(e, "#inicio")}
            className="font-dm font-black text-[20px] tracking-[-0.04em] text-text-primary"
          >
            7FITMENT
          </a>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="font-dm font-medium text-[14px] tracking-[0.04em] text-text-body hover:text-text-primary transition-colors duration-300"
              >
                {link.label}
              </a>
            ))}
          </div>

          <Link
            href="/enlaces"
            className="hidden md:inline-block font-dm font-medium text-[14px] text-text-primary px-6 py-[10px] rounded-lg border border-[rgba(242,242,242,0.2)] bg-transparent hover:bg-[rgba(242,242,242,0.05)] transition-all duration-300"
          >
            Nuestros Enlaces
          </Link>

          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 text-text-primary"
            aria-label="Abrir menú"
          >
            <Menu size={24} />
          </button>
        </div>
      </nav>

      <div
        className="fixed inset-0 z-[60] bg-bg-card transition-transform duration-[400ms]"
        style={{
          transform: mobileMenuOpen ? "translateX(0)" : "translateX(100%)",
          transitionTimingFunction: "cubic-bezier(0.19, 1, 0.22, 1)",
        }}
      >
        <div className="flex flex-col h-full px-6 py-6">
          <div className="flex items-center justify-between">
            <span className="font-dm font-black text-[20px] tracking-[-0.04em] text-text-primary">
              7FITMENT
            </span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 text-text-primary"
              aria-label="Cerrar menú"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex flex-col gap-8 mt-16">
            {navLinks.map((link, index) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="font-dm font-bold text-[32px] tracking-[-0.02em] text-text-primary"
                style={{
                  opacity: mobileMenuOpen ? 1 : 0,
                  transform: mobileMenuOpen
                    ? "translateY(0)"
                    : "translateY(20px)",
                  transition: `all 0.4s cubic-bezier(0.19, 1, 0.22, 1) ${0.1 + index * 0.08}s`,
                }}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
