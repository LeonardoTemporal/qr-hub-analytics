import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ClipboardPlus, Plus, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import GlassPanel from "../../../ui/GlassPanel";
import { InlineError } from "../../../ui/RouteState";
import {
  createAdminWorkOrder,
  createWorkOrderItem,
  fetchAdminClients,
  fetchAdminVehicles,
  fetchAdminWorkOrders,
  fetchWorkOrderItems,
  updateAdminWorkOrder,
  updateWorkOrderItem,
  type AdminWorkOrder,
  type ServiceType,
} from "../api";

interface OrderFields {
  client_id: string;
  vehicle_id: string;
  scheduled_for: string;
  odometer_km: string;
  intake_notes: string;
  referral_token: string;
}

interface ItemFields {
  service_type: ServiceType;
  title: string;
  material_brand: string;
  material_product: string;
  finish_type: string;
  price_mxn: string;
  notes: string;
}

const statusFlow = ["draft", "scheduled", "in_progress", "quality_check", "ready", "delivered"] as const;

function nextStatus(order: AdminWorkOrder): string | null {
  const index = statusFlow.indexOf(order.status as (typeof statusFlow)[number]);
  return index >= 0 && index < statusFlow.length - 1 ? statusFlow[index + 1] : null;
}

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const clients = useQuery({ queryKey: ["admin", "clients"], queryFn: fetchAdminClients });
  const vehicles = useQuery({ queryKey: ["admin", "vehicles"], queryFn: fetchAdminVehicles });
  const orders = useQuery({ queryKey: ["admin", "work-orders"], queryFn: fetchAdminWorkOrders });
  const items = useQuery({
    queryKey: ["admin", "work-order-items", selectedOrderId],
    queryFn: () => fetchWorkOrderItems(selectedOrderId as number),
    enabled: selectedOrderId !== null,
  });
  const orderForm = useForm<OrderFields>({
    defaultValues: { client_id: "", vehicle_id: "", scheduled_for: "", odometer_km: "", intake_notes: "", referral_token: "" },
  });
  const itemForm = useForm<ItemFields>({
    defaultValues: { service_type: "PPF", title: "", material_brand: "", material_product: "", finish_type: "", price_mxn: "", notes: "" },
  });
  const selectedClientId = orderForm.watch("client_id");
  const compatibleVehicles = useMemo(
    () => (vehicles.data ?? []).filter((vehicle) => !selectedClientId || vehicle.client_id === Number(selectedClientId)),
    [selectedClientId, vehicles.data],
  );
  const clientNames = useMemo(() => new Map((clients.data ?? []).map((client) => [client.id, client.full_name])), [clients.data]);
  const vehicleNames = useMemo(() => new Map((vehicles.data ?? []).map((vehicle) => [vehicle.id, `${vehicle.brand} ${vehicle.model}`])), [vehicles.data]);

  const createOrder = useMutation({
    mutationFn: createAdminWorkOrder,
    onSuccess: (order) => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "work-orders"] });
      setSelectedOrderId(order.id);
      orderForm.reset();
    },
  });
  const advanceOrder = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateAdminWorkOrder(id, { status }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "work-orders"] }),
  });
  const createItem = useMutation({
    mutationFn: ({ orderId, values }: { orderId: number; values: ItemFields }) => createWorkOrderItem(orderId, {
      service_catalog_id: null,
      service_type: values.service_type,
      title: values.title,
      material_brand: values.material_brand || null,
      material_product: values.material_product || null,
      finish_type: values.finish_type || null,
      price_mxn: values.price_mxn ? Number(values.price_mxn) : null,
      notes: values.notes || null,
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "work-order-items", selectedOrderId] });
      itemForm.reset();
    },
  });
  const setItemStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "pending" | "in_progress" | "completed" | "cancelled" }) => updateWorkOrderItem(id, { status }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "work-order-items", selectedOrderId] }),
  });

  const submitOrder = orderForm.handleSubmit((values) => createOrder.mutateAsync({
    client_id: Number(values.client_id),
    vehicle_id: Number(values.vehicle_id),
    scheduled_for: values.scheduled_for ? new Date(values.scheduled_for).toISOString() : null,
    odometer_km: values.odometer_km ? Number(values.odometer_km) : null,
    intake_notes: values.intake_notes || null,
    referral_token: values.referral_token || null,
  }));
  const submitItem = itemForm.handleSubmit((values) => {
    if (!selectedOrderId) return Promise.resolve();
    return createItem.mutateAsync({ orderId: selectedOrderId, values });
  });
  const error = createOrder.error ?? advanceOrder.error ?? createItem.error ?? setItemStatus.error ?? orders.error;

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-7 md:px-7 md:py-10">
      <header className="mb-7"><p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#626262]">Produccion / Pipeline</p><h1 className="mt-2 text-[30px] font-medium tracking-[-0.055em] md:text-[38px]">Ordenes de trabajo</h1></header>
      {error ? <div className="mb-5"><InlineError message={error instanceof Error ? error.message : "No se pudo sincronizar"} /></div> : null}

      <section className="grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">
        <GlassPanel eyebrow="Ingreso" title="Nueva orden">
          <form onSubmit={submitOrder} className="space-y-4 p-5">
            <label className="block"><span className="admin-label">Cliente</span><select className="admin-input" {...orderForm.register("client_id", { required: true })}><option value="">Seleccionar</option>{(clients.data ?? []).map((client) => <option key={client.id} value={client.id}>{client.full_name}</option>)}</select></label>
            <label className="block"><span className="admin-label">Vehiculo</span><select className="admin-input" {...orderForm.register("vehicle_id", { required: true })}><option value="">Seleccionar</option>{compatibleVehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.brand} {vehicle.model}</option>)}</select></label>
            <div className="grid gap-4 sm:grid-cols-2"><label><span className="admin-label">Agenda</span><input type="datetime-local" className="admin-input" {...orderForm.register("scheduled_for")} /></label><label><span className="admin-label">Odometro km</span><input type="number" min="0" className="admin-input" {...orderForm.register("odometer_km")} /></label></div>
            <label className="block"><span className="admin-label">Notas de recepcion</span><textarea rows={3} className="admin-input resize-none" {...orderForm.register("intake_notes")} /></label>
            <label className="block"><span className="admin-label">Token QR atribuible (opcional)</span><input className="admin-input font-mono" {...orderForm.register("referral_token")} /></label>
            <button disabled={createOrder.isPending || !vehicles.data?.length} className="focus-ring inline-flex h-11 w-full items-center justify-center gap-2 rounded-[4px] bg-[#f2f2f2] text-[10px] font-semibold uppercase tracking-[0.14em] text-black disabled:opacity-45"><ClipboardPlus size={15} /> Crear orden</button>
          </form>
        </GlassPanel>

        <GlassPanel eyebrow="Pipeline" title={`${orders.data?.length ?? 0} ordenes`}>
          <div className="divide-y divide-white/[0.055]">
            {(orders.data ?? []).map((order) => {
              const next = nextStatus(order);
              return <article key={order.id} className={`grid gap-4 px-5 py-4 md:grid-cols-[1fr_1fr_auto] ${selectedOrderId === order.id ? "bg-white/[0.035]" : ""}`}>
                <button type="button" onClick={() => setSelectedOrderId(order.id)} className="focus-ring min-w-0 text-left"><p className="text-[13px] font-medium text-white">{order.order_number}</p><p className="mt-1 truncate text-[11px] text-[#626262]">{vehicleNames.get(order.vehicle_id) ?? `Vehiculo #${order.vehicle_id}`}</p></button>
                <div className="self-center"><p className="text-[11px] text-[#9a9a9a]">{clientNames.get(order.client_id) ?? `Cliente #${order.client_id}`}</p><p className="mt-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[#626262]">{order.scheduled_for ? new Date(order.scheduled_for).toLocaleString("es-MX") : "Sin agenda"}</p></div>
                <div className="flex items-center gap-2"><span className="rounded-[3px] border border-white/[0.08] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-[#9a9a9a]">{order.status}</span>{next ? <button type="button" disabled={advanceOrder.isPending} onClick={() => advanceOrder.mutate({ id: order.id, status: next })} className="focus-ring grid h-9 w-9 place-items-center rounded-[4px] bg-white text-black" aria-label={`Avanzar a ${next}`}><ArrowRight size={13} /></button> : null}</div>
              </article>;
            })}
            {!orders.data?.length ? <p className="px-5 py-12 text-center text-[12px] text-[#626262]">Sin ordenes registradas.</p> : null}
          </div>
        </GlassPanel>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">
        <GlassPanel eyebrow="Partidas" title={selectedOrderId ? `Orden #${selectedOrderId}` : "Selecciona una orden"}>
          <form onSubmit={submitItem} className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2"><label><span className="admin-label">Servicio</span><select className="admin-input" {...itemForm.register("service_type")}><option>PPF</option><option>Wrap</option><option>Ceramic</option><option>Detailing</option><option>Maintenance</option></select></label><label><span className="admin-label">Precio MXN</span><input type="number" min="0" className="admin-input" {...itemForm.register("price_mxn")} /></label></div>
            <label className="block"><span className="admin-label">Concepto</span><input className="admin-input" {...itemForm.register("title", { required: true, minLength: 2 })} /></label>
            <div className="grid gap-4 sm:grid-cols-2"><label><span className="admin-label">Marca material</span><input className="admin-input" {...itemForm.register("material_brand")} /></label><label><span className="admin-label">Producto</span><input className="admin-input" {...itemForm.register("material_product")} /></label></div>
            <label className="block"><span className="admin-label">Acabado</span><input className="admin-input" {...itemForm.register("finish_type")} /></label>
            <button disabled={!selectedOrderId || createItem.isPending} className="focus-ring inline-flex h-11 w-full items-center justify-center gap-2 rounded-[4px] bg-[#f2f2f2] text-[10px] font-semibold uppercase tracking-[0.14em] text-black disabled:opacity-35"><Plus size={14} /> Agregar partida</button>
          </form>
        </GlassPanel>
        <GlassPanel eyebrow="Ejecucion" title={`${items.data?.length ?? 0} servicios`}>
          <div className="divide-y divide-white/[0.055]">{(items.data ?? []).map((item) => <article key={item.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[13px] font-medium">{item.title}</p><p className="mt-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[#626262]">{item.service_type}{item.material_brand ? ` / ${item.material_brand}` : ""}{item.price_mxn != null ? ` / $${Number(item.price_mxn).toLocaleString("es-MX")}` : ""}</p></div><div className="flex gap-2"><select value={item.status} onChange={(event) => setItemStatus.mutate({ id: item.id, status: event.target.value as typeof item.status })} className="admin-input h-9 min-w-[150px] py-0 font-mono text-[8px] uppercase"><option value="pending">Pendiente</option><option value="in_progress">En proceso</option><option value="completed">Completado</option><option value="cancelled">Cancelado</option></select></div></article>)}{selectedOrderId && !items.data?.length ? <div className="grid min-h-48 place-items-center text-center"><div><Wrench size={18} className="mx-auto text-[#4a4a4a]" /><p className="mt-3 text-[11px] text-[#626262]">Agrega el primer servicio de la orden.</p></div></div> : null}</div>
        </GlassPanel>
      </section>
    </main>
  );
}
