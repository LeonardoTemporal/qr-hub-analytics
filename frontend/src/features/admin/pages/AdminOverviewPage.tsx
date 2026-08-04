import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  BarChart3,
  Boxes,
  Camera,
  CarFront,
  CircleDot,
  ScanLine,
  Send,
  Settings2,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";
import { Link } from "react-router";

import GlassPanel from "../../../ui/GlassPanel";
import { InlineError } from "../../../ui/RouteState";
import {
  fetchAdminClients,
  fetchAdminMedia,
  fetchAdminSummary,
  fetchAdminVehicles,
  fetchAdminWarranties,
  fetchAdminWorkOrders,
} from "../api";
import { useAdminSession } from "../auth/AdminSessionProvider";

export default function AdminOverviewPage() {
  const { session } = useAdminSession();
  const clients = useQuery({ queryKey: ["admin", "clients"], queryFn: fetchAdminClients });
  const vehicles = useQuery({ queryKey: ["admin", "vehicles"], queryFn: fetchAdminVehicles });
  const orders = useQuery({ queryKey: ["admin", "work-orders"], queryFn: fetchAdminWorkOrders });
  const warranties = useQuery({ queryKey: ["admin", "warranties"], queryFn: fetchAdminWarranties });
  const media = useQuery({ queryKey: ["admin", "media"], queryFn: fetchAdminMedia });
  const analytics = useQuery({
    queryKey: ["admin", "summary", "30d"],
    queryFn: () => fetchAdminSummary("30d"),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
  const error = clients.error ?? vehicles.error ?? orders.error ?? warranties.error ?? media.error ?? analytics.error;
  const activeOrders = orders.data?.filter((order) => !["delivered", "cancelled"].includes(order.status)) ?? [];
  const activeWarranties = warranties.data?.filter((warranty) => warranty.status === "active") ?? [];
  const metrics = [
    { label: "Clientes", value: clients.data?.length, icon: Users },
    { label: "Vehiculos", value: vehicles.data?.length, icon: CarFront },
    { label: "Ordenes activas", value: activeOrders.length, icon: CircleDot },
    { label: "Escaneos / 30d", value: analytics.data?.scan_sessions, icon: ScanLine },
  ];
  const modules = [
    {
      to: "/admin/workshop",
      label: "Clientes y vehiculos",
      eyebrow: "CRM",
      description: "Alta y mantenimiento de expedientes, vehiculos, servicios y catalogo.",
      signal: `${clients.data?.length ?? 0} clientes / ${vehicles.data?.length ?? 0} vehiculos`,
      icon: Boxes,
    },
    {
      to: "/admin/orders",
      label: "Ordenes de trabajo",
      eyebrow: "Produccion",
      description: "Programa, avanza y valida cada trabajo dentro del taller.",
      signal: `${activeOrders.length} activas`,
      icon: Wrench,
    },
    {
      to: "/admin/warranties",
      label: "Polizas y garantias",
      eyebrow: "Postventa",
      description: "Registra los identificadores emitidos y administra sus vigencias.",
      signal: `${activeWarranties.length} vigentes`,
      icon: ShieldCheck,
    },
    {
      to: "/admin/media",
      label: "Biblioteca multimedia",
      eyebrow: "Assets",
      description: "Carga evidencia, organiza privacidad y consulta su procesamiento.",
      signal: `${media.data?.length ?? 0} archivos`,
      icon: Camera,
    },
    {
      to: "/admin/publication",
      label: "Publicacion",
      eyebrow: "Showcase",
      description: "Prepara y publica la experiencia publica de cada vehiculo.",
      signal: `${vehicles.data?.length ?? 0} vehiculos disponibles`,
      icon: Send,
    },
    {
      to: "/admin/analytics",
      label: "Analitica QR",
      eyebrow: "Inteligencia",
      description: "Explora geografias, dispositivos, embudo y detalle de escaneos.",
      signal: `${analytics.data?.scan_sessions ?? 0} sesiones / 30d`,
      icon: BarChart3,
    },
    {
      to: "/admin/security",
      label: "Seguridad de acceso",
      eyebrow: "Cuenta",
      description: "Actualiza el usuario propietario y protege todas las sesiones.",
      signal: session?.username ?? "Administrador",
      icon: Settings2,
    },
  ];
  const scanSessions = analytics.data?.scan_sessions ?? 0;
  const funnel = [
    ["Sesiones", scanSessions, scanSessions ? 100 : 0],
    ["Interacciones", analytics.data?.events ?? 0, scanSessions ? Math.min(100, ((analytics.data?.events ?? 0) / scanSessions) * 100) : 0],
    ["Conversiones", analytics.data?.conversions ?? 0, scanSessions ? Math.min(100, ((analytics.data?.conversions ?? 0) / scanSessions) * 100) : 0],
  ] as const;

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-7 md:px-7 md:py-10">
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#626262]">
            Centro de mando / {session?.username ?? "Administrador"}
          </p>
          <h1 className="mt-2 text-[30px] font-medium tracking-[-0.055em] md:text-[38px]">
            Operacion 7Fitment
          </h1>
          <p className="mt-3 max-w-xl text-[13px] leading-6 text-[#707070]">
            Estado del taller, accesos directos y actividad atribuible desde una sola vista.
          </p>
        </div>
        <Link
          to="/admin/workshop"
          className="focus-ring inline-flex h-10 items-center gap-2 self-start rounded-[4px] bg-[#f2f2f2] px-4 text-[10px] font-semibold uppercase tracking-[0.13em] text-black"
        >
          Nueva captura <ArrowUpRight size={14} />
        </Link>
      </header>

      {error ? (
        <div className="mb-5">
          <InlineError message={error instanceof Error ? error.message : "No se pudo sincronizar"} />
        </div>
      ) : null}

      <section aria-label="Indicadores principales" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon }, index) => (
          <GlassPanel key={label} as="article" className="p-5">
            <div className="flex items-start justify-between">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#626262]">
                0{index + 1} / {label}
              </p>
              <Icon size={16} strokeWidth={1.4} className="text-[#707070]" />
            </div>
            <p className="mt-8 text-[38px] font-light tracking-[-0.06em]">{value ?? "--"}</p>
          </GlassPanel>
        ))}
      </section>

      <section className="mt-9" aria-labelledby="admin-modules-title">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#626262]">Navegacion operativa</p>
            <h2 id="admin-modules-title" className="mt-1 text-[21px] font-medium tracking-[-0.045em]">
              Modulos de administracion
            </h2>
          </div>
          <span className="hidden font-mono text-[9px] uppercase tracking-[0.16em] text-[#4f4f4f] sm:block">
            07 areas activas
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map(({ to, label, eyebrow, description, signal, icon: Icon }) => (
            <GlassPanel key={to} as="article" className="group transition-colors hover:border-white/[0.14] hover:bg-white/[0.04]">
              <Link to={to} className="focus-ring block min-h-[190px] p-5">
                <div className="flex items-start justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-[4px] border border-white/[0.08] bg-black/30 text-[#b8b8b8]">
                    <Icon size={17} strokeWidth={1.4} />
                  </span>
                  <ArrowUpRight size={15} className="text-[#626262] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
                </div>
                <p className="mt-6 font-mono text-[8px] uppercase tracking-[0.2em] text-[#626262]">{eyebrow}</p>
                <h3 className="mt-2 text-[16px] font-medium tracking-[-0.035em]">{label}</h3>
                <p className="mt-2 max-w-sm text-[12px] leading-5 text-[#707070]">{description}</p>
                <p className="mt-5 border-t border-white/[0.055] pt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-[#8a8a8a]">
                  {signal}
                </p>
              </Link>
            </GlassPanel>
          ))}
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <GlassPanel
          eyebrow="Produccion"
          title="Ordenes recientes"
          action={
            <Link to="/admin/orders" className="focus-ring font-mono text-[9px] uppercase tracking-[0.14em] text-[#707070] hover:text-white">
              Ver todas
            </Link>
          }
        >
          <div className="divide-y divide-white/[0.055]">
            {(orders.data ?? []).slice(0, 7).map((order) => (
              <div key={order.id} className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4 sm:grid-cols-[1fr_1fr_auto]">
                <div>
                  <p className="text-[13px] font-medium">{order.order_number}</p>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[#626262]">Vehiculo #{order.vehicle_id}</p>
                </div>
                <p className="hidden self-center text-[12px] text-[#707070] sm:block">Cliente #{order.client_id}</p>
                <span className="self-center rounded-[3px] border border-white/[0.08] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#9a9a9a]">
                  {order.status}
                </span>
              </div>
            ))}
            {!orders.data?.length ? (
              <p className="px-5 py-10 text-center text-[12px] text-[#626262]">Sin ordenes registradas</p>
            ) : null}
          </div>
        </GlassPanel>

        <GlassPanel eyebrow="Actividad QR" title="Embudo atribuible" className="p-5">
          <div className="mt-8 space-y-5 border-t border-white/[0.06] pt-5">
            {funnel.map(([label, value, width]) => (
              <div key={label}>
                <div className="mb-2 flex justify-between font-mono text-[9px] uppercase tracking-[0.16em] text-[#707070]">
                  <span>{label}</span>
                  <span>{value}</span>
                </div>
                <div className="h-px bg-white/[0.07]">
                  <div className="h-px bg-[#f2f2f2] transition-[width] duration-700" style={{ width: `${width}%` }} />
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      </section>
    </main>
  );
}
