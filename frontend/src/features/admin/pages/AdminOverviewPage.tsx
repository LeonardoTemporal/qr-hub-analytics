import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, CarFront, CircleDot, ScanLine, Users } from "lucide-react";
import { Link } from "react-router-dom";

import GlassPanel from "../../../ui/GlassPanel";
import { InlineError } from "../../../ui/RouteState";
import {
  fetchAdminClients,
  fetchAdminSummary,
  fetchAdminVehicles,
  fetchAdminWorkOrders,
} from "../api";

export default function AdminOverviewPage() {
  const clients = useQuery({ queryKey: ["admin", "clients"], queryFn: fetchAdminClients });
  const vehicles = useQuery({ queryKey: ["admin", "vehicles"], queryFn: fetchAdminVehicles });
  const orders = useQuery({ queryKey: ["admin", "work-orders"], queryFn: fetchAdminWorkOrders });
  const analytics = useQuery({ queryKey: ["admin", "summary", "30d"], queryFn: () => fetchAdminSummary("30d") });
  const error = clients.error ?? vehicles.error ?? orders.error ?? analytics.error;
  const activeOrders = orders.data?.filter((order) => !["delivered", "cancelled"].includes(order.status)) ?? [];
  const cards = [
    { label: "Clientes", value: clients.data?.length, icon: Users },
    { label: "Vehiculos", value: vehicles.data?.length, icon: CarFront },
    { label: "Ordenes activas", value: activeOrders.length, icon: CircleDot },
    { label: "Escaneos / 30d", value: analytics.data?.scan_sessions, icon: ScanLine },
  ];

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-7 md:px-7 md:py-10">
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#626262]">Centro operativo / En vivo</p>
          <h1 className="mt-2 text-[30px] font-medium tracking-[-0.055em] md:text-[38px]">Resumen del taller</h1>
        </div>
        <Link to="/admin/workshop" className="focus-ring inline-flex h-10 items-center gap-2 self-start rounded-[4px] bg-[#f2f2f2] px-4 text-[10px] font-semibold uppercase tracking-[0.13em] text-black">
          Nueva captura <ArrowUpRight size={14} />
        </Link>
      </header>
      {error ? <div className="mb-5"><InlineError message={error instanceof Error ? error.message : "No se pudo sincronizar"} /></div> : null}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }, index) => (
          <GlassPanel key={label} as="article" className="p-5">
            <div className="flex items-start justify-between">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#626262]">0{index + 1} / {label}</p>
              <Icon size={16} strokeWidth={1.4} className="text-[#707070]" />
            </div>
            <p className="mt-8 text-[38px] font-light tracking-[-0.06em]">{value ?? "--"}</p>
          </GlassPanel>
        ))}
      </section>
      <section className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <GlassPanel eyebrow="Produccion" title="Ordenes recientes">
          <div className="divide-y divide-white/[0.055]">
            {(orders.data ?? []).slice(0, 7).map((order) => (
              <div key={order.id} className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4 sm:grid-cols-[1fr_1fr_auto]">
                <div><p className="text-[13px] font-medium">{order.order_number}</p><p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[#626262]">Vehiculo #{order.vehicle_id}</p></div>
                <p className="hidden self-center text-[12px] text-[#707070] sm:block">Cliente #{order.client_id}</p>
                <span className="self-center rounded-[3px] border border-white/[0.08] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#9a9a9a]">{order.status}</span>
              </div>
            ))}
            {!orders.data?.length ? <p className="px-5 py-10 text-center text-[12px] text-[#626262]">Sin ordenes registradas</p> : null}
          </div>
        </GlassPanel>
        <GlassPanel eyebrow="Actividad QR" title="Embudo atribuible" className="p-5">
          <div className="mt-8 space-y-5">
            {[
              ["Sesiones", analytics.data?.scan_sessions ?? 0],
              ["Interacciones", analytics.data?.events ?? 0],
              ["Conversiones", analytics.data?.conversions ?? 0],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <div className="mb-2 flex justify-between font-mono text-[9px] uppercase tracking-[0.16em] text-[#707070]"><span>{label}</span><span>{value}</span></div>
                <div className="h-px bg-white/[0.07]"><div className="h-px bg-[#f2f2f2]" style={{ width: `${Math.min(100, Number(value) * 8)}%` }} /></div>
              </div>
            ))}
          </div>
        </GlassPanel>
      </section>
    </main>
  );
}
