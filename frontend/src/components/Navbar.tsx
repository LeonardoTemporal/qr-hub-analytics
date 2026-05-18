import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

const navLinks = [
  { label: "Servicios", href: "#servicios" },
  { label: "Proceso", href: "#proceso" },
  { label: "Portafolio", href: "#portafolio" },
  { label: "Contacto", href: "#contacto" },
  { label: "Enlaces", href: "/enlaces" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 42);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header
        className={`fixed left-0 right-0 top-0 z-50 border-b transition-all duration-300 ${
          scrolled ? "border-white/10 bg-[#050505]/85 backdrop-blur-xl" : "border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 md:px-8">
          <a
            href="/"
            className="focus-ring text-[19px] font-black tracking-[-0.06em]"
            aria-label="7Fitment inicio"
          >
            7FITMENT
          </a>

          <nav className="hidden items-center gap-7 md:flex" aria-label="Principal">
            {navLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="focus-ring text-[13px] font-medium text-text-body transition-colors hover:text-text-primary"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <a
            href="/dashboard"
            className="focus-ring hidden border border-white/15 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.08em] text-text-primary transition-colors hover:bg-white hover:text-black md:inline-flex"
          >
            Dashboard
          </a>

          <button
            className="focus-ring inline-flex h-10 w-10 items-center justify-center border border-white/15 md:hidden"
            type="button"
            aria-label="Abrir menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <Menu size={20} strokeWidth={1.7} />
          </button>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-[60] bg-[#050505] transition-transform duration-500 md:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <div className="flex h-full flex-col px-5 py-5">
          <div className="flex h-12 items-center justify-between">
            <span className="text-[19px] font-black tracking-[-0.06em]">7FITMENT</span>
            <button
              className="focus-ring inline-flex h-10 w-10 items-center justify-center border border-white/15"
              type="button"
              aria-label="Cerrar menu"
              onClick={() => setOpen(false)}
            >
              <X size={20} strokeWidth={1.7} />
            </button>
          </div>

          <nav className="flex flex-1 flex-col justify-center gap-7">
            {navLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="text-[34px] font-black leading-none tracking-[-0.06em]"
              >
                {item.label}
              </a>
            ))}
            <a
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="mt-4 w-fit border border-white/15 px-5 py-3 text-[13px] font-bold uppercase tracking-[0.08em]"
            >
              Dashboard
            </a>
          </nav>
        </div>
      </div>
    </>
  );
}
