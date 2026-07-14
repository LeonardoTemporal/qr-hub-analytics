import {
  BarChart3,
  Boxes,
  Camera,
  Command,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Search,
  Send,
  ShieldCheck,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAdminSession } from "../auth/AdminSessionProvider";

const navigation = [
  { to: "/admin", label: "Resumen", icon: LayoutDashboard, end: true },
  { to: "/admin/workshop", label: "CRM", icon: Boxes },
  { to: "/admin/orders", label: "Ordenes", icon: Wrench },
  { to: "/admin/warranties", label: "Garantias", icon: ShieldCheck },
  { to: "/admin/media", label: "Media", icon: Camera },
  { to: "/admin/publication", label: "Publicar", icon: Send },
  { to: "/admin/analytics", label: "Analiticas", icon: BarChart3 },
];

export default function AdminLayout() {
  const { session, logout } = useAdminSession();
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");
  const commands = useMemo(
    () => navigation.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
      if (event.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-[#f2f2f2]">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[220px] border-r border-white/[0.06] bg-black/80 px-4 py-5 backdrop-blur-xl lg:block">
        <div className="flex h-12 items-center gap-3 px-2">
          <span className="grid h-9 w-9 place-items-center rounded-[3px] bg-[#f2f2f2] text-[12px] font-semibold tracking-[-0.05em] text-black">7F</span>
          <div>
            <p className="text-[13px] font-medium tracking-[-0.03em]">Operations</p>
            <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#626262]">{session?.username}</p>
          </div>
        </div>
        <nav className="mt-8 space-y-1">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `focus-ring flex h-11 items-center gap-3 rounded-[4px] px-3 text-[11px] font-medium uppercase tracking-[0.12em] transition-colors ${
                  isActive ? "bg-white/[0.08] text-white" : "text-[#707070] hover:bg-white/[0.035] hover:text-[#d8d8d8]"
                }`
              }
            >
              <Icon size={15} strokeWidth={1.5} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-5 left-4 right-4 space-y-2">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="focus-ring flex h-10 w-full items-center justify-between rounded-[4px] border border-white/[0.07] px-3 font-mono text-[9px] uppercase tracking-[0.14em] text-[#626262]"
          >
            <span className="flex items-center gap-2"><Command size={13} /> Comandos</span><kbd>Ctrl K</kbd>
          </button>
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate("/admin/login", { replace: true });
            }}
            className="focus-ring flex h-10 w-full items-center gap-3 rounded-[4px] px-3 text-[10px] uppercase tracking-[0.15em] text-[#626262] hover:text-white"
          >
            <LogOut size={14} /> Cerrar sesion
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/[0.06] bg-black/80 px-4 backdrop-blur-xl lg:ml-[220px] lg:px-7">
        <button type="button" onClick={() => setPaletteOpen(true)} className="focus-ring inline-flex items-center gap-3 text-[#707070] hover:text-white">
          <Search size={15} />
          <span className="font-mono text-[9px] uppercase tracking-[0.18em]">Buscar modulo</span>
        </button>
        <a href="/" className="focus-ring inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#707070] hover:text-white">
          Sitio <ExternalLink size={13} />
        </a>
      </header>

      <div className="pb-20 lg:ml-[220px] lg:pb-0"><Outlet /></div>

      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-16 overflow-x-auto border-t border-white/[0.07] bg-black/90 backdrop-blur-xl lg:hidden">
        {navigation.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `focus-ring grid min-w-[74px] flex-1 place-items-center text-[8px] uppercase tracking-[0.08em] ${isActive ? "text-white" : "text-[#626262]"}`}>
            <span className="grid place-items-center gap-1"><Icon size={15} /><span>{label}</span></span>
          </NavLink>
        ))}
      </nav>

      {paletteOpen ? (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/75 px-4 pt-[12vh] backdrop-blur-md" onMouseDown={() => setPaletteOpen(false)}>
          <section className="w-full max-w-[560px] rounded-[6px] border border-white/[0.1] bg-[#0a0a0a] shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex h-14 items-center gap-3 border-b border-white/[0.07] px-4">
              <Search size={16} className="text-[#707070]" />
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} className="h-full flex-1 bg-transparent text-sm outline-none" aria-label="Buscar comando" />
              <button type="button" onClick={() => setPaletteOpen(false)} aria-label="Cerrar"><X size={16} /></button>
            </div>
            <div className="p-2">
              {commands.map(({ to, label, icon: Icon }) => (
                <button key={to} type="button" onClick={() => { navigate(to); setPaletteOpen(false); setQuery(""); }} className="focus-ring flex h-12 w-full items-center gap-3 rounded-[4px] px-3 text-left text-[12px] text-[#b8b8b8] hover:bg-white/[0.05] hover:text-white">
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
